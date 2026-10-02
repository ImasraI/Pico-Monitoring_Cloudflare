const $ = (selector, root = document) => root.querySelector(selector);
const state = { notes: [], draftPlan: [], planView: null, patientSort: "priority", treatmentFilter: "all", activityFilter: "all", filtersOpen: false, user: null, mode: "login", doctorView: "patients", patientView: "home", detailTab: "overview", patientId: null, patientName: "", profile: null, schedule: null, files: [], wizardStep: 1, patients: [], patientRecords: [], patientFilter: "all", steps: [], scans: [], messages: [], notifications: [], settings: null };
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const date = value => value ? new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tehran" }).format(new Date(Number(value))) : "—";
const time = value => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(Number(value))) : "—";
const initial = name => String(name || "ب").trim()[0] || "ب";
const imageUrl = id => `/api?op=image&imageId=${encodeURIComponent(id)}`;
const title = (a, b = "") => `<div class="view-title"><h2>${a}</h2>${b ? `<p>${b}</p>` : ""}</div>`;
const empty = message => `<div class="empty"><b>${message}</b></div>`;
const number = value => new Intl.NumberFormat("fa-IR").format(value);
const myPatientId = () => state.user?.role === "patient" ? state.user.id : state.patientId;

document.addEventListener('dragover',event=>{const slot=event.target.closest('.record-upload-slot');if(slot){event.preventDefault();slot.classList.add('drag-over');}});
document.addEventListener('dragleave',event=>{const slot=event.target.closest('.record-upload-slot');if(slot&&!slot.contains(event.relatedTarget))slot.classList.remove('drag-over');});
document.addEventListener('drop',event=>{const slot=event.target.closest('.record-upload-slot');if(!slot)return;event.preventDefault();slot.classList.remove('drag-over');const input=slot.querySelector('input[type=file]');input.files=event.dataTransfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));});

let toastTimer;

