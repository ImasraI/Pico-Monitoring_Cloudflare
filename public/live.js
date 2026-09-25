const $ = (selector, root = document) => root.querySelector(selector);
const state = { user: null, mode: "login", doctorView: "patients", patientView: "home", detailTab: "overview", patientId: null, patientName: "", profile: null, schedule: null, files: [], wizardStep: 1, patients: [], patientRecords: [], patientFilter: "all", steps: [], scans: [], messages: [], notifications: [], settings: null };
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const date = value => value ? new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(Number(value))) : "—";
const time = value => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(Number(value))) : "—";
const initial = name => String(name || "ب").trim()[0] || "ب";
const imageUrl = id => `/api?op=image&imageId=${encodeURIComponent(id)}`;
const title = (a, b = "") => `<div class="view-title"><h2>${a}</h2>${b ? `<p>${b}</p>` : ""}</div>`;
const empty = message => `<div class="empty"><b>${message}</b></div>`;
const number = value => new Intl.NumberFormat("fa-IR").format(value);
const myPatientId = () => state.user?.role === "patient" ? state.user.id : state.patientId;
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
function modal(heading, content) { $("#modal-title").textContent = heading; $("#modal-body").innerHTML = content; $("#modal-layer").hidden = false; }
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
    $("#doctor-account-name").textContent = state.user.name;
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
  state.steps = steps.steps; state.scans = scans.scans; state.messages = messages.messages;
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
  return `<div class="roadmap">${state.steps.map(step => `<article class="roadmap-item ${step.completed_at ? "done" : step.id === next?.id ? "current" : ""}"><div class="roadmap-dot">${step.completed_at ? "✓" : number(step.position)}</div><div class="roadmap-body"><div class="row"><b>${escapeHtml(step.title)}</b><span>${step.completed_at ? `+${number(step.points_awarded)} امتیاز` : date(step.due_at)}</span></div>${step.detail ? `<p>${escapeHtml(step.detail)}</p>` : ""}<small>${step.completed_at ? `انجام شد: ${time(step.completed_at)}` : step.id === next?.id ? "مرحله جاری" : "پس از مرحله قبل فعال می‌شود"}</small>${!isDoctor && step.id === next?.id ? `<button class="primary small" data-complete-step="${step.id}">ثبت انجام مرحله</button>` : ""}</div></article>`).join("")}</div>`;
}
function scanGallery() {
  if (!state.scans.length) return empty("هنوز تصویری ارسال نشده است.");
  return `<div class="scan-history">${state.scans.map(scan => `<article class="panel"><div class="row"><b>اسکن ${date(scan.created_at)}</b><span class="status ${scan.status === "reviewed" ? "good" : "review"}">${scan.status === "reviewed" ? "بررسی‌شده" : "در انتظار بررسی"}</span></div><div class="scan-thumbs">${scan.images.map(image => `<button class="image-button" data-view-image="${image.id}" aria-label="نمایش تصویر"><img src="${imageUrl(image.id)}" alt="نمای ${escapeHtml(({ front: "روبرو", right: "راست", left: "چپ" })[image.view] || image.view)}" loading="lazy"><small>${escapeHtml(({ front: "روبرو", right: "راست", left: "چپ" })[image.view] || image.view)}</small></button>`).join("")}</div>${scan.doctor_note ? `<p class="note">نظر پزشک: ${escapeHtml(scan.doctor_note)}</p>` : ""}${state.user.role === "doctor" ? `<button class="outline small" data-review-scan="${scan.id}">ثبت نظر پزشک</button>` : ""}</article>`).join("")}</div>`;
}
function compareHtml() {
  const images = state.scans.flatMap(scan => scan.images.map(image => ({ ...image, created_at: scan.created_at })));
  if (images.length < 2) return empty("برای مقایسه، دست‌کم دو تصویر از اسکن‌های مختلف لازم است.");
  const options = images.map(image => `<option value="${image.id}">${date(image.created_at)} · ${escapeHtml(({ front: "روبرو", right: "راست", left: "چپ" })[image.view] || image.view)}</option>`).join("");
  return `<div class="panel"><h2>مقایسه تصاویر قبل و بعد</h2><p class="muted">دو تصویر را انتخاب کنید تا کنار هم ببینید. برای مقایسه دقیق‌تر زاویه‌های یکسان را انتخاب کنید.</p><div class="compare-grid"><div><label for="compare-before">تصویر قبل</label><select id="compare-before">${options}</select><img id="compare-before-image" src="${imageUrl(images[images.length - 1].id)}" alt="تصویر قبل"></div><div><label for="compare-after">تصویر بعد</label><select id="compare-after">${options}</select><img id="compare-after-image" src="${imageUrl(images[0].id)}" alt="تصویر بعد"></div></div></div>`;
}
function syncCompare() { for (const side of ["before", "after"]) { const selector = $(`#compare-${side}`); if (!selector) continue; if (side === "before") selector.value = selector.options[selector.options.length - 1].value; $(`#compare-${side}-image`).src = imageUrl(selector.value); } }
function chatHtml() {
  return `<div class="panel"><h2>گفت‌وگو با ${state.user.role === "doctor" ? "بیمار" : "پزشک"}</h2><p class="muted">پیام‌های فوری در پنل با برچسب مشخص می‌شوند. برای وضعیت پزشکی اورژانسی از خدمات اورژانس استفاده کنید.</p><div class="chat">${state.messages.length ? state.messages.map(message => `<article class="bubble ${message.sender_id === state.user.id ? "me" : ""}">${message.kind === "urgent" ? `<b class="urgent-label">فوری</b>` : ""}<div>${escapeHtml(message.body)}</div><small>${time(message.created_at)}${message.sender_id === state.user.id ? ` · ${message.read_at ? "دیده شد" : "ارسال شد"}` : ""}</small></article>`).join("") : empty("هنوز پیامی ردوبدل نشده است.")}</div><form id="message-form" class="message-compose"><label for="message-text">پیام جدید</label><textarea id="message-text" maxlength="2000" required placeholder="متن پیام را بنویسید..."></textarea><label class="check-line"><input type="checkbox" id="message-urgent"> پیام فوری</label><button class="primary" type="submit">ارسال پیام</button></form></div>`;
}
async function renderDoctor() {
  showShell("doctor-app");
  $("#add-patient").hidden = state.doctorView === "wizard";
  document.querySelectorAll("[data-doctor-view]").forEach(el => el.classList.toggle("active", el.dataset.doctorView === state.doctorView));
  const root = $("#doctor-content");
  if (state.doctorView === "wizard") { root.innerHTML = wizardHtml(); updateWizardStep(1); return; }
  if (state.doctorView === "patients") {
    state.patientRecords = await Promise.all(state.patients.map(async patient => { const [steps, scans, messages] = await Promise.all([api("steps", null, { patientId: patient.id }), api("scans", null, { patientId: patient.id }), api("messages", null, { patientId: patient.id })]); return { patient, steps: steps.steps, scans: scans.scans, messages: messages.messages }; }));
    const pending = state.patientRecords.reduce((sum, record) => sum + record.scans.filter(scan => scan.status === "new").length, 0);
    const done = state.patientRecords.reduce((sum, record) => sum + record.steps.filter(step => step.completed_at).length, 0);
    root.innerHTML = `<div class="doctor-summary"><div><p class="eyebrow">مدیریت پایش درمان</p><h2>بیماران من</h2><p>پرونده، مسیر درمان، اسکن‌ها و پیام‌های بیماران را از اینجا پیگیری کنید.</p></div><div class="summary-counts"><div><strong>${number(state.patients.length)}</strong><span>همه بیماران</span></div><div><strong>${number(pending)}</strong><span>اسکن نیازمند بررسی</span></div><div><strong>${number(done)}</strong><span>مراحل انجام‌شده</span></div></div></div><div class="doctor-toolbar"><div class="filter-tabs" role="group" aria-label="فیلتر بیماران"><button data-patient-filter="all" class="${state.patientFilter === "all" ? "active" : ""}">همه بیماران</button><button data-patient-filter="pending" class="${state.patientFilter === "pending" ? "active" : ""}">نیازمند بررسی <span>${number(pending)}</span></button></div><label class="search">⌕ <input id="patient-search" placeholder="جست‌وجوی نام یا ایمیل" autocomplete="off"></label></div><div class="patient-list-head"><h2>فهرست بیماران</h2><span>${number(state.patients.length)} پرونده</span></div><div class="patient-card-list" id="patient-rows">${patientRows()}</div>`;
  } else if (state.doctorView === "settings") {
    await renderSettings(root);
  } else {
    const records = await Promise.all(state.patients.map(async patient => ({ patient, steps: (await api("steps", null, { patientId: patient.id })).steps, messages: (await api("messages", null, { patientId: patient.id })).messages, scans: (await api("scans", null, { patientId: patient.id })).scans })));
    if (state.doctorView === "tasks") root.innerHTML = title("مراحل درمان", "مراحل بعدی بیماران") + (records.length ? `<div class="task-list">${records.flatMap(record => record.steps.filter(step => !step.completed_at).map(step => `<article class="task-card"><span class="roadmap-dot">${number(step.position)}</span><div><b>${escapeHtml(step.title)}</b><small>${escapeHtml(record.patient.name)} · موعد ${date(step.due_at)}</small></div><button class="outline small" data-open-patient="${record.patient.id}" data-open-tab="plan">پرونده</button></article>`)).join("") || empty("مرحله باز وجود ندارد.")}</div>` : empty("هنوز بیماری ثبت نشده است."));
    if (state.doctorView === "messages") root.innerHTML = title("پیام‌ها", "گفت‌وگوهای بیماران") + (records.length ? `<div class="message-list">${records.map(record => `<article class="task-card"><div><b>${escapeHtml(record.patient.name)}</b><small>${record.messages.length ? `${record.messages.at(-1).kind === "urgent" ? "فوری · " : ""}${escapeHtml(record.messages.at(-1).body.slice(0, 120))}` : "هنوز پیامی نیست"}</small></div><button class="outline small" data-open-patient="${record.patient.id}" data-open-tab="communication">گفت‌وگو</button></article>`).join("")}</div>` : empty("هنوز بیماری ثبت نشده است."));
    if (state.doctorView === "insights") { const scans = records.flatMap(record => record.scans), steps = records.flatMap(record => record.steps); root.innerHTML = title("آمار درمان", "بر پایه داده‌های ثبت‌شده در همین سامانه") + `<div class="metrics"><article><div><small>بیماران</small><strong>${number(records.length)}</strong></div></article><article><div><small>اسکن‌ها</small><strong>${number(scans.length)}</strong></div></article><article><div><small>اسکن‌های بررسی‌نشده</small><strong>${number(scans.filter(s => s.status === "new").length)}</strong></div></article><article><div><small>مراحل انجام‌شده</small><strong>${number(steps.filter(s => s.completed_at).length)} / ${number(steps.length)}</strong></div></article></div>`; }
  }
}
function patientRows() {
  const term = $("#patient-search")?.value.trim().toLowerCase() || "";
  const records = state.patientRecords.filter(record => `${record.patient.name} ${record.patient.email}`.toLowerCase().includes(term) && (state.patientFilter !== "pending" || record.scans.some(scan => scan.status === "new")));
  return records.length ? records.map(({ patient, steps, scans, messages }) => {
    const pending = scans.filter(scan => scan.status === "new").length;
    const done = steps.filter(step => step.completed_at).length;
    const latest = scans[0];
    const awaiting = patient.treatment_type && !patient.activated_at;
    return `<article class="patient-card"><div class="patient-card-identity"><span class="avatar">${escapeHtml(initial(patient.name))}</span><div><h3>${escapeHtml(patient.name)}</h3><small>${escapeHtml(patient.email)}</small><span class="status ${pending || awaiting ? "review" : "good"}">${awaiting ? "در انتظار فعال‌سازی حساب" : pending ? `${number(pending)} اسکن در انتظار بررسی` : "در حال پیگیری"}</span></div></div><div class="patient-card-facts"><div><small>آخرین اسکن</small><b>${latest ? date(latest.created_at) : "هنوز ثبت نشده"}</b></div><div><small>مسیر درمان</small><b>${number(done)} از ${number(steps.length)} مرحله</b></div><div><small>پیام‌ها</small><b>${number(messages.length)}</b></div></div><div class="patient-card-actions"><button class="primary small" data-open-patient="${patient.id}">مشاهده پرونده</button><button class="outline small" data-open-patient="${patient.id}" data-open-tab="record">فایل‌ها</button></div></article>`;
  }).join("") : empty(state.patients.length ? "بیماری با این فیلتر پیدا نشد." : "هنوز بیماری اضافه نشده است. با دکمه افزودن بیمار، دعوت‌نامه بسازید.");
}
async function openPatient(id, tab = "overview") {
  state.patientId = id; state.detailTab = tab;
  const patient = (await api("patient", null, { patientId: id })).patient;
  state.patientName = patient.name;
  await loadPatientData();
  $("#detail-name").textContent = patient.name;
  $("#detail-meta").textContent = `${patient.email}${state.profile?.treatment_type ? ` · ${state.profile.treatment_type === "aligner" ? "الاینر شفاف" : "براکت ثابت"}` : ""}`;
  $(".detail-status").textContent = state.profile?.treatment_type && !state.profile?.activated_at ? "در انتظار فعال‌سازی" : "در حال پیگیری";
  $("#detail-avatar").textContent = initial(patient.name);
  $("#detail-score").textContent = number(points());
  $("#detail-last-scan").textContent = state.scans.length ? date(state.scans[0].created_at) : "هنوز ثبت نشده";
  $("#detail-progress").textContent = `${number(completed())} از ${number(state.steps.length)} مرحله`;
  await renderDetail();
}
function detailOverviewHtml() {
  const next = state.steps.find(step => !step.completed_at);
  const recentScans = state.scans.slice(0, 3);
  const lastMessage = state.messages.at(-1);
  return `<div class="detail-overview-grid"><aside class="detail-info-column"><section class="panel"><p class="eyebrow">در یک نگاه</p><h2>وضعیت درمان</h2><div class="detail-progress-row"><strong>${number(completed())} / ${number(state.steps.length)}</strong><span>مراحل انجام‌شده</span></div><div class="progress"><i style="width:${state.steps.length ? completed() / state.steps.length * 100 : 0}%"></i></div><div class="info-row"><span>امتیاز کسب‌شده</span><b>${number(points())}</b></div><div class="info-row"><span>اسکن‌های ثبت‌شده</span><b>${number(state.scans.length)}</b></div><div class="info-row"><span>پیام‌ها</span><b>${number(state.messages.length)}</b></div></section><section class="panel"><div class="row"><h2>مرحله بعدی</h2><button class="link-btn" data-detail-tab="plan">همه مراحل</button></div>${next ? `<b>${escapeHtml(next.title)}</b><p class="muted">موعد ${date(next.due_at)}</p>` : `<p class="muted">${state.steps.length ? "همه مراحل ثبت‌شده انجام شده‌اند." : "هنوز مرحله‌ای تعریف نشده است."}</p>`}<button class="outline small" data-detail-tab="plan">مشاهده مسیر درمان</button></section></aside><section class="detail-monitor-column"><div class="panel"><div class="row"><div><p class="eyebrow">پایش درمان</p><h2>اسکن‌های اخیر</h2></div><button class="link-btn" data-detail-tab="monitoring">همه اسکن‌ها</button></div>${recentScans.length ? `<div class="scan-timeline">${recentScans.map(scan => `<article><span class="timeline-dot"></span><div><b>${date(scan.created_at)}</b><small>${number(scan.images.length)} تصویر · ${scan.status === "reviewed" ? "بررسی‌شده" : "در انتظار بررسی"}</small></div><button class="outline small" data-detail-tab="monitoring">مشاهده</button></article>`).join("")}</div>` : empty("هنوز اسکن ثبت نشده است.")}</div><div class="panel"><div class="row"><h2>مسیر درمان</h2><button class="link-btn" data-detail-tab="plan">ویرایش مسیر</button></div>${roadmapHtml(true)}</div></section><aside class="detail-chat-column"><div class="panel"><div class="row"><h2>ارتباط با بیمار</h2><span class="chat-count">${number(state.messages.length)} پیام</span></div>${lastMessage ? `<div class="message-preview"><small>${time(lastMessage.created_at)}${lastMessage.kind === "urgent" ? " · فوری" : ""}</small><p>${escapeHtml(lastMessage.body)}</p></div>` : empty("هنوز پیامی ردوبدل نشده است.")}<button class="primary" data-detail-tab="communication">باز کردن گفت‌وگو</button></div><div class="panel"><h2>مقایسه تصاویر</h2><p class="muted">تصاویر ثبت‌شده را کنار هم بررسی کنید.</p><button class="outline" data-detail-tab="compare">مشاهده قبل و بعد</button></div></aside></div>`;
}
async function renderDetail() {
  showShell("patient-detail");
  $("#detail-score").textContent = number(points());
  $("#detail-last-scan").textContent = state.scans.length ? date(state.scans[0].created_at) : "هنوز ثبت نشده";
  $("#detail-progress").textContent = `${number(completed())} از ${number(state.steps.length)} مرحله`;
  document.querySelectorAll("[data-detail-tab]").forEach(el => el.classList.toggle("active", el.dataset.detailTab === state.detailTab));
  const root = $("#detail-content");
  if (state.detailTab === "overview") { root.innerHTML = detailOverviewHtml(); const firstPhoto = state.files.find(file => file.category === "oral" && file.mime.startsWith("image/")); $(".detail-info-column", root).insertAdjacentHTML("beforeend", `<section class="panel"><div class="row"><h2>برنامه و پرونده اولیه</h2><button class="link-btn" data-detail-tab="record">پرونده کامل</button></div><div class="info-row"><span>اسکن بعدی</span><b>${date(state.profile?.next_scan_at)}</b></div><div class="info-row"><span>ویزیت بعدی</span><b>${date(state.profile?.next_visit_at)}</b></div>${firstPhoto ? `<img class="initial-clinical-photo" src="${patientFileUrl(firstPhoto.id)}" alt="تصویر اولیه دهان" loading="lazy">` : `<p class="muted">تصویر اولیه دهان هنوز ثبت نشده است.</p>`}</section>`); }
  else if (state.detailTab === "record") { root.innerHTML = recordHtml(); if (state.profile?.treatment_type && !state.profile?.activated_at) root.insertAdjacentHTML("afterbegin", `<div class="activation-banner"><div><b>حساب بیمار هنوز فعال نشده است</b><p>لینک فعال‌سازی را دوباره بسازید و به بیمار بدهید.</p></div><button class="primary small" id="renew-patient-invite">ساخت لینک جدید</button></div>`); }
  else if (state.detailTab === "plan") root.innerHTML = title("مسیر درمان", "مراحل را به ترتیب برای بیمار تعریف کنید؛ انجام به‌موقع هر مرحله ۱۰ امتیاز دارد.") + `<button class="primary" id="create-step">+ مرحله جدید</button><div class="panel" style="margin-top:15px">${roadmapHtml(true)}</div>`;
  else if (state.detailTab === "monitoring") root.innerHTML = title("اسکن‌ها", "تصاویر ارسالی بیمار و نظر پزشک") + scanGallery();
  else if (state.detailTab === "compare") { root.innerHTML = title("قبل و بعد") + compareHtml(); syncCompare(); }
  else if (state.detailTab === "communication") { root.innerHTML = title("ارتباط با بیمار") + chatHtml(); await api("messages.read", { patientId: state.patientId }); }
}
async function renderPatient() {
  showShell("patient-app");
  document.querySelectorAll("[data-patient-view]").forEach(el => el.classList.toggle("active", el.dataset.patientView === state.patientView));
  const headings = { home: `سلام ${state.user.name}!`, roadmap: "مسیر درمان من", scans: "اسکن‌ها", messages: "پیام‌ها", profile: "حساب من" };
  $("#patient-page-title").textContent = headings[state.patientView];
  const root = $("#patient-content");
  const next = state.steps.find(step => !step.completed_at);
  if (state.patientView === "home") root.innerHTML = `<div class="patient-welcome"><div class="treatment-card"><span class="stage-pill">مسیر درمان</span><h2>${next ? escapeHtml(next.title) : state.steps.length ? "همه مراحل انجام شده‌اند" : "در انتظار برنامه پزشک"}</h2><p>${next ? `موعد مرحله: ${date(next.due_at)}` : "مراحل درمان را در پنل مسیر مشاهده کنید."}</p><div class="treatment-progress"><div><span>پیشرفت مراحل</span><span>${number(completed())} از ${number(state.steps.length)}</span></div><div class="progress"><i style="width:${state.steps.length ? completed() / state.steps.length * 100 : 0}%"></i></div></div></div><div class="scan-callout"><span class="scan-date">پایش درمان</span><h2>ارسال اسکن جدید</h2><p>تصویرهای روبرو، راست و چپ را برای پزشک خود بفرستید.</p><button class="primary" data-patient-view="scans">رفتن به اسکن‌ها</button></div></div><div class="patient-stats"><article class="patient-stat"><small>امتیاز من</small><strong>${number(points())}</strong></article><article class="patient-stat"><small>اسکن‌های ارسالی</small><strong>${number(state.scans.length)}</strong></article><article class="patient-stat"><small>پیام‌ها</small><strong>${number(state.messages.length)}</strong></article></div><div class="patient-grid"><div class="panel"><div class="row"><h2>مرحله بعدی</h2><button class="link-btn" data-patient-view="roadmap">همه مراحل</button></div>${next ? `<b>${escapeHtml(next.title)}</b><p>${escapeHtml(next.detail)}</p><p class="muted">موعد: ${date(next.due_at)}</p>` : empty("مرحله بازی وجود ندارد.")}</div><div class="panel"><div class="row"><h2>آخرین پیام</h2><button class="link-btn" data-patient-view="messages">گفت‌وگو</button></div>${state.messages.length ? `<p>${escapeHtml(state.messages.at(-1).body)}</p><small>${time(state.messages.at(-1).created_at)}</small>` : empty("هنوز پیامی ندارید.")}</div></div>`;
  if (state.patientView === "home") {
    const latest = state.scans[0];
    root.innerHTML = `<div class="patient-profile-card"><span class="patient-profile-avatar">${escapeHtml(initial(state.user.name))}</span><div><small>پنل پایش درمان</small><h2>${escapeHtml(state.user.name)}</h2><p>${escapeHtml(state.user.email)}</p></div><button class="outline small" data-patient-view="profile">پروفایل</button></div>` + root.innerHTML + `<section class="patient-recent-scans panel"><div class="row"><h2>اسکن‌های قبلی</h2><button class="link-btn" data-patient-view="scans">مشاهده همه</button></div>${latest ? `<div class="recent-scan-summary"><span class="status ${latest.status === "reviewed" ? "good" : "review"}">${latest.status === "reviewed" ? "بررسی‌شده" : "در انتظار بررسی"}</span><b>آخرین اسکن: ${date(latest.created_at)}</b><div class="recent-scan-images">${latest.images.slice(0, 3).map(image => `<button class="image-button" data-view-image="${image.id}" aria-label="نمایش تصویر اسکن"><img src="${imageUrl(image.id)}" alt="تصویر اسکن" loading="lazy"></button>`).join("")}</div></div>` : empty("هنوز تصویری ارسال نشده است.")}</section>`;
    if (state.schedule?.next_scan_at) $(".scan-date", root).textContent = `اسکن بعدی: ${date(state.schedule.next_scan_at)}`;
    if (state.schedule?.next_visit_at) $(".patient-grid", root).insertAdjacentHTML("beforeend", `<div class="panel"><h2>ویزیت بعدی</h2><b>${date(state.schedule.next_visit_at)}</b><p class="muted">زمان برنامه‌ریزی‌شده توسط پزشک</p></div>`);
  } else if (state.patientView === "roadmap") root.innerHTML = `<div class="roadmap-intro"><span>مسیر درمان من</span><strong>${number(completed())} از ${number(state.steps.length)} مرحله</strong><div class="progress"><i style="width:${state.steps.length ? completed() / state.steps.length * 100 : 0}%"></i></div></div>` + title("برنامه گام‌به‌گام", "هر مرحله را پس از انجام ثبت کنید. انجام تا موعد تعیین‌شده ۱۰ امتیاز دارد.") + `<div class="patient-stats"><article class="patient-stat"><small>امتیاز</small><strong>${number(points())}</strong></article><article class="patient-stat"><small>انجام‌شده</small><strong>${number(completed())}</strong></article><article class="patient-stat"><small>کل مراحل</small><strong>${number(state.steps.length)}</strong></article></div><div class="panel">${roadmapHtml(false)}</div>`;
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
const inputDate = value => value ? new Date(Number(value)).toISOString().slice(0, 10) : "";
function fileSlotHtml([key, label, hint, accept], compact = false) { return `<div class="record-upload-slot"><div><b>${label}</b><small>${hint}</small></div><label class="record-file-pick">+ انتخاب فایل<input type="file" name="file:${key}" accept="${accept}" multiple></label>${compact ? "" : `<div class="selected-files" data-selected-files="${key}">فایلی انتخاب نشده است.</div><input name="description:${key}" maxlength="500" placeholder="توضیح این فایل‌ها (اختیاری)">`}</div>`; }
function wizardHtml() {
  const names = ["مشخصات بیمار", "پرونده تصویری", "برنامه‌ریزی درمان", "تأیید و ذخیره"];
  return `<div class="wizard-head"><div><p class="eyebrow">تشکیل پرونده و دعوت‌نامه</p><h2>افزودن بیمار جدید</h2><p>مشخصات، فایل‌های اولیه و برنامهٔ درمان را در یک پرونده ثبت کنید.</p></div><button class="outline" id="wizard-cancel">انصراف</button></div><nav class="wizard-stepper" aria-label="مراحل افزودن بیمار">${names.map((name, index) => `<span data-wizard-marker="${index + 1}"><i>${number(index + 1)}</i>${name}</span>`).join("")}</nav><form id="patient-create-form"><section class="wizard-panel" data-wizard-panel="1"><h3>مشخصات اولیه بیمار</h3><div class="wizard-fields"><label>نام و نام خانوادگی *<input name="name" required minlength="2" maxlength="100" autocomplete="off" placeholder="مثال: نیما شریفی"></label><label>ایمیل بیمار برای فعال‌سازی حساب *<input name="email" type="email" required autocomplete="off" placeholder="name@example.com" dir="ltr"></label><label>تاریخ تولد <small>اختیاری</small><input name="birthDate" type="date"></label><label>شماره تماس <small>اختیاری</small><input name="phone" inputmode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹"></label><label>جنسیت <small>اختیاری</small><select name="gender"><option value="">انتخاب نشده</option><option value="female">زن</option><option value="male">مرد</option></select></label><label>نوع درمان *<select name="treatmentType" required><option value="">انتخاب نوع درمان</option><option value="aligner">الاینر شفاف</option><option value="bracket">براکت ثابت</option></select></label><label class="aligner-count-field" hidden>تعداد کل الاینرها *<input name="alignerCount" type="number" min="1" max="120" placeholder="مثال: ۱۵"></label><label class="full">یادداشت اولیه پزشک <small>اختیاری</small><textarea name="doctorNote" maxlength="2000" rows="4" placeholder="شکایت اصلی، سابقه یا نکات مهم برای شروع درمان..."></textarea></label></div></section><section class="wizard-panel" data-wizard-panel="2" hidden><h3>پرونده تصویری و فایل‌های اولیه</h3><p class="muted">بارگذاری اختیاری است. پس از ساخت پرونده نیز می‌توانید فایل اضافه کنید. حداکثر ۱۲ فایل، هرکدام ۱۰ مگابایت و مجموعاً ۳۰ مگابایت.</p><h4>پرونده‌های بالینی اولیه</h4><div class="record-upload-grid">${PATIENT_FILE_SLOTS.slice(0, 6).map(slot => fileSlotHtml(slot)).join("")}</div><h4>فایل‌های طرح درمان</h4><div class="record-upload-grid">${PATIENT_FILE_SLOTS.slice(6).map(slot => fileSlotHtml(slot)).join("")}</div></section><section class="wizard-panel" data-wizard-panel="3" hidden><h3>برنامه‌ریزی درمان</h3><p class="muted">تاریخ‌های اولیه و نخستین مرحلهٔ مسیر درمان را ثبت کنید. بعداً از پرونده قابل تغییر است.</p><div class="wizard-fields"><label>اسکن بعدی <small>اختیاری</small><input name="nextScanAt" type="date"></label><label>ویزیت بعدی <small>اختیاری</small><input name="nextVisitAt" type="date"></label><label>عنوان مرحلهٔ اول مسیر درمان <small>اختیاری</small><input name="roadmapTitle" maxlength="100" placeholder="مثال: ارسال اسکن هفتگی"></label><label>موعد مرحلهٔ اول<input name="roadmapDueAt" type="date"></label><label class="full">توضیح مرحلهٔ اول<textarea name="roadmapDetail" maxlength="500" rows="3" placeholder="کاری که بیمار باید انجام دهد..."></textarea></label><label class="full">توضیحات برنامهٔ درمان<textarea name="planNote" maxlength="2000" rows="4" placeholder="هدف‌ها و نکات برنامهٔ درمان..."></textarea></label></div></section><section class="wizard-panel" data-wizard-panel="4" hidden><h3>مرور و تأیید پرونده</h3><div id="wizard-review" class="wizard-review"></div><p class="muted">پس از ذخیره، لینک فعال‌سازی ساخته می‌شود. آن را در اختیار بیمار قرار دهید؛ اعتبار لینک ۷ روز است.</p></section><div class="wizard-foot"><button type="button" class="outline" id="wizard-prev" hidden>مرحله قبل</button><span id="wizard-hint"></span><button type="button" class="primary" id="wizard-next">مرحله بعد</button><button type="submit" class="primary" id="wizard-save" hidden>ذخیره بیمار و ساخت دعوت‌نامه</button></div></form>`;
}
function wizardDirty() { const form = $("#patient-create-form"); return Boolean(form && [...form.querySelectorAll("input,select,textarea")].some(input => input.type === "file" ? input.files.length : input.value)); }
function updateWizardStep(step) {
  const form = $("#patient-create-form"); if (!form) return;
  if (step > state.wizardStep) {
    const panel = $(`[data-wizard-panel="${state.wizardStep}"]`, form);
    for (const input of panel.querySelectorAll("input,select,textarea")) if (!input.checkValidity()) { input.reportValidity(); return; }
    if (state.wizardStep === 2) { const files = [...form.querySelectorAll('input[type="file"]')].flatMap(input => [...input.files]); if (files.length > 12 || files.reduce((sum, file) => sum + file.size, 0) > 30_000_000 || files.some(file => file.size > 10_000_000)) { toast("حداکثر ۱۲ فایل، هر فایل ۱۰ مگابایت و مجموعاً ۳۰ مگابایت مجاز است."); return; } }
    if (state.wizardStep === 3 && Boolean(form.elements.roadmapTitle.value.trim()) !== Boolean(form.elements.roadmapDueAt.value)) { toast("برای مرحلهٔ اول، عنوان و موعد را با هم وارد کنید."); return; }
  }
  state.wizardStep = step;
  form.querySelectorAll("[data-wizard-panel]").forEach(panel => panel.hidden = Number(panel.dataset.wizardPanel) !== step);
  document.querySelectorAll("[data-wizard-marker]").forEach(marker => marker.classList.toggle("active", Number(marker.dataset.wizardMarker) === step));
  $("#wizard-prev").hidden = step === 1; $("#wizard-next").hidden = step === 4; $("#wizard-save").hidden = step !== 4;
  $("#wizard-hint").textContent = ["موارد ستاره‌دار الزامی هستند.", "فایل‌ها اختیاری‌اند.", "برنامه را می‌توانید بعداً ویرایش کنید.", "اطلاعات پیش از ذخیره بررسی شود."][step - 1];
  if (step === 4) { const files = [...form.querySelectorAll('input[type="file"]')].flatMap(input => [...input.files]); const row = (label, value) => `<div><span>${label}</span><b>${escapeHtml(value || "—")}</b></div>`; $("#wizard-review").innerHTML = row("نام بیمار", form.elements.name.value) + row("ایمیل", form.elements.email.value) + row("نوع درمان", form.elements.treatmentType.selectedOptions[0]?.textContent) + row("تعداد فایل‌ها", `${number(files.length)} فایل`) + row("اسکن بعدی", form.elements.nextScanAt.value ? date(new Date(form.elements.nextScanAt.value).getTime()) : "") + row("ویزیت بعدی", form.elements.nextVisitAt.value ? date(new Date(form.elements.nextVisitAt.value).getTime()) : "") + row("مرحلهٔ اول", form.elements.roadmapTitle.value); }
  $("#doctor-content").scrollIntoView({ block: "start", behavior: "smooth" });
}
function recordHtml() {
  const p = state.profile || {}, label = Object.fromEntries(PATIENT_FILE_SLOTS.map(slot => [slot[0], slot[1]]));
  const files = state.files.length ? `<div class="record-file-grid">${state.files.map(file => `<article class="record-file-card">${file.mime.startsWith("image/") ? `<img src="${patientFileUrl(file.id)}" alt="${escapeHtml(file.name)}" loading="lazy">` : `<span class="record-file-icon">▣</span>`}<div><small>${escapeHtml(label[file.category] || "سایر فایل‌ها")}</small><b title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</b><span>${date(file.created_at)}</span>${file.description ? `<p>${escapeHtml(file.description)}</p>` : ""}</div><div class="record-file-actions"><a class="outline small" href="${patientFileUrl(file.id)}" target="_blank" rel="noopener">نمایش / دانلود</a><button class="outline small" data-delete-patient-file="${file.id}">حذف</button></div></article>`).join("")}</div>` : empty("هنوز فایلی برای این بیمار ثبت نشده است.");
  return `<div class="record-layout"><section class="panel"><div class="row"><h2>مشخصات و برنامهٔ درمان</h2><button class="outline small" id="edit-patient-profile">ویرایش اطلاعات</button></div><div class="info-row"><span>نوع درمان</span><b>${p.treatment_type === "aligner" ? "الاینر شفاف" : p.treatment_type === "bracket" ? "براکت ثابت" : "ثبت نشده"}</b></div>${p.aligner_count ? `<div class="info-row"><span>تعداد الاینرها</span><b>${number(p.aligner_count)}</b></div>` : ""}<div class="info-row"><span>تاریخ تولد</span><b>${p.birth_date ? date(new Date(`${p.birth_date}T12:00:00`).getTime()) : "—"}</b></div><div class="info-row"><span>شماره تماس</span><b>${escapeHtml(p.phone || "—")}</b></div><div class="info-row"><span>جنسیت</span><b>${p.gender === "female" ? "زن" : p.gender === "male" ? "مرد" : "—"}</b></div><div class="info-row"><span>اسکن بعدی</span><b>${date(p.next_scan_at)}</b></div><div class="info-row"><span>ویزیت بعدی</span><b>${date(p.next_visit_at)}</b></div><h3>یادداشت اولیه پزشک</h3><p class="record-note">${escapeHtml(p.doctor_note || "یادداشتی ثبت نشده است.")}</p><h3>توضیحات برنامهٔ درمان</h3><p class="record-note">${escapeHtml(p.plan_note || "توضیحی ثبت نشده است.")}</p></section><section class="panel"><h2>افزودن فایل به پرونده</h2><p class="muted">عکس، رادیوگرافی، اسکن سه‌بعدی یا فایل طرح درمان را با توضیح اختیاری ذخیره کنید.</p><form id="patient-file-form" class="record-file-form"><label>نوع فایل<select name="category">${PATIENT_FILE_SLOTS.map(slot => `<option value="${slot[0]}">${slot[1]}</option>`).join("")}</select></label><label>انتخاب فایل‌ها<input name="patientFiles" type="file" accept="${PATIENT_FILE_SLOTS[0][3]}" multiple required></label><label>توضیح فایل‌ها<textarea name="description" maxlength="500" rows="3"></textarea></label><button class="primary" type="submit">بارگذاری در پرونده</button></form></section></div><section class="panel record-files-section"><div class="row"><h2>فایل‌های پرونده</h2><span class="muted">${number(state.files.length)} فایل</span></div>${files}</section>`;
}
function profileEditModal() { const p = state.profile || {}; modal("ویرایش پرونده بیمار", `<form id="patient-profile-form" class="form-grid"><label>نام بیمار<input name="name" required minlength="2" maxlength="100" value="${escapeHtml(state.patientName)}"></label><label>تاریخ تولد<input name="birthDate" type="date" value="${escapeHtml(p.birth_date || "")}"></label><label>شماره تماس<input name="phone" value="${escapeHtml(p.phone || "")}"></label><label>جنسیت<select name="gender"><option value="">انتخاب نشده</option><option value="female" ${p.gender === "female" ? "selected" : ""}>زن</option><option value="male" ${p.gender === "male" ? "selected" : ""}>مرد</option></select></label><label>نوع درمان<select name="treatmentType" required><option value="">انتخاب درمان</option><option value="aligner" ${p.treatment_type === "aligner" ? "selected" : ""}>الاینر شفاف</option><option value="bracket" ${p.treatment_type === "bracket" ? "selected" : ""}>براکت ثابت</option></select></label><label>تعداد الاینرها<input name="alignerCount" type="number" min="1" max="120" value="${p.aligner_count || ""}"></label><label>اسکن بعدی<input name="nextScanAt" type="date" value="${inputDate(p.next_scan_at)}"></label><label>ویزیت بعدی<input name="nextVisitAt" type="date" value="${inputDate(p.next_visit_at)}"></label><label class="full">یادداشت اولیه پزشک<textarea name="doctorNote" maxlength="2000">${escapeHtml(p.doctor_note || "")}</textarea></label><label class="full">توضیحات برنامهٔ درمان<textarea name="planNote" maxlength="2000">${escapeHtml(p.plan_note || "")}</textarea></label><div class="modal-actions full"><button class="primary" type="submit">ذخیره تغییرات</button></div></form>`); }

document.addEventListener("click", async event => {
  const target = event.target.closest("button, tr[data-id]"); if (!target) return;
  try {
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
    if (target.id === "mark-notifications") { await api("notifications.read", {}); closeModal(); await refreshNotifications(); return; }
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
    if (form.id === "patient-create-form") { const data = new FormData(form); data.set("op", "patient.create"); const result = await api("patient.create", data); const link = `${location.origin}/danto.html?invite=${result.invite}`; state.doctorView = "patients"; await loadPatients(); await renderDoctor(); modal("پرونده بیمار ذخیره شد", `<p>پرونده ${escapeHtml(result.patient.name)} ساخته شد. لینک زیر را تا ${date(result.expiresAt)} در اختیار بیمار قرار دهید تا حسابش را فعال کند.</p><div class="invite-link" dir="ltr">${escapeHtml(link)}</div><button id="copy-invite" class="primary" data-link="${escapeHtml(link)}">کپی لینک فعال‌سازی</button>`); }
    else if (form.id === "patient-profile-form") { await api("patient.profile", { patientId: state.patientId, ...Object.fromEntries(new FormData(form)) }); closeModal(); await loadPatientData(); await openPatient(state.patientId, "record"); toast("اطلاعات پرونده ذخیره شد."); }
    else if (form.id === "patient-file-form") { const category = form.elements.category.value, files = [...form.elements.patientFiles.files]; const data = new FormData(); data.set("op", "patient.file.add"); data.set("patientId", state.patientId); data.set(`description:${category}`, form.elements.description.value); files.forEach(file => data.append(`file:${category}`, file)); await api("patient.file.add", data); await loadPatientData(); await renderDetail(); toast("فایل‌ها به پرونده اضافه شدند."); }
    else if (form.id === "step-form") { const dueAt = new Date(`${form.elements.namedItem("dueAt").value}T23:59:59`).getTime(); await api("step.create", { patientId: state.patientId, title: form.elements.namedItem("title").value, detail: form.elements.namedItem("detail").value, dueAt }); closeModal(); await loadPatientData(); await renderDetail(); toast("مرحله جدید اضافه شد."); }
    else if (form.id === "review-form") { await api("scan.review", { patientId: state.patientId, scanId: form.dataset.scanId, note: form.elements.namedItem("note").value }); closeModal(); await loadPatientData(); await renderDetail(); toast("نظر پزشک ثبت شد."); }
    else if (form.id === "message-form") { await api("message", { patientId: myPatientId(), text: $("#message-text").value, kind: $("#message-urgent").checked ? "urgent" : "normal" }); await loadPatientData(); if (state.user.role === "doctor") await renderDetail(); else await renderPatient(); toast("پیام ارسال شد."); }
    else if (form.id === "scan-form") { const data = new FormData(form); data.append("op", "scan.create"); await api("scan.create", data); await loadPatientData(); await renderPatient(); toast("تصاویر برای پزشک ارسال شدند."); }
    else if (form.id === "settings-form") { const settings = Object.fromEntries(["messages","scans","roadmap"].map(key => [key, form.elements[key].checked])); await api("settings", { settings }); toast("تنظیمات ذخیره شد."); }
  } catch (error) { showError(error); }
  finally { if (button) button.disabled = false; }
});
document.addEventListener("click", async event => { const copy = event.target.closest("#copy-invite"); if (copy) { try { await navigator.clipboard.writeText(copy.dataset.link); toast("لینک دعوت کپی شد."); } catch { toast("لینک را از کادر بالا کپی کنید."); } } });
document.addEventListener("input", event => { if (event.target.id === "patient-search") $("#patient-rows").innerHTML = patientRows(); });
document.addEventListener("change", event => { if (event.target.id === "compare-before" || event.target.id === "compare-after") $(`#${event.target.id}-image`).src = imageUrl(event.target.value); if (event.target.name === "treatmentType" && event.target.closest("#patient-create-form")) { const aligner = event.target.value === "aligner"; $(".aligner-count-field").hidden = !aligner; $(".aligner-count-field input").required = aligner; } if (event.target.type === "file") { const label = $(`#file-${event.target.name}`); if (label) label.textContent = event.target.files[0]?.name || "انتخاب تصویر"; if (event.target.name.startsWith("file:")) { const slot = event.target.name.slice(5), list = $(`[data-selected-files="${slot}"]`); if (list) list.textContent = [...event.target.files].map(file => file.name).join("، ") || "فایلی انتخاب نشده است."; } } if (event.target.name === "category" && event.target.closest("#patient-file-form")) { const slot = PATIENT_FILE_SLOTS.find(item => item[0] === event.target.value); if (slot) { const picker = $("#patient-file-form input[type=file]"); picker.accept = slot[3]; picker.value = ""; } } });
$("#modal-layer").addEventListener("click", event => { if (event.target.id === "modal-layer") closeModal(); });
authMode(new URL(location.href).searchParams.has("invite") ? "accept" : "login");
api("me").then(async result => { state.user = result.user; await enter(); }).catch(() => showShell("login-screen"));
setInterval(async () => { if (!state.user || document.hidden) return; await refreshNotifications(); if (state.user.role === "patient" && state.patientView === "messages") { await loadPatientData(); await renderPatient(); } if (state.user.role === "doctor" && state.patientId && state.detailTab === "communication" && !$("#patient-detail").hidden) { await loadPatientData(); await renderDetail(); } }, 30000);