async function api(op, data = null, params = {}) {
  const query = new URLSearchParams({ op, ...params });
  const options = data === null ? { credentials: "same-origin" } : { method: "POST", credentials: "same-origin", body: data instanceof FormData ? data : JSON.stringify({ op, ...data }), headers: data instanceof FormData ? {} : { "Content-Type": "application/json" } };
  const response = await fetch(`/api?${query}`, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "درخواست انجام نشد");
  return result;
}
function toast(message) { const box = $("#toast"); box.textContent = message; box.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove("show"), 4500); }
function showError(error) { toast(error.message || "خطایی رخ داد"); }
function modal(heading, content) { $("#modal-title").textContent = heading; $("#modal-body").innerHTML = content; $("#modal-layer").hidden = false; DantoPlanner.hydrateDates($("#modal-body")); }
function closeModal() { $("#modal-layer").hidden = true; $("#modal-body").innerHTML = ""; }
function showShell(which) { for (const id of ["login-screen", "doctor-app", "patient-detail", "patient-app"]) $(`#${id}`).hidden = id !== which; }
function authMode(mode) {
  state.mode = mode;
  const invitation = new URL(location.href).searchParams.get("invite") || "";
  const copy = { login: "با ایمیل و رمز عبور وارد حساب خود شوید.", setup: "برای ساخت حساب پزشک، کد راه‌اندازی را وارد کنید.", accept: "با دعوت‌نامه پزشک حساب بیمار خود را فعال کنید." };
  $("#auth-copy").textContent = copy[mode];
  $("#auth-extra").innerHTML = mode === "setup" ? `<label class="field-label" for="auth-name">نام پزشک</label><div class="field"><input id="auth-name" required maxlength="100" autocomplete="name"></div><label class="field-label" for="auth-code">کد راه‌اندازی</label><div class="field"><input id="auth-code" required autocomplete="off"></div>` : mode === "accept" ? `<label class="field-label" for="auth-code">کد دعوت</label><div class="field"><input id="auth-code" required value="${escapeHtml(invitation)}" autocomplete="off"></div>` : "";
  $("#login-id").parentElement.parentElement.querySelector('label[for="login-id"]').hidden = mode === "accept";
  $("#login-id").parentElement.hidden = mode === "accept";
  $("#login-id").required = mode !== "accept";
  $("#login-pass").autocomplete = mode === "login" ? "current-password" : "new-password";
  $("#login-submit").innerHTML = ({ login: "ورود", setup: "ساخت حساب پزشک", accept: "فعال‌سازی حساب بیمار" })[mode] + " <span>←</span>";
  $("#auth-error").hidden = true;
  document.querySelectorAll("[data-auth-mode]").forEach(button => button.classList.toggle("active", button.dataset.authMode === mode));
}
async function authSubmit(event) {
  event.preventDefault();
  const button = $("#login-submit"); button.disabled = true;
  const password = $("#login-pass").value;
  const data = state.mode === "login" ? { email: $("#login-id").value, password } : state.mode === "setup" ? { email: $("#login-id").value, name: $("#auth-name").value, setupKey: $("#auth-code").value.trim(), password } : { invite: $("#auth-code").value.trim(), password };
  try { const result = await api(state.mode, data); state.user = result.user; history.replaceState({}, "", "/danto.html"); await enter(); }
  catch (error) { $("#auth-error").textContent = error.message; $("#auth-error").hidden = false; }
  finally { button.disabled = false; }
}
async function enter() {
  if (!state.user) return showShell("login-screen");
  if (state.user.role === "doctor") {
    $("#doctor-account-name").textContent = state.user.name; $(".detail-site-account").textContent = state.user.name;
    $("#doctor-title").textContent = `سلام، ${state.user.name}`;
    $("#doctor-date").textContent = date(Date.now());
    showShell("doctor-app"); await loadPatients(); await renderDoctor();
  } else {
    $("#patient-date").textContent = date(Date.now());
    $(".patient-avatar").textContent = initial(state.user.name);
    showShell("patient-app"); await loadPatientData(); await renderPatient();
  }
  await refreshNotifications();
}
async function loadPatients() { state.patients = (await api("patients")).patients; }
async function loadPatientData() {
  const id = myPatientId(); if (!id) return;
  const [steps, scans, messages, record] = await Promise.all([api("steps", null, { patientId: id }), api("scans", null, { patientId: id }), api("messages", null, { patientId: id }), api(state.user.role === "doctor" ? "patient.record" : "patient.schedule", null, { patientId: id })]);
  state.steps = steps.steps; state.notes = state.user.role === "doctor" ? (await api("notes", null, {patientId:id})).notes : []; state.scans = scans.scans; state.messages = messages.messages;
  state.profile = record?.profile ?? null; state.schedule = record?.schedule ?? record?.profile ?? null; state.files = record?.files ?? [];
}
async function refreshNotifications() {
  if (!state.user) return;
  try { state.notifications = (await api("notifications")).notifications; const unread = state.notifications.some(n => !n.read_at); for (const id of ["doctor-notifications", "patient-notifications"]) { const button = $(`#${id}`); if (button) button.classList.toggle("unread", unread); } } catch (error) { console.warn(error); }
}
const points = () => state.steps.reduce((sum, step) => sum + (step.points_awarded || 0), 0);
const completed = () => state.steps.filter(step => step.completed_at).length;
function roadmapHtml(isDoctor) {
  if (!state.steps.length) return empty(isDoctor ? "هنوز مرحله‌ای تعریف نشده است." : "پزشک هنوز مسیر درمان شما را ثبت نکرده است.");
  const next = state.steps.find(step => !step.completed_at);
  return `<div class="roadmap">${state.steps.map((step, index) => `<article class="roadmap-item ${step.completed_at ? "done" : step.id === next?.id ? "current" : ""}"><div class="roadmap-dot">${step.completed_at ? "✓" : number(index + 1)}</div><div class="roadmap-body"><div class="row"><b>${escapeHtml(step.title)}</b><span>${step.completed_at ? `+${number(step.points_awarded)} امتیاز` : date(step.due_at)}</span></div>${step.detail ? `<p>${escapeHtml(step.detail)}</p>` : ""}<small>${step.completed_at ? `انجام شد: ${time(step.completed_at)}` : step.id === next?.id ? "مرحله جاری" : "پس از مرحله قبل فعال می‌شود"}</small>${!isDoctor && step.id === next?.id ? `<button class="primary small" data-complete-step="${step.id}">ثبت انجام مرحله</button>` : ""}</div></article>`).join("")}</div>`;
}
function scanGallery() {
  if (!state.scans.length) return empty("هنوز تصویری ارسال نشده است.");
  return `<div class="scan-history">${state.scans.map(scan => `<article class="panel"><div class="row"><b>اسکن ${date(scan.created_at)}</b><span class="status ${scan.status === "reviewed" ? "good" : "review"}">${scan.status === "reviewed" ? "بررسی‌شده" : "در انتظار بررسی"}</span></div><div class="scan-thumbs">${scan.images.map(image => `<button class="image-button" data-view-image="${image.id}" aria-label="نمایش تصویر"><img src="${imageUrl(image.id)}" alt="نمای ${escapeHtml(({ front: "روبرو", right: "راست", left: "چپ" })[image.view] || image.view)}" loading="lazy"><small>${escapeHtml(({ front: "روبرو", right: "راست", left: "چپ" })[image.view] || image.view)}</small></button>`).join("")}</div>${scan.doctor_note ? `<p class="note">نظر پزشک: ${escapeHtml(scan.doctor_note)}</p>` : ""}${state.user.role === "doctor" ? `<button class="outline small" data-review-scan="${scan.id}">ثبت نظر پزشک</button>` : ""}</article>`).join("")}</div>`;
}
function compareHtml() {
  const images = state.scans.flatMap(scan => scan.images.map(image => ({ ...image, created_at: scan.created_at })));
  if (state.scans.length < 2 || images.length < 2) return empty("برای مقایسه، دست‌کم دو تصویر از اسکن‌های مختلف لازم است.");
  const options = images.map(image => `<option value="${image.id}">${date(image.created_at)} · ${escapeHtml(({ front: "روبرو", right: "راست", left: "چپ" })[image.view] || image.view)}</option>`).join("");
  return `<div class="panel"><h2>مقایسه تصاویر قبل و بعد</h2><p class="muted">دو تصویر را انتخاب کنید تا کنار هم ببینید. برای مقایسه دقیق‌تر زاویه‌های یکسان را انتخاب کنید.</p><div class="compare-grid"><div><label for="compare-before">تصویر قبل</label><select id="compare-before">${options}</select><img id="compare-before-image" src="${imageUrl(images[images.length - 1].id)}" alt="تصویر قبل"></div><div><label for="compare-after">تصویر بعد</label><select id="compare-after">${options}</select><img id="compare-after-image" src="${imageUrl(images[0].id)}" alt="تصویر بعد"></div></div></div>`;
}
function syncCompare() { for (const side of ["before", "after"]) { const selector = $(`#compare-${side}`); if (!selector) continue; if (side === "before") selector.value = selector.options[selector.options.length - 1].value; $(`#compare-${side}-image`).src = imageUrl(selector.value); } }
function chatHtml() {
  return `<div class="panel"><h2>گفت‌وگو با ${state.user.role === "doctor" ? "بیمار" : "پزشک"}</h2><p class="muted">پیام‌های فوری در پنل با برچسب مشخص می‌شوند. برای وضعیت پزشکی اورژانسی از خدمات اورژانس استفاده کنید.</p><div class="chat">${state.messages.length ? state.messages.map(message => `<article class="bubble ${message.sender_id === state.user.id ? "me" : ""}">${message.kind === "urgent" ? `<b class="urgent-label">فوری</b>` : ""}<div>${escapeHtml(message.body)}</div><small>${time(message.created_at)}${message.sender_id === state.user.id ? ` · ${message.read_at ? "دیده شد" : "ارسال شد"}` : ""}</small></article>`).join("") : empty("هنوز پیامی ردوبدل نشده است.")}</div><form id="message-form" class="message-compose"><label for="message-text">پیام جدید</label><textarea id="message-text" maxlength="2000" required placeholder="متن پیام را بنویسید..."></textarea><label class="check-line"><input type="checkbox" id="message-urgent"> پیام فوری</label><button class="primary" type="submit">ارسال پیام</button></form></div>`;
}
async function renderDoctor() {
  showShell("doctor-app");
  $("#doctor-title").textContent = ({patients:"بیماران",wizard:"افزودن بیمار",tasks:"فهرست وظایف",messages:"پیام‌ها",notifications:"اعلان‌ها",settings:"پیکربندی",insights:"بینش‌ها"})[state.doctorView];
  document.querySelectorAll("[data-doctor-view]").forEach(el => el.classList.toggle("active", el.dataset.doctorView === state.doctorView));
  const root = $("#doctor-content");
  if (state.doctorView === "wizard") { state.draftPlan = []; state.planView = DantoPlanner.parts(Date.now()); root.innerHTML = wizardHtml(); DantoPlanner.hydrateDates(root); updateWizardStep(1); return; }
  if (state.doctorView === "patients") {
    root.innerHTML = '<div class="panel loading-placeholder" role="status">در حال دریافت پرونده‌ها...</div>';
    state.patientRecords = await Promise.all(state.patients.map(async patient => { const [steps, scans, messages] = await Promise.all([api("steps", null, { patientId: patient.id }), api("scans", null, { patientId: patient.id }), api("messages", null, { patientId: patient.id })]); return { patient, steps: steps.steps, scans: scans.scans, messages: messages.messages }; }));
    const pending = state.patientRecords.filter(record => patientStatus(record).attention).length;
    root.innerHTML = '<div class="doctor-page-head"><div class="doctor-summary-chips"><button data-patient-filter="all" class="summary-chip '+(state.patientFilter === 'all' ? 'active' : '')+'"><strong>'+number(state.patients.length)+'</strong><span>همه بیماران</span></button><button data-patient-filter="pending" class="summary-chip review '+(state.patientFilter === 'pending' ? 'active' : '')+'"><strong>'+number(pending)+'</strong><span>نیازمند بررسی</span></button></div><div class="page-title-block"><h2>بیماران</h2><p>وضعیت و فعالیت بیماران تحت مانیتورینگ</p></div><div class="page-actions"><button class="outline" id="toggle-patient-filters">فیلترها</button><button class="primary" id="add-patient">+ افزودن بیمار</button></div></div><div class="doctor-toolbar"><label class="search">⌕ <input id="patient-search" placeholder="جست‌وجوی نام، ایمیل یا شناسه بیمار" autocomplete="off"></label><select id="patient-sort" aria-label="مرتب‌سازی بیماران"><option value="priority">مرتب‌سازی: بیشترین اولویت</option><option value="newest">جدیدترین اسکن</option><option value="oldest">قدیمی‌ترین اسکن</option><option value="inactive">حساب‌های فعال‌نشده</option></select></div>'+patientFiltersHtml()+'<div class="patient-card-list" id="patient-rows">'+patientRows()+'</div>';
    $('#patient-sort').value = state.patientSort;
  } else if (state.doctorView === "notifications") { await refreshNotifications(); root.innerHTML = title("اعلان‌ها") + notificationsHtml();
  } else if (state.doctorView === "settings") {
    await renderSettings(root);
  } else {
    const records = await Promise.all(state.patients.map(async patient => ({ patient, steps: (await api("steps", null, { patientId: patient.id })).steps, messages: (await api("messages", null, { patientId: patient.id })).messages, scans: (await api("scans", null, { patientId: patient.id })).scans })));
    if (state.doctorView === "tasks") root.innerHTML = title("مراحل درمان", "مراحل بعدی بیماران") + (records.length ? `<div class="task-list">${records.flatMap(record => record.steps.filter(step => !step.completed_at).map(step => `<article class="task-card"><span class="roadmap-dot">${number(step.position)}</span><div><b>${escapeHtml(step.title)}</b><small>${escapeHtml(record.patient.name)} · موعد ${date(step.due_at)}</small></div><button class="outline small" data-open-patient="${record.patient.id}" data-open-tab="plan">پرونده</button></article>`)).join("") || empty("مرحله باز وجود ندارد.")}</div>` : empty("هنوز بیماری ثبت نشده است."));
    if (state.doctorView === "messages") root.innerHTML = title("پیام‌ها", "گفت‌وگوهای بیماران") + (records.length ? `<div class="message-list">${records.map(record => `<article class="task-card"><div><b>${escapeHtml(record.patient.name)}</b><small>${record.messages.length ? `${record.messages.at(-1).kind === "urgent" ? "فوری · " : ""}${escapeHtml(record.messages.at(-1).body.slice(0, 120))}` : "هنوز پیامی نیست"}</small></div><button class="outline small" data-open-patient="${record.patient.id}" data-open-tab="communication">گفت‌وگو</button></article>`).join("")}</div>` : empty("هنوز بیماری ثبت نشده است."));
    if (state.doctorView === "insights") { const scans = records.flatMap(record => record.scans), steps = records.flatMap(record => record.steps); root.innerHTML = title("آمار درمان", "بر پایه داده‌های ثبت‌شده در همین سامانه") + `<div class="metrics"><article><div><small>بیماران</small><strong>${number(records.length)}</strong></div></article><article><div><small>اسکن‌ها</small><strong>${number(scans.length)}</strong></div></article><article><div><small>اسکن‌های بررسی‌نشده</small><strong>${number(scans.filter(s => s.status === "new").length)}</strong></div></article><article><div><small>مراحل انجام‌شده</small><strong>${number(steps.filter(s => s.completed_at).length)} / ${number(steps.length)}</strong></div></article></div>`; }
  }
}
function patientStatus(record) {
  const {patient,steps,scans,messages} = record, nextScan=steps.find(s=>!s.completed_at && s.event_type==='scan');
  const pending=scans.filter(s=>s.status==='new'), urgent=messages.filter(m=>m.sender_id!==state.user.id && m.kind==='urgent' && !m.read_at);
  const awaiting=Boolean(patient.treatment_type && !patient.activated_at), late=nextScan ? nextScan.due_at<Date.now() : Boolean(patient.next_scan_at && patient.next_scan_at<Date.now() && (!scans[0] || scans[0].created_at<patient.next_scan_at));
  return {pending,urgent,awaiting,late,attention:Boolean(pending.length||urgent.length||late), label:urgent.length?'پیام فوری':pending.length?'اسکن جدید':late?'اسکن دیرهنگام':awaiting?'حساب فعال نشده':'در حال پیگیری', kind:urgent.length?'urgent':pending.length||late?'review':awaiting?'neutral':'good'};
}
function patientFiltersHtml() {
  const group=(label,key,options)=>'<div><h3>'+label+'</h3><div class="filter-chip-row">'+options.map(([value,text])=>'<button type="button" data-filter-group="'+key+'" data-filter-value="'+value+'" class="'+(state[key]===value?'active':'')+'">'+text+'</button>').join('')+'</div></div>';
  return '<section id="patient-filter-panel" class="patient-filter-panel" '+(state.filtersOpen?'':'hidden')+'>'+group('نوع درمان','treatmentFilter',[['all','همه'],['aligner','الاینر شفاف'],['bracket','براکت ثابت']])+group('فعالیت','activityFilter',[['all','همه'],['new','اسکن جدید'],['late','اسکن دیرهنگام'],['urgent','پیام فوری'],['inactive','حساب فعال نشده'],['noData','بدون اسکن']])+'<button type="button" class="outline small" id="reset-patient-filters">پاک کردن فیلترها</button></section>';
}
function patientRows() {
  const term=$('#patient-search')?.value.trim().toLowerCase()||'';
  const score=r=>{const s=patientStatus(r);return s.urgent.length*100+s.pending.length*10+(s.late?5:0);};
  const records=state.patientRecords.filter(r=>{
    const s=patientStatus(r), match={all:true,new:s.pending.length>0,late:s.late,urgent:s.urgent.length>0,inactive:s.awaiting,noData:!r.scans.length};
    return (r.patient.name+' '+r.patient.email+' '+r.patient.id).toLowerCase().includes(term) && (state.patientFilter==='all'||s.attention) && (state.treatmentFilter==='all'||r.patient.treatment_type===state.treatmentFilter) && match[state.activityFilter];
  }).sort((a,b)=>state.patientSort==='newest'?(b.scans[0]?.created_at||0)-(a.scans[0]?.created_at||0):state.patientSort==='oldest'?(a.scans[0]?.created_at||0)-(b.scans[0]?.created_at||0):state.patientSort==='inactive'?Number(patientStatus(b).awaiting)-Number(patientStatus(a).awaiting):score(b)-score(a));
  return records.length ? records.map(record=>{
    const {patient,steps,scans}=record,s=patientStatus(record),done=steps.filter(v=>v.completed_at).length;
    const nextScan=steps.find(v=>!v.completed_at&&v.event_type==='scan')?.due_at??patient.next_scan_at, nextVisit=steps.find(v=>!v.completed_at&&v.event_type==='visit')?.due_at??patient.next_visit_at;
    const reason=s.urgent.length?'پیام فوری بیمار نیازمند پاسخ است.':s.pending.length?number(s.pending.length)+' اسکن جدید برای مرور و ثبت نظر پزشک.':s.late?'موعد اسکن گذشته است؛ برنامه و ارتباط با بیمار را بررسی کنید.':s.awaiting?'پرونده ساخته شده؛ بیمار هنوز دعوت‌نامه را نپذیرفته است.':scans[0]?.doctor_note||'برنامه و فعالیت‌های ثبت‌شده بیمار را پیگیری کنید.';
    return '<article class="prow"><button class="pcell p-info" data-open-patient="'+patient.id+'"><span class="p-avatar">'+(patient.face_file_id?'<img src="'+patientFileUrl(patient.face_file_id)+'" alt="تصویر بیمار" class="face-photo">'+(patient.oral_file_id?'<img src="'+patientFileUrl(patient.oral_file_id)+'" alt="تصویر اولیه دهان" class="oral-photo">':''):escapeHtml(initial(patient.name)))+'</span><div class="p-main"><div class="p-name-row"><b>'+escapeHtml(patient.name)+'</b><small class="patient-id">DNT-'+patient.id.slice(0,6).toUpperCase()+'</small></div><div class="p-treat">'+(patient.treatment_type==='aligner'?'الاینر شفاف':patient.treatment_type==='bracket'?'براکت ثابت':'نوع درمان ثبت نشده')+'</div><div class="p-scan '+(s.late?'late':'')+'">اسکن بعدی: '+date(nextScan)+'</div><div class="p-visit">ویزیت بعدی: '+date(nextVisit)+'</div><div class="progress"><i style="width:'+(steps.length?done/steps.length*100:0)+'%"></i></div></div></button><div class="pcell p-status"><span class="patient-status-icon '+s.kind+'">'+(s.urgent.length?'!':s.pending.length?'▣':s.late?'◷':s.awaiting?'○':'✓')+'</span><small>'+s.label+'</small></div><div class="pcell p-observation"><b>'+s.label+'</b><p>'+escapeHtml(reason)+'</p><span class="status '+s.kind+'">'+(scans[0]?'آخرین اسکن: '+date(scans[0].created_at):'بدون اسکن ثبت‌شده')+'</span></div><div class="pcell p-actions"><button class="outline small" data-assign-patient="'+patient.id+'">اختصاص وظیفه</button><button class="primary small" data-open-patient="'+patient.id+'" data-open-tab="monitoring">'+(s.pending.length?'بررسی اسکن':'مرور پرونده')+'</button></div><div class="pcell p-comm"><button class="outline small" data-open-patient="'+patient.id+'" data-open-tab="communication">پیام</button><button class="outline small" data-open-patient="'+patient.id+'" data-open-tab="plan">اقدام بالینی</button></div></article>';
  }).join('') : empty(state.patients.length?'هیچ بیماری با این فیلترها پیدا نشد.':'برای شروع، اولین بیمار را اضافه کنید.');
}
function notificationsHtml(){return '<section class="panel">'+(state.notifications.length?state.notifications.map(n=>'<article class="notification '+(!n.read_at?'unread':'')+'"><b>'+escapeHtml(n.title)+'</b><p>'+escapeHtml(n.body)+'</p><small>'+time(n.created_at)+'</small></article>').join(''):empty('اعلانی وجود ندارد.'))+'<button class="outline" id="mark-notifications">خواندن همه اعلان‌ها</button></section>';}

async function openPatient(id, tab = "overview") {
  state.patientId = id; state.detailTab = tab;
  const patient = (await api("patient", null, { patientId: id })).patient;
  state.patientName = patient.name;
  await loadPatientData();
  $("#detail-name").textContent = patient.name;
  $("#detail-meta").textContent = `${patient.email}${state.profile?.treatment_type ? ` · ${state.profile.treatment_type === "aligner" ? "الاینر شفاف" : "براکت ثابت"}` : ""}`;
  $(".detail-status").textContent = state.profile?.treatment_type && !state.profile?.activated_at ? "در انتظار فعال‌سازی" : "در حال پیگیری";
  const face=state.files.find(file=>file.category==="face" && file.mime.startsWith("image/")); $("#detail-avatar").innerHTML = face ? `<img src="${patientFileUrl(face.id)}" alt="تصویر بیمار">` : escapeHtml(initial(patient.name));
  $("#detail-points").textContent = number(points());
  $("#detail-last-scan").textContent = state.scans.length ? date(state.scans[0].created_at) : "هنوز ثبت نشده";
  $("#detail-progress").textContent = `${number(completed())} از ${number(state.steps.length)} مرحله`;
  await renderDetail();
}
function detailInfoHtml() {
  const p=state.profile||{}, nextScan=state.steps.find(s=>!s.completed_at&&s.event_type==='scan'),nextVisit=state.steps.find(s=>!s.completed_at&&s.event_type==='visit');
  return '<aside class="detail-info-column"><details class="panel" open><summary>اطلاعات مانیتورینگ</summary><div class="info-row"><span>نوع درمان</span><b>'+(p.treatment_type==='aligner'?'الاینر شفاف':p.treatment_type==='bracket'?'براکت ثابت':'ثبت نشده')+'</b></div><div class="info-row"><span>حساب بیمار</span><b>'+(p.treatment_type&&!p.activated_at?'فعال نشده':'فعال')+'</b></div><div class="info-row"><span>اسکن بعدی</span><b>'+date(nextScan?.due_at??p.next_scan_at)+'</b></div><div class="info-row"><span>ویزیت بعدی</span><b>'+date(nextVisit?.due_at??p.next_visit_at)+'</b></div>'+(p.aligner_count?'<div class="info-row"><span>تعداد الاینرها</span><b>'+number(p.aligner_count)+'</b></div>':'')+'<button class="link-btn" data-detail-tab="record">مشاهده و ویرایش پرونده</button></details><details class="panel" open><summary>اهداف و مسیر درمان <small>'+number(completed())+' از '+number(state.steps.length)+'</small></summary><div class="progress"><i style="width:'+(state.steps.length?completed()/state.steps.length*100:0)+'%"></i></div>'+state.steps.slice(0,5).map(s=>'<div class="goal-line"><span class="goal-check '+(s.completed_at?'done':'')+'">'+(s.completed_at?'✓':'○')+'</span><span>'+escapeHtml(s.title)+'</span></div>').join('')+(!state.steps.length?'<p class="muted">هدف یا مرحله‌ای هنوز تعریف نشده است.</p>':'')+'<button class="link-btn" data-detail-tab="plan">برنامه کامل درمان</button></details><section class="panel detail-points"><span>امتیاز بیمار</span><strong>'+number(points())+'</strong></section></aside>';
}
function monitoringChartHtml(){
  const scans=state.scans.slice(0,6).reverse();
  return '<section class="panel"><div class="row"><h2>روند مانیتورینگ</h2><span class="mint-icon">↗</span></div><div class="monitor-legend"><span><i class="good"></i>بررسی‌شده</span><span><i class="review"></i>نیازمند بررسی</span><span><i class="neutral"></i>بدون داده</span></div>'+(scans.length?'<div class="monitor-chart"><div class="monitor-label">اسکن</div>'+scans.map(scan=>'<button class="monitor-point" data-detail-tab="monitoring"><small>'+date(scan.created_at)+'</small><i class="'+(scan.status==='reviewed'?'good':'review')+'"></i><span>'+number(scan.images.length)+' تصویر</span></button>').join('')+'</div>':empty('پس از دریافت اولین اسکن، روند مانیتورینگ اینجا نمایش داده می‌شود.'))+'</section>';
}
function notesHtml(){return '<section class="panel"><h2>یادداشت‌های پزشک</h2>'+(state.profile?.doctor_note?'<article class="doctor-note"><small>یادداشت اولیه پرونده</small><p>'+escapeHtml(state.profile.doctor_note)+'</p></article>':'')+state.notes.map(n=>'<article class="doctor-note"><small>'+time(n.created_at)+'</small><p>'+escapeHtml(n.body)+'</p></article>').join('')+'<form id="note-form"><label for="doctor-note">یادداشت جدید</label><textarea id="doctor-note" name="text" required maxlength="2000" rows="4" placeholder="یادداشت این پیگیری..."></textarea><button class="primary" type="submit">ذخیره یادداشت</button><p class="muted">این یادداشت فقط در پرونده پزشک نمایش داده می‌شود.</p></form></section>';}
async function renderDetail() {
  showShell('patient-detail');
  $('#detail-points').textContent=number(points()); $('#detail-last-scan').textContent=state.scans.length?date(state.scans[0].created_at):'هنوز ثبت نشده'; $('#detail-progress').textContent=number(completed())+' از '+number(state.steps.length)+' مرحله';
  const tabs=[['overview','مانیتورینگ'],['history','تاریخچه'],['record','اطلاعات بیمار'],['monitoring','اسکن‌ها'],['notes','یادداشت‌ها'],['plan','برنامه درمان'],['compare','قبل / بعد']];
  $('#detail-tabs').hidden=true;
  let center='';
  if(state.detailTab==='overview') center=monitoringChartHtml()+'<section class="panel"><div class="row"><h2>مقایسه قبل و بعد</h2><button class="link-btn" data-detail-tab="compare">نمایش کامل</button></div>'+comparisonPreviewHtml()+'</section><section class="panel"><div class="row"><h2>اقدامات برنامه‌ریزی‌شده</h2><button class="link-btn" data-detail-tab="plan">ویرایش برنامه</button></div>'+DantoPlanner.timeline(state.steps.filter(s=>!s.completed_at).slice(0,4))+'</section>';
  else if(state.detailTab==='record')center=recordHtml()+(state.profile?.treatment_type&&!state.profile.activated_at?'<div class="activation-banner"><div><b>حساب بیمار هنوز فعال نشده است</b><p>لینک فعال‌سازی را در اختیار بیمار قرار دهید.</p></div><button class="primary small" id="renew-patient-invite">ساخت لینک جدید</button></div>':'');
  else if(state.detailTab==='plan')center=plannerHtml(false);
  else if(state.detailTab==='notes')center=notesHtml();
  else if(state.detailTab==='monitoring')center=scanGallery();
  else if(state.detailTab==='history')center='<section class="panel"><h2>خط زمانی درمان</h2>'+DantoPlanner.timeline(state.steps)+'</section>'+scanGallery();
  else if(state.detailTab==='compare')center=compareHtml();
  else if(state.detailTab==='communication')center='<section class="panel"><h2>گفت‌وگو با بیمار</h2><p class="muted">پیام را از بخش گفت‌وگو در همین صفحه ارسال کنید.</p></section>';
  $('#detail-content').innerHTML='<div class="detail-overview-grid">'+detailInfoHtml()+'<section class="detail-monitor-column"><nav class="detail-center-tabs" aria-label="بخش‌های پرونده">'+tabs.map(([key,label])=>'<button data-detail-tab="'+key+'" class="'+(state.detailTab===key?'active':'')+'">'+label+'</button>').join('')+'</nav>'+center+'</section><aside class="detail-chat-column">'+chatHtml()+'</aside></div>';
  syncCompare(); if(state.detailTab==='communication') {await api('messages.read',{patientId:state.patientId}); $('#message-text')?.focus();}
}
function comparisonPreviewHtml(){const images=state.scans.map(s=>s.images.find(i=>i.view==='front')||s.images[0]).filter(Boolean);return images.length>=2?'<div class="comparison-preview"><figure><img src="'+imageUrl(images.at(-1).id)+'" alt="اسکن اولیه"><figcaption>قبل</figcaption></figure><figure><img src="'+imageUrl(images[0].id)+'" alt="اسکن اخیر"><figcaption>بعد</figcaption></figure></div>':empty('برای مقایسه، دو اسکن ثبت‌شده لازم است.');}

async function renderPatient() {
  showShell("patient-app");
  document.querySelectorAll("[data-patient-view]").forEach(el => el.classList.toggle("active", el.dataset.patientView === state.patientView));
  const headings = { home: `سلام\n${state.user.name.trim().split(/\s+/)[0]}`, roadmap: "مسیر درمان من", scans: "اسکن‌ها", messages: "پیام‌ها", profile: "حساب من" };
  $("#patient-page-title").textContent = headings[state.patientView];
  const root = $("#patient-content");
  if (state.patientView === "home") { root.innerHTML = patientHomeHtml();
  } else if (state.patientView === "roadmap") root.innerHTML = DantoPlanner.calendar(state.steps,state.planView,false) + `<div class="roadmap-intro"><span>مسیر درمان من</span><strong>${number(completed())} از ${number(state.steps.length)} مرحله</strong><div class="progress"><i style="width:${state.steps.length ? completed() / state.steps.length * 100 : 0}%"></i></div></div>` + title("برنامه گام‌به‌گام", "هر مرحله را پس از انجام ثبت کنید. انجام تا موعد تعیین‌شده ۱۰ امتیاز دارد.") + `<div class="patient-stats"><article class="patient-stat"><small>امتیاز</small><strong>${number(points())}</strong></article><article class="patient-stat"><small>انجام‌شده</small><strong>${number(completed())}</strong></article><article class="patient-stat"><small>کل مراحل</small><strong>${number(state.steps.length)}</strong></article></div><div class="panel">${roadmapHtml(false)}</div>`;
  else if (state.patientView === "scans") { root.innerHTML = title("ارسال و مرور اسکن‌ها", "عکس‌های درمان فقط برای شما و پزشک‌تان قابل مشاهده‌اند.") + `<form id="scan-form" class="panel"><h2>اسکن جدید</h2><p class="muted">حداقل یک تصویر JPG، PNG یا WebP تا ۱۰ مگابایت انتخاب کنید.</p><div class="upload-grid">${[["front","روبرو"],["right","سمت راست"],["left","سمت چپ"]].map(([key,label]) => `<label class="upload-field">${label}<input type="file" name="${key}" accept="image/jpeg,image/png,image/webp"><span id="file-${key}">انتخاب تصویر</span></label>`).join("")}</div><button class="primary" type="submit">ارسال برای پزشک</button></form>${title("اسکن‌های قبلی")}${scanGallery()}${title("مقایسه تصاویر")}${compareHtml()}`; syncCompare(); }
  else if (state.patientView === "messages") { root.innerHTML = chatHtml(); await api("messages.read", { patientId: state.user.id }); }
  else if (state.patientView === "profile") root.innerHTML = `<div class="panel"><h2>اطلاعات حساب</h2><div class="info-row"><span>نام</span><b>${escapeHtml(state.user.name)}</b></div><div class="info-row"><span>ایمیل</span><b>${escapeHtml(state.user.email)}</b></div></div><div id="settings-root" style="margin-top:15px"></div><button class="patient-profile-logout" data-logout>خروج از حساب</button>`;
  if (state.patientView === "profile") await renderSettings($("#settings-root"));
}
async function renderSettings(root) {
  state.settings = (await api("settings")).settings;
  root.innerHTML = title("تنظیم اعلان‌ها", "این تنظیمات اعلان‌های داخل برنامه را کنترل می‌کنند.") + `<form id="settings-form" class="panel settings-list">${[["messages","پیام‌ها"],["scans","اسکن‌ها"],["roadmap","مسیر درمان"]].map(([key,label]) => `<label><span>${label}</span><input type="checkbox" name="${key}" ${state.settings[key] ? "checked" : ""}></label>`).join("")}<button class="primary" type="submit">ذخیره تنظیمات</button></form>`;
}
function stepModal() { modal("مرحله جدید درمان", `<form id="step-form" class="form-grid"><label class="full">عنوان مرحله<input name="title" required maxlength="100"></label><label class="full">توضیح<textarea name="detail" maxlength="500"></textarea></label><label class="full">موعد انجام<input name="dueAt" type="date" required></label><div class="modal-actions full"><button class="primary" type="submit">افزودن مرحله</button></div></form>`); }
function reviewModal(id) { modal("نظر روی اسکن", `<form id="review-form" data-scan-id="${id}"><label>نظر پزشک<textarea name="note" maxlength="1000" placeholder="توضیح برای بیمار"></textarea></label><div class="modal-actions"><button class="primary" type="submit">ثبت بررسی</button></div></form>`); }
function notificationsModal() { modal("اعلان‌ها", `<div class="notification-list">${state.notifications.length ? state.notifications.map(item => `<article class="notification ${item.read_at ? "" : "new"}"><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.body)}</p><small>${time(item.created_at)}</small></article>`).join("") : empty("اعلانی ندارید.")}</div><div class="modal-actions"><button class="outline" id="mark-notifications">علامت‌گذاری به‌عنوان خوانده‌شده</button></div>`); }

const PATIENT_FILE_SLOTS = [
  ["oral", "تصاویر اولیه دهان", "نمای روبه‌رو، چپ، راست و اکلوزال", "image/jpeg,image/png,image/webp"],
  ["face", "تصاویر چهره", "روبه‌رو و نیمرخ", "image/jpeg,image/png,image/webp"],
  ["opg", "OPG", "رادیوگرافی پانورامیک", "image/*,.pdf,.dcm"],
  ["cbct", "CBCT", "تصویر، گزارش، DICOM یا ZIP", "image/*,.pdf,.dcm,.zip"],
  ["faceScan", "اسکن سه‌بعدی چهره", "OBJ، PLY، STL یا ZIP", "image/*,.obj,.ply,.stl,.zip"],
  ["dentalScan", "اسکن سه‌بعدی دندان", "STL، PLY، OBJ، DICOM یا ZIP", ".stl,.ply,.obj,.dcm,.zip"],
  ["planPdf", "PDF طرح درمان", "نسخهٔ مکتوب برنامه", ".pdf"],
  ["planImages", "تصاویر طرح درمان", "تصاویر مرتبط با برنامه", "image/jpeg,image/png,image/webp"],
  ["planOther", "سایر فایل‌های طرح درمان", "PDF، تصویر یا فایل سه‌بعدی", "image/*,.pdf,.dcm,.zip,.obj,.ply,.stl"],
];
const patientFileUrl = id => `/api?op=patient.file&fileId=${encodeURIComponent(id)}`;
const inputDate = value => value ? DantoPlanner.iso(Number(value)) : "";
function fileSlotHtml([key, label, hint, accept], compact = false) { return `<div class="record-upload-slot"><div><b>${label}</b><small>${hint}</small></div><label class="record-file-pick">+ انتخاب فایل<input type="file" name="file:${key}" accept="${accept}" multiple></label>${compact ? "" : `<div class="selected-files" data-selected-files="${key}">فایلی انتخاب نشده است.</div><input name="description:${key}" maxlength="500" placeholder="توضیح این فایل‌ها (اختیاری)">`}</div>`; }
function wizardHtml() {
  const names = ["مشخصات بیمار", "پرونده تصویری", "برنامه‌ریزی درمان", "تأیید و خط زمانی"];
  return `<div class="wizard-head"><div><p class="eyebrow">تشکیل پرونده و دعوت‌نامه</p><h2>افزودن بیمار جدید</h2><p>مشخصات، فایل‌های اولیه و برنامهٔ درمان را در یک پرونده ثبت کنید.</p></div><button class="outline" id="wizard-cancel">انصراف</button></div><nav class="wizard-stepper" aria-label="مراحل افزودن بیمار">${names.map((name, index) => `<span data-wizard-marker="${index + 1}"><i>${number(index + 1)}</i>${name}</span>`).join("")}</nav><form id="patient-create-form"><section class="wizard-panel" data-wizard-panel="1"><h3>مشخصات اولیه بیمار</h3><div class="wizard-fields"><label>نام و نام خانوادگی *<input name="name" required minlength="2" maxlength="100" autocomplete="off" placeholder="مثال: نیما شریفی"></label><label>ایمیل بیمار برای فعال‌سازی حساب *<input name="email" type="email" required autocomplete="off" placeholder="name@example.com" dir="ltr"></label><label>تاریخ تولد <small>اختیاری</small><input name="birthDate" type="date"></label><label>شماره تماس <small>اختیاری</small><input name="phone" inputmode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹"></label><label>جنسیت <small>اختیاری</small><select name="gender"><option value="">انتخاب نشده</option><option value="female">زن</option><option value="male">مرد</option></select></label><label>نوع درمان *<select name="treatmentType" required><option value="">انتخاب نوع درمان</option><option value="aligner">الاینر شفاف</option><option value="bracket">براکت ثابت</option></select></label><label class="aligner-count-field" hidden>تعداد کل الاینرها *<input name="alignerCount" type="number" min="1" max="120" placeholder="مثال: ۱۵"></label><label class="full">یادداشت اولیه پزشک <small>اختیاری</small><textarea name="doctorNote" maxlength="2000" rows="4" placeholder="شکایت اصلی، سابقه یا نکات مهم برای شروع درمان..."></textarea></label></div></section><section class="wizard-panel" data-wizard-panel="2" hidden><h3>پرونده تصویری و فایل‌های اولیه</h3><p class="muted">بارگذاری اختیاری است. پس از ساخت پرونده نیز می‌توانید فایل اضافه کنید. حداکثر ۱۲ فایل، هرکدام ۱۰ مگابایت و مجموعاً ۳۰ مگابایت.</p><h4>پرونده‌های بالینی اولیه</h4><div class="record-upload-grid">${PATIENT_FILE_SLOTS.slice(0, 6).map(slot => fileSlotHtml(slot)).join("")}</div><h4>فایل‌های طرح درمان</h4><div class="record-upload-grid">${PATIENT_FILE_SLOTS.slice(6).map(slot => fileSlotHtml(slot)).join("")}</div></section><section class="wizard-panel" data-wizard-panel="3" hidden><h3>برنامه‌ریزی درمان</h3><div id="wizard-planner"></div><div class="wizard-fields"><label class="full">توضیحات برنامهٔ درمان<textarea name="planNote" maxlength="2000" rows="4" placeholder="هدف‌ها و نکات برنامهٔ درمان..."></textarea></label></div></section><section class="wizard-panel" data-wizard-panel="4" hidden><h3>مرور و تأیید پرونده</h3><div id="wizard-review" class="wizard-review"></div><p class="muted">پس از ذخیره، لینک فعال‌سازی ساخته می‌شود. آن را در اختیار بیمار قرار دهید؛ اعتبار لینک ۷ روز است.</p></section><div class="wizard-foot"><button type="button" class="outline" id="wizard-prev" hidden>مرحله قبل</button><span id="wizard-hint"></span><button type="button" class="primary" id="wizard-next">مرحله بعد</button><button type="submit" class="primary" id="wizard-save" hidden>ذخیره بیمار و ساخت دعوت‌نامه</button></div></form>`;
}
function wizardDirty() { const form = $("#patient-create-form"); return Boolean(form && [...form.querySelectorAll("input,select,textarea")].some(input => input.type === "file" ? input.files.length : input.value)); }
function updateWizardStep(step) {
  const form = $("#patient-create-form"); if (!form) return;
  if (step > state.wizardStep) {
    const panel = $(`[data-wizard-panel="${state.wizardStep}"]`, form);
    for (const input of panel.querySelectorAll("input,select,textarea")) if (!input.checkValidity()) { input.reportValidity(); return; }
    if (state.wizardStep === 2) { const files = [...form.querySelectorAll('input[type="file"]')].flatMap(input => [...input.files]); if (files.length > 12 || files.reduce((sum, file) => sum + file.size, 0) > 30_000_000 || files.some(file => file.size > 10_000_000)) { toast("حداکثر ۱۲ فایل، هر فایل ۱۰ مگابایت و مجموعاً ۳۰ مگابایت مجاز است."); return; } }
    if(state.wizardStep===3 && state.draftPlan.some(e=>e.eventType==="aligner" && (form.elements.treatmentType.value!=="aligner" || e.alignerNo>Number(form.elements.alignerCount.value)))) { toast("شماره الاینرهای برنامه با نوع درمان یا تعداد الاینرها سازگار نیست. برنامه را ویرایش کنید."); return; }
  }
  if(step===3 && state.wizardStep!==3) { state.planView=DantoPlanner.parts(Date.now()); $("#wizard-planner").innerHTML=plannerHtml(true); }
  state.wizardStep = step;
  form.querySelectorAll("[data-wizard-panel]").forEach(panel => panel.hidden = Number(panel.dataset.wizardPanel) !== step);
  document.querySelectorAll("[data-wizard-marker]").forEach(marker => marker.classList.toggle("active", Number(marker.dataset.wizardMarker) === step));
  $("#wizard-prev").hidden = step === 1; $("#wizard-next").hidden = step === 4; $("#wizard-save").hidden = step !== 4;
  $("#wizard-hint").textContent = ["موارد ستاره‌دار الزامی هستند.", "فایل‌ها اختیاری‌اند.", "برنامه را می‌توانید بعداً ویرایش کنید.", "اطلاعات پیش از ذخیره بررسی شود."][step - 1];
  $("#wizard-timeline")?.remove();
  if (step === 4) { const files = [...form.querySelectorAll('input[type="file"]')].flatMap(input => [...input.files]); const row = (label, value) => `<div><span>${label}</span><b>${escapeHtml(value || "—")}</b></div>`; $("#wizard-review").innerHTML = row("نام بیمار", form.elements.name.value) + row("ایمیل", form.elements.email.value) + row("نوع درمان", form.elements.treatmentType.selectedOptions[0]?.textContent) + row("تعداد فایل‌ها", `${number(files.length)} فایل`) + row("اسکن بعدی", state.draftPlan.find(e=>e.eventType==="scan") ? date(state.draftPlan.find(e=>e.eventType==="scan").dueAt) : "") + row("ویزیت بعدی", state.draftPlan.find(e=>e.eventType==="visit") ? date(state.draftPlan.find(e=>e.eventType==="visit").dueAt) : "") + row("رویدادهای برنامه", number(state.draftPlan.length)); $("#wizard-review").insertAdjacentHTML("afterend", "<div id=wizard-timeline>"+DantoPlanner.timeline(state.draftPlan)+"</div>"); }
  $("#doctor-content").scrollIntoView({ block: "start", behavior: "smooth" });
}
function recordHtml() {
  const p = { ...state.profile, next_scan_at: state.steps.find(s => !s.completed_at && s.event_type === "scan")?.due_at ?? state.profile?.next_scan_at, next_visit_at: state.steps.find(s => !s.completed_at && s.event_type === "visit")?.due_at ?? state.profile?.next_visit_at }, label = Object.fromEntries(PATIENT_FILE_SLOTS.map(slot => [slot[0], slot[1]]));
  const files = state.files.length ? `<div class="record-file-grid">${state.files.map(file => `<article class="record-file-card">${file.mime.startsWith("image/") ? `<img src="${patientFileUrl(file.id)}" alt="${escapeHtml(file.name)}" loading="lazy">` : `<span class="record-file-icon">▣</span>`}<div><small>${escapeHtml(label[file.category] || "سایر فایل‌ها")}</small><b title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</b><span>${date(file.created_at)}</span>${file.description ? `<p>${escapeHtml(file.description)}</p>` : ""}</div><div class="record-file-actions"><a class="outline small" href="${patientFileUrl(file.id)}" target="_blank" rel="noopener">نمایش / دانلود</a><button class="outline small" data-delete-patient-file="${file.id}">حذف</button></div></article>`).join("")}</div>` : empty("هنوز فایلی برای این بیمار ثبت نشده است.");
  return `<div class="record-layout"><section class="panel"><div class="row"><h2>مشخصات و برنامهٔ درمان</h2><button class="outline small" id="edit-patient-profile">ویرایش اطلاعات</button></div><div class="info-row"><span>نوع درمان</span><b>${p.treatment_type === "aligner" ? "الاینر شفاف" : p.treatment_type === "bracket" ? "براکت ثابت" : "ثبت نشده"}</b></div>${p.aligner_count ? `<div class="info-row"><span>تعداد الاینرها</span><b>${number(p.aligner_count)}</b></div>` : ""}<div class="info-row"><span>تاریخ تولد</span><b>${p.birth_date ? date(new Date(`${p.birth_date}T12:00:00`).getTime()) : "—"}</b></div><div class="info-row"><span>شماره تماس</span><b>${escapeHtml(p.phone || "—")}</b></div><div class="info-row"><span>جنسیت</span><b>${p.gender === "female" ? "زن" : p.gender === "male" ? "مرد" : "—"}</b></div><div class="info-row"><span>اسکن بعدی</span><b>${date(p.next_scan_at)}</b></div><div class="info-row"><span>ویزیت بعدی</span><b>${date(p.next_visit_at)}</b></div><h3>یادداشت اولیه پزشک</h3><p class="record-note">${escapeHtml(p.doctor_note || "یادداشتی ثبت نشده است.")}</p><h3>توضیحات برنامهٔ درمان</h3><p class="record-note">${escapeHtml(p.plan_note || "توضیحی ثبت نشده است.")}</p></section><section class="panel"><h2>افزودن فایل به پرونده</h2><p class="muted">عکس، رادیوگرافی، اسکن سه‌بعدی یا فایل طرح درمان را با توضیح اختیاری ذخیره کنید.</p><form id="patient-file-form" class="record-file-form"><label>نوع فایل<select name="category">${PATIENT_FILE_SLOTS.map(slot => `<option value="${slot[0]}">${slot[1]}</option>`).join("")}</select></label><label>انتخاب فایل‌ها<input name="patientFiles" type="file" accept="${PATIENT_FILE_SLOTS[0][3]}" multiple required></label><label>توضیح فایل‌ها<textarea name="description" maxlength="500" rows="3"></textarea></label><button class="primary" type="submit">بارگذاری در پرونده</button></form></section></div><section class="panel record-files-section"><div class="row"><h2>فایل‌های پرونده</h2><span class="muted">${number(state.files.length)} فایل</span></div>${files}</section>`;
}
function profileEditModal() { const p = state.profile || {}; modal("ویرایش پرونده بیمار", `<form id="patient-profile-form" class="form-grid"><label>نام بیمار<input name="name" required minlength="2" maxlength="100" value="${escapeHtml(state.patientName)}"></label><label>تاریخ تولد<input name="birthDate" type="date" value="${escapeHtml(p.birth_date || "")}"></label><label>شماره تماس<input name="phone" value="${escapeHtml(p.phone || "")}"></label><label>جنسیت<select name="gender"><option value="">انتخاب نشده</option><option value="female" ${p.gender === "female" ? "selected" : ""}>زن</option><option value="male" ${p.gender === "male" ? "selected" : ""}>مرد</option></select></label><label>نوع درمان<select name="treatmentType" required><option value="">انتخاب درمان</option><option value="aligner" ${p.treatment_type === "aligner" ? "selected" : ""}>الاینر شفاف</option><option value="bracket" ${p.treatment_type === "bracket" ? "selected" : ""}>براکت ثابت</option></select></label><label>تعداد الاینرها<input name="alignerCount" type="number" min="1" max="120" value="${p.aligner_count || ""}"></label><label>اسکن بعدی<input name="nextScanAt" type="date" value="${inputDate(p.next_scan_at)}"></label><label>ویزیت بعدی<input name="nextVisitAt" type="date" value="${inputDate(p.next_visit_at)}"></label><label class="full">یادداشت اولیه پزشک<textarea name="doctorNote" maxlength="2000">${escapeHtml(p.doctor_note || "")}</textarea></label><label class="full">توضیحات برنامهٔ درمان<textarea name="planNote" maxlength="2000">${escapeHtml(p.plan_note || "")}</textarea></label><div class="modal-actions full"><button class="primary" type="submit">ذخیره تغییرات</button></div></form>`); }


function plannerHtml(draft=false){
  const events=draft?state.draftPlan:state.steps, isAl=draft?$('#patient-create-form')?.elements.treatmentType.value==='aligner':state.profile?.treatment_type==='aligner';
  return '<div class="planner"><div class="planner-actions"><button type="button" class="outline small" data-plan-add="visit" data-series>+ ویزیت‌های تکرارشونده</button><button type="button" class="outline small" data-plan-add="scan" data-series>+ اسکن‌های تکرارشونده</button>'+(isAl?'<button type="button" class="outline small" data-plan-add="aligner" data-series>+ برنامه تعویض الاینر</button>':'')+'<button type="button" class="primary small" data-plan-add="custom">+ رویداد تکی</button></div><div class="planner-grid">'+DantoPlanner.calendar(events,state.planView)+'<aside class="planner-side"><section class="panel"><h2>خلاصه برنامه</h2><div class="plan-summary">'+['visit','scan','aligner','final'].map(key=>'<div><strong>'+number(events.filter(e=>DantoPlanner.type(e)===key).length)+'</strong><small>'+DantoPlanner.types[key]+'</small></div>').join('')+'</div></section><section class="panel"><h2>برنامه‌های تکرارشونده</h2>'+seriesSummaryHtml(events)+'</section></aside></div><section class="panel"><h2>خط زمانی درمان</h2>'+DantoPlanner.timeline(events,true)+'</section></div>';
}
function seriesSummaryHtml(events){
  const ids=[...new Set(events.map(e=>e.series_id||e.seriesId).filter(Boolean))];
  return ids.length?ids.map(id=>{const rows=events.filter(e=>(e.series_id||e.seriesId)===id);return '<div class="series-summary"><b>'+DantoPlanner.types[DantoPlanner.type(rows[0])]+'</b><small>'+number(rows.length)+' رویداد · '+date(DantoPlanner.due(rows[0]))+'</small><button type="button" class="link-btn" data-plan-edit="'+rows[0].id+'">مرور و ویرایش</button></div>';}).join(''):'<p class="muted">برنامه تکرارشونده‌ای ثبت نشده است.</p>';
}
async function refreshPlanner(){
  if($('#patient-create-form')&&!$('#doctor-app').hidden) $('#wizard-planner').innerHTML=plannerHtml(true);
  else if(state.user.role==='patient')await renderPatient();
  else await renderDetail();
}
function planEventModal(eventType='custom',day=null,id=null,series=false){
  const draft=Boolean($('#patient-create-form')&&!$('#doctor-app').hidden),events=draft?state.draftPlan:state.steps,edit=events.find(e=>e.id===id),p=draft?{treatment_type:$('#patient-create-form').elements.treatmentType.value,aligner_count:Number($('#patient-create-form').elements.alignerCount.value)}:state.profile||{},type=edit?DantoPlanner.type(edit):eventType;
  if(edit?.completed_at)return modal('رویداد انجام‌شده','<p>'+escapeHtml(edit.title)+'</p><p>انجام‌شده در '+time(edit.completed_at)+'؛ '+number(edit.points_awarded)+' امتیاز</p>');
  const used=events.map(e=>e.aligner_no??e.alignerNo).filter(Boolean),first=Array.from({length:p.aligner_count||0},(_,i)=>i+1).find(n=>!used.includes(n))||1;
  modal(edit?'ویرایش رویداد':series?'برنامه تکرارشونده':'افزودن رویداد', '<form id="plan-event-form" class="form-grid" data-draft="'+draft+'" data-id="'+(id||'')+'" data-series="'+series+'"><label class="full">نوع رویداد<select name="eventType" '+(edit?'disabled':'')+'>'+Object.entries(DantoPlanner.types).filter(([key])=>key!=='aligner'||p.treatment_type==='aligner').map(([key,label])=>'<option value="'+key+'" '+(type===key?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label class="full">عنوان<input name="title" required minlength="2" maxlength="100" value="'+escapeHtml(edit?.title||DantoPlanner.types[type])+'"></label><label class="full">'+(series?'تاریخ شروع':'تاریخ رویداد')+'<input type="date" name="day" required value="'+(edit?DantoPlanner.iso(DantoPlanner.due(edit)):day||DantoPlanner.iso(Date.now()))+'"></label>'+(series?'<label>تعداد تکرار<input name="count" type="number" required min="1" max="120" value="'+(type==='aligner'?Math.max(1,(p.aligner_count||1)-first+1):4)+'"></label><label>فاصله (روز)<input name="interval" type="number" required min="1" max="365" value="'+(type==='visit'?30:7)+'"></label>':'')+'<label class="full" id="plan-aligner-field" '+(type==='aligner'?'':'hidden')+'>شماره الاینر '+(series?'اول':'')+'<input name="alignerNo" type="number" min="1" max="'+(p.aligner_count||120)+'" value="'+(edit?.aligner_no??edit?.alignerNo??first)+'"></label><label class="full">یادداشت برای بیمار<textarea name="detail" maxlength="500" rows="3">'+escapeHtml(edit?.detail||'')+'</textarea></label><div class="modal-actions full">'+(edit?'<button type="button" class="outline small" id="delete-plan-event" data-id="'+id+'">حذف رویداد</button>'+((edit.series_id||edit.seriesId)?'<button type="button" class="outline small" id="delete-plan-series" data-id="'+id+'">حذف رویدادهای باقی‌مانده سری</button>':''):'')+'<button type="submit" class="primary">'+(edit?'ذخیره تغییرات':'ثبت در برنامه')+'</button></div></form>');
}
async function submitPlanEvent(form){
  const data=new FormData(form),draft=form.dataset.draft==='true',editId=form.dataset.id,events=draft?state.draftPlan:state.steps,edit=events.find(e=>e.id===editId),type=edit?DantoPlanner.type(edit):data.get('eventType'),count=Number(data.get('count')||1),interval=Number(data.get('interval')||1),start=DantoPlanner.at(data.get('day')),alignerNo=Number(data.get('alignerNo'));
  if(!Number.isFinite(start)||count<1||count>120||interval<1||interval>365)throw new Error('تاریخ یا تعداد تکرار معتبر نیست.');
  if(edit){const changes={title:data.get('title'),detail:data.get('detail'),dueAt:start};if(draft)Object.assign(edit,changes);else await api('plan.update',{patientId:state.patientId,stepId:editId,...changes});}
  else{
    const total=draft?Number($('#patient-create-form').elements.alignerCount.value):state.profile?.aligner_count;
    if(type==='aligner'&&(alignerNo<1||alignerNo+count-1>total))throw new Error('شماره الاینرها خارج از محدوده طرح درمان است.');
    const seriesId=form.dataset.series==='true'?crypto.randomUUID():null;
    const additions=Array.from({length:count},(_,index)=>({id:crypto.randomUUID(),title:type==='aligner'?String(data.get('title'))+' '+number(alignerNo+index):data.get('title'),detail:data.get('detail'),dueAt:start+index*interval*86400000,eventType:type,alignerNo:type==='aligner'?alignerNo+index:null,seriesId}));
    if(type==='aligner'&&additions.some(e=>events.some(old=>(old.aligner_no??old.alignerNo)===e.alignerNo)))throw new Error('این شماره الاینر قبلاً در برنامه ثبت شده است.');
    if(draft){if(events.length+additions.length>120)throw new Error('حداکثر ۱۲۰ رویداد در پرونده جدید مجاز است.');state.draftPlan.push(...additions);state.draftPlan.sort((a,b)=>a.dueAt-b.dueAt);}else await api('plan.create',{patientId:state.patientId,events:additions});
  }
  closeModal();if(!draft)await loadPatientData();await refreshPlanner();toast(draft?'رویداد به پیش‌نویس برنامه اضافه شد.':'برنامه درمان ذخیره شد.');
}
async function savePlanDelete(id,series){
  const draft=Boolean($('#patient-create-form')&&!$('#doctor-app').hidden);
  if(draft){const row=state.draftPlan.find(e=>e.id===id);state.draftPlan=state.draftPlan.filter(e=>series&&row?.seriesId?e.seriesId!==row.seriesId:e.id!==id);}else{await api('plan.delete',{patientId:state.patientId,stepId:id,series});await loadPatientData();}
  closeModal();await refreshPlanner();toast('برنامه به‌روز شد.');
}
function patientHomeHtml(){
  const next=state.steps.find(s=>!s.completed_at),scan=state.steps.find(s=>!s.completed_at&&s.event_type==='scan'),visit=state.steps.find(s=>!s.completed_at&&s.event_type==='visit'),latest=state.scans[0],p=state.schedule||{},aligner=state.steps.filter(s=>s.completed_at&&s.event_type==='aligner').at(-1)?.aligner_no;
  return '<div class="patient-profile-card"><span class="patient-profile-avatar">'+escapeHtml(initial(state.user.name))+'</span><div><h2>'+escapeHtml(state.user.name)+'</h2><p>'+escapeHtml(state.user.email)+'</p></div><button class="link-btn" data-patient-view="profile">حساب من</button></div><div class="patient-welcome"><div class="scan-callout"><div class="patient-scan-symbol">▣<span>◷</span></div><span class="scan-date">نوبت اسکن بعدی‌ات</span><h2>'+date(scan?.due_at??p.next_scan_at)+'</h2><button class="link-btn" data-patient-view="scans">شروع اسکن ←</button></div><button class="roadmap-teaser" data-patient-view="roadmap"><span class="roadmap-teaser-icon">◎</span><div><b>نقشه راه لبخندت</b><small>مسیر کامل اسکن‌ها و ویزیت‌ها</small></div><span>←</span></button></div><section class="patient-metrics"><h2>آمار '+escapeHtml(state.user.name)+'</h2>'+(p.treatment_type==='aligner'?'<div><span>شماره الاینر فعلی</span><strong>'+(aligner?number(aligner)+' از '+number(p.aligner_count):'ثبت نشده')+'</strong></div>':'')+'<div><span>تعداد کل اسکن‌ها</span><strong>'+number(state.scans.length)+'</strong></div><div><span>مراحل انجام‌شده</span><strong>'+number(completed())+' از '+number(state.steps.length)+'</strong></div><div><span>امتیاز من</span><strong>'+number(points())+'</strong></div></section><div class="patient-grid"><section class="panel"><div class="row"><h2>مرحله بعدی</h2><button class="link-btn" data-patient-view="roadmap">مشاهده مسیر</button></div>'+(next?'<b>'+escapeHtml(next.title)+'</b><p>'+escapeHtml(next.detail)+'</p><small>'+date(next.due_at)+'</small>':empty('مرحله بازی وجود ندارد.'))+'</section>'+((visit?.due_at??p.next_visit_at)?'<section class="panel"><h2>ویزیت بعدی</h2><b>'+date(visit?.due_at??p.next_visit_at)+'</b></section>':'')+'<section class="panel"><div class="row"><h2>اسکن‌های قبلی</h2><button class="link-btn" data-patient-view="scans">قبلی‌ها</button></div>'+(latest?'<div class="recent-scan-images">'+latest.images.map(i=>'<button class="image-button" data-view-image="'+i.id+'"><img src="'+imageUrl(i.id)+'" alt="تصویر اسکن"></button>').join('')+'</div>':empty('هنوز اسکن ثبت نشده است.'))+'</section></div>';
}
document.addEventListener('change',event=>{if(event.target.name==='eventType'&&event.target.closest('#plan-event-form')){$('#plan-aligner-field').hidden=event.target.value!=='aligner';$('#plan-event-form input[name=title]').value=DantoPlanner.types[event.target.value];}});

document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-plan-day]')){event.preventDefault();planEventModal('custom',event.target.dataset.planDay);}});
document.addEventListener("click", async event => {
  const target = event.target.closest("button, tr[data-id], [data-plan-day]"); if (!target) return;
  try {
    if(target.id==='toggle-patient-filters'){state.filtersOpen=!state.filtersOpen;$('#patient-filter-panel').hidden=!state.filtersOpen;return;}
    if(target.dataset.filterGroup){state[target.dataset.filterGroup]=target.dataset.filterValue;$('#patient-filter-panel').outerHTML=patientFiltersHtml();$('#patient-rows').innerHTML=patientRows();return;}
    if(target.id==='reset-patient-filters'){state.treatmentFilter='all';state.activityFilter='all';state.patientFilter='all';return renderDoctor();}
    if(target.dataset.assignPatient){await openPatient(target.dataset.assignPatient,'plan');return stepModal();}
    if(target.dataset.planNav){const p=state.planView||DantoPlanner.parts(Date.now());if(target.dataset.planNav==='today')state.planView=DantoPlanner.parts(Date.now());else{p.month+=target.dataset.planNav==='next'?1:-1;if(p.month>12){p.month=1;p.year++;}if(p.month<1){p.month=12;p.year--;}state.planView=p;}return refreshPlanner();}
    if(target.dataset.planAdd)return planEventModal(target.dataset.planAdd,null,null,target.hasAttribute('data-series'));
    if(target.dataset.planEdit)return planEventModal(null,null,target.dataset.planEdit);
    if(target.dataset.planDay)return planEventModal('custom',target.dataset.planDay);
    if(target.id==='delete-plan-event'){if(!confirm('این رویداد از برنامه حذف شود؟'))return;await savePlanDelete(target.dataset.id,false);return;}
    if(target.id==='delete-plan-series'){if(!confirm('همه رویدادهای انجام‌نشده این برنامه تکرارشونده حذف شوند؟'))return;await savePlanDelete(target.dataset.id,true);return;}
    if (target.dataset.authMode) return authMode(target.dataset.authMode);
    if (target.id === "toggle-pass") { $("#login-pass").type = $("#login-pass").type === "password" ? "text" : "password"; return; }
    if (target.hasAttribute("data-logout")) { await api("logout", {}); state.user = null; state.patientId = null; state.patients = []; $("#auth-form").reset(); authMode("login"); closeModal(); showShell("login-screen"); return; }
    if (target.classList.contains("mobile-menu")) return $(".sidebar").classList.toggle("open");
    if (target.dataset.patientFilter) { state.patientFilter = target.dataset.patientFilter; document.querySelectorAll("[data-patient-filter]").forEach(el => el.classList.toggle("active", el.dataset.patientFilter === state.patientFilter)); $("#patient-rows").innerHTML = patientRows(); return; }
    if (target.dataset.doctorView) { if (state.doctorView === "wizard" && wizardDirty() && !confirm("اطلاعات واردشده ذخیره نشده است. خارج می‌شوید؟")) return; state.doctorView = target.dataset.doctorView; $(".sidebar").classList.remove("open"); return renderDoctor(); }
    if (target.dataset.patientView) { state.patientView = target.dataset.patientView; return renderPatient(); }
    if (target.dataset.openPatient || target.dataset.id) return openPatient(target.dataset.openPatient || target.dataset.id, target.dataset.openTab || "overview");
    if (target.dataset.detailTab) { state.detailTab = target.dataset.detailTab; return renderDetail(); }
    if (target.id === "detail-back") return renderDoctor();
    if (target.id === "detail-message") { state.detailTab = "communication"; return renderDetail(); }
    if (target.id === "detail-action" || target.id === "create-step") return stepModal();
    if (target.id === "add-patient") { state.doctorView = "wizard"; state.wizardStep = 1; return renderDoctor(); }
    if (target.id === "wizard-cancel") { if (wizardDirty() && !confirm("اطلاعات واردشده ذخیره نشده است. خارج می‌شوید؟")) return; state.doctorView = "patients"; return renderDoctor(); }
    if (target.id === "wizard-next") return updateWizardStep(Math.min(4, state.wizardStep + 1));
    if (target.id === "wizard-prev") return updateWizardStep(Math.max(1, state.wizardStep - 1));
    if (target.id === "edit-patient-profile") return profileEditModal();
    if (target.id === "renew-patient-invite") { const result = await api("patient.invite", { patientId: state.patientId }); const link = `${location.origin}/danto.html?invite=${result.invite}`; return modal("لینک فعال‌سازی جدید", `<p>این لینک تا ${date(result.expiresAt)} اعتبار دارد.</p><div class="invite-link" dir="ltr">${escapeHtml(link)}</div><button id="copy-invite" class="primary" data-link="${escapeHtml(link)}">کپی لینک</button>`); }
    if (target.dataset.deletePatientFile) { if (!confirm("این فایل از پرونده حذف شود؟")) return; await api("patient.file.delete", { patientId: state.patientId, fileId: target.dataset.deletePatientFile }); await loadPatientData(); await renderDetail(); toast("فایل حذف شد."); return; }
    if (target.id === "doctor-notifications" || target.id === "patient-notifications") { await refreshNotifications(); return notificationsModal(); }
    if (target.id === "mark-notifications") { await api("notifications.read", {}); closeModal(); await refreshNotifications(); if(state.doctorView==="notifications")await renderDoctor(); return; }
    if (target.id === "modal-close") return closeModal();
    if (target.dataset.viewImage) return modal("تصویر اسکن", `<img class="large-image" src="${imageUrl(target.dataset.viewImage)}" alt="تصویر اسکن">`);
    if (target.dataset.reviewScan) return reviewModal(target.dataset.reviewScan);
    if (target.dataset.completeStep) { if (!confirm("انجام این مرحله را ثبت می‌کنید؟")) return; const result = await api("step.complete", { patientId: state.user.id, stepId: target.dataset.completeStep }); toast(result.points ? `مرحله ثبت شد؛ ${number(result.points)} امتیاز گرفتید.` : "مرحله ثبت شد."); await loadPatientData(); return renderPatient(); }
  } catch (error) { showError(error); }
});
document.addEventListener("submit", async event => {
  const form = event.target; if (form.id === "auth-form") return authSubmit(event);
  event.preventDefault(); const button = $("button[type=submit]", form); if (button) button.disabled = true;
  try {
    if (form.id === "patient-create-form") { const data = new FormData(form); data.set("op", "patient.create"); data.set("draftPlan", JSON.stringify(state.draftPlan)); const result = await api("patient.create", data); const link = `${location.origin}/danto.html?invite=${result.invite}`; state.doctorView = "patients"; await loadPatients(); await renderDoctor(); modal("پرونده بیمار ذخیره شد", `<p>پرونده ${escapeHtml(result.patient.name)} ساخته شد. لینک زیر را تا ${date(result.expiresAt)} در اختیار بیمار قرار دهید تا حسابش را فعال کند.</p><div class="invite-link" dir="ltr">${escapeHtml(link)}</div><button id="copy-invite" class="primary" data-link="${escapeHtml(link)}">کپی لینک فعال‌سازی</button>`); }
    else if(form.id==='plan-event-form'){await submitPlanEvent(form);}
    else if(form.id==='note-form'){await api('note.create',{patientId:state.patientId,text:form.elements.text.value});await loadPatientData();await renderDetail();toast('یادداشت ذخیره شد.');}
    else if (form.id === "patient-profile-form") { await api("patient.profile", { patientId: state.patientId, ...Object.fromEntries(new FormData(form)) }); closeModal(); await loadPatientData(); await openPatient(state.patientId, "record"); toast("اطلاعات پرونده ذخیره شد."); }
    else if (form.id === "patient-file-form") { const category = form.elements.category.value, files = [...form.elements.patientFiles.files]; const data = new FormData(); data.set("op", "patient.file.add"); data.set("patientId", state.patientId); data.set(`description:${category}`, form.elements.description.value); files.forEach(file => data.append(`file:${category}`, file)); await api("patient.file.add", data); await loadPatientData(); await renderDetail(); toast("فایل‌ها به پرونده اضافه شدند."); }
    else if (form.id === "step-form") { const dueAt = DantoPlanner.at(form.elements.namedItem("dueAt").value); await api("step.create", { patientId: state.patientId, title: form.elements.namedItem("title").value, detail: form.elements.namedItem("detail").value, dueAt }); closeModal(); await loadPatientData(); await renderDetail(); toast("مرحله جدید اضافه شد."); }
    else if (form.id === "review-form") { await api("scan.review", { patientId: state.patientId, scanId: form.dataset.scanId, note: form.elements.namedItem("note").value }); closeModal(); await loadPatientData(); await renderDetail(); toast("نظر پزشک ثبت شد."); }
    else if (form.id === "message-form") { await api("message", { patientId: myPatientId(), text: $("#message-text").value, kind: $("#message-urgent").checked ? "urgent" : "normal" }); await loadPatientData(); if (state.user.role === "doctor") await renderDetail(); else await renderPatient(); toast("پیام ارسال شد."); }
    else if (form.id === "scan-form") { const data = new FormData(form); data.append("op", "scan.create"); await api("scan.create", data); await loadPatientData(); await renderPatient(); toast("تصاویر برای پزشک ارسال شدند."); }
    else if (form.id === "settings-form") { const settings = Object.fromEntries(["messages","scans","roadmap"].map(key => [key, form.elements[key].checked])); await api("settings", { settings }); toast("تنظیمات ذخیره شد."); }
  } catch (error) { showError(error); }
  finally { if (button) button.disabled = false; }
});
document.addEventListener("click", async event => { const copy = event.target.closest("#copy-invite"); if (copy) { try { await navigator.clipboard.writeText(copy.dataset.link); toast("لینک دعوت کپی شد."); } catch { toast("لینک را از کادر بالا کپی کنید."); } } });
document.addEventListener("input", event => { if (event.target.id === "patient-search") $("#patient-rows").innerHTML = patientRows(); });
document.addEventListener("change", event => { if(event.target.id==="patient-sort"){state.patientSort=event.target.value;$("#patient-rows").innerHTML=patientRows();} if (event.target.id === "compare-before" || event.target.id === "compare-after") $(`#${event.target.id}-image`).src = imageUrl(event.target.value); if (event.target.name === "treatmentType" && event.target.closest("#patient-create-form")) { const aligner = event.target.value === "aligner"; $(".aligner-count-field").hidden = !aligner; $(".aligner-count-field input").required = aligner; } if (event.target.type === "file") { const label = document.getElementById(`file-${event.target.name}`); if (label) label.textContent = event.target.files[0]?.name || "انتخاب تصویر"; if (event.target.name.startsWith("file:")) { const slot = event.target.name.slice(5), list = $(`[data-selected-files="${slot}"]`); if(list){(list.previewUrls||[]).forEach(url=>URL.revokeObjectURL(url));list.previewUrls=[];list.innerHTML=[...event.target.files].map(file=>{const src=file.type.startsWith('image/')?URL.createObjectURL(file):'';if(src)list.previewUrls.push(src);return '<div class="selected-file-preview">'+(src?'<img src="'+src+'" alt="پیش‌نمایش فایل">':'<span>▣</span>')+'<span>'+escapeHtml(file.name)+'</span></div>';}).join('')||'فایلی انتخاب نشده است.';} } } if (event.target.name === "category" && event.target.closest("#patient-file-form")) { const slot = PATIENT_FILE_SLOTS.find(item => item[0] === event.target.value); if (slot) { const picker = $("#patient-file-form input[type=file]"); picker.accept = slot[3]; picker.value = ""; } } });
$("#modal-layer").addEventListener("click", event => { if (event.target.id === "modal-layer") closeModal(); });
authMode(new URL(location.href).searchParams.has("invite") ? "accept" : "login");
api("me").then(async result => { state.user = result.user; await enter(); }).catch(() => showShell("login-screen"));
setInterval(async () => { if (!state.user || document.hidden) return; await refreshNotifications(); if (state.user.role === "patient" && state.patientView === "messages") { await loadPatientData(); await renderPatient(); } if (state.user.role === "doctor" && state.patientId && state.detailTab === "communication" && !$("#patient-detail").hidden) { await loadPatientData(); await renderDetail(); } }, 30000);
