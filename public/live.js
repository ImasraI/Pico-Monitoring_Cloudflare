const $ = (selector, root = document) => root.querySelector(selector);
const state = { user: null, mode: "login", doctorView: "patients", patientView: "home", detailTab: "overview", patientId: null, patients: [], steps: [], scans: [], messages: [], notifications: [], settings: null };
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
  const [steps, scans, messages] = await Promise.all([api("steps", null, { patientId: id }), api("scans", null, { patientId: id }), api("messages", null, { patientId: id })]);
  state.steps = steps.steps; state.scans = scans.scans; state.messages = messages.messages;
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
  const id = myPatientId();
  return `<div class="panel"><h2>گفت‌وگو با ${state.user.role === "doctor" ? "بیمار" : "پزشک"}</h2><p class="muted">پیام‌های فوری در پنل با برچسب مشخص می‌شوند. برای وضعیت پزشکی اورژانسی از خدمات اورژانس استفاده کنید.</p><div class="chat">${state.messages.length ? state.messages.map(message => `<article class="bubble ${message.sender_id === state.user.id ? "me" : ""}">${message.kind === "urgent" ? `<b class="urgent-label">فوری</b>` : ""}<div>${escapeHtml(message.body)}</div><small>${time(message.created_at)}${message.sender_id === state.user.id ? ` · ${message.read_at ? "دیده شد" : "ارسال شد"}` : ""}</small></article>`).join("") : empty("هنوز پیامی ردوبدل نشده است.")}</div><form id="message-form" class="message-compose"><label for="message-text">پیام جدید</label><textarea id="message-text" maxlength="2000" required placeholder="متن پیام را بنویسید..."></textarea><label class="check-line"><input type="checkbox" id="message-urgent"> پیام فوری</label><button class="primary" type="submit">ارسال پیام</button></form></div>`;
}
async function renderDoctor() {
  showShell("doctor-app");
  document.querySelectorAll("[data-doctor-view]").forEach(el => el.classList.toggle("active", el.dataset.doctorView === state.doctorView));
  const root = $("#doctor-content");
  if (state.doctorView === "patients") {
    root.innerHTML = `<div class="hero-strip"><div><span class="pulse"></span><b>پرونده‌های درمان</b><p>برنامه درمان، تصاویر و پیام‌های هر بیمار در پرونده خودش ثبت می‌شود.</p></div></div><div class="metrics"><article><span class="metric-icon mint">♙</span><div><small>بیماران من</small><strong>${number(state.patients.length)}</strong></div></article><article><span class="metric-icon amber">▣</span><div><small>اسکن‌های در انتظار</small><strong id="pending-count">—</strong></div></article><article><span class="metric-icon blue">◎</span><div><small>مراحل انجام‌شده</small><strong id="completed-count">—</strong></div></article></div><div class="workspace"><div class="section-head"><div><h2>بیماران</h2><p>برای مشاهده پرونده روی نام بیمار بزنید.</p></div><label class="search">⌕ <input id="patient-search" placeholder="جست‌وجو نام یا ایمیل"></label></div><div class="table-card"><table><thead><tr><th>بیمار</th><th>ایمیل</th><th>تاریخ عضویت</th><th>پرونده</th></tr></thead><tbody id="patient-rows">${patientRows(state.patients)}</tbody></table></div></div>`;
    if (state.patients.length) { const data = await Promise.all(state.patients.map(patient => Promise.all([api("steps", null, { patientId: patient.id }), api("scans", null, { patientId: patient.id })]))); $("#pending-count").textContent = number(data.reduce((sum, row) => sum + row[1].scans.filter(s => s.status === "new").length, 0)); $("#completed-count").textContent = number(data.reduce((sum, row) => sum + row[0].steps.filter(s => s.completed_at).length, 0)); } else { $("#pending-count").textContent = "۰"; $("#completed-count").textContent = "۰"; }
  } else if (state.doctorView === "settings") {
    await renderSettings(root);
  } else {
    const records = await Promise.all(state.patients.map(async patient => ({ patient, steps: (await api("steps", null, { patientId: patient.id })).steps, messages: (await api("messages", null, { patientId: patient.id })).messages, scans: (await api("scans", null, { patientId: patient.id })).scans })));
    if (state.doctorView === "tasks") root.innerHTML = title("مراحل درمان", "مراحل بعدی بیماران") + (records.length ? `<div class="task-list">${records.flatMap(record => record.steps.filter(step => !step.completed_at).map(step => `<article class="task-card"><span class="roadmap-dot">${number(step.position)}</span><div><b>${escapeHtml(step.title)}</b><small>${escapeHtml(record.patient.name)} · موعد ${date(step.due_at)}</small></div><button class="outline small" data-open-patient="${record.patient.id}" data-open-tab="plan">پرونده</button></article>`)).join("") || empty("مرحله باز وجود ندارد.")}</div>` : empty("هنوز بیماری ثبت نشده است."));
    if (state.doctorView === "messages") root.innerHTML = title("پیام‌ها", "گفت‌وگوهای بیماران") + (records.length ? `<div class="message-list">${records.map(record => `<article class="task-card"><div><b>${escapeHtml(record.patient.name)}</b><small>${record.messages.length ? `${record.messages.at(-1).kind === "urgent" ? "فوری · " : ""}${escapeHtml(record.messages.at(-1).body.slice(0, 120))}` : "هنوز پیامی نیست"}</small></div><button class="outline small" data-open-patient="${record.patient.id}" data-open-tab="communication">گفت‌وگو</button></article>`).join("")}</div>` : empty("هنوز بیماری ثبت نشده است."));
    if (state.doctorView === "insights") { const scans = records.flatMap(record => record.scans), steps = records.flatMap(record => record.steps); root.innerHTML = title("آمار درمان", "بر پایه داده‌های ثبت‌شده در همین سامانه") + `<div class="metrics"><article><div><small>بیماران</small><strong>${number(records.length)}</strong></div></article><article><div><small>اسکن‌ها</small><strong>${number(scans.length)}</strong></div></article><article><div><small>اسکن‌های بررسی‌نشده</small><strong>${number(scans.filter(s => s.status === "new").length)}</strong></div></article><article><div><small>مراحل انجام‌شده</small><strong>${number(steps.filter(s => s.completed_at).length)} / ${number(steps.length)}</strong></div></article></div>`; }
  }
}
function patientRows(patients) { return patients.length ? patients.map(patient => `<tr data-id="${patient.id}"><td><span class="patient"><span class="avatar" style="background:#4f8e87">${escapeHtml(initial(patient.name))}</span><b>${escapeHtml(patient.name)}</b></span></td><td>${escapeHtml(patient.email)}</td><td>${date(patient.created_at)}</td><td><button class="outline small" data-open-patient="${patient.id}">نمایش</button></td></tr>`).join("") : `<tr><td colspan="4">${empty("هنوز بیماری اضافه نشده است. با دکمه افزودن بیمار، دعوت‌نامه بسازید.")}</td></tr>`; }
async function openPatient(id, tab = "overview") {
  state.patientId = id; state.detailTab = tab;
  const patient = (await api("patient", null, { patientId: id })).patient;
  await loadPatientData();
  $("#detail-name").textContent = patient.name;
  $("#detail-meta").textContent = patient.email;
  $("#detail-avatar").textContent = initial(patient.name);
  $("#detail-score").textContent = number(points());
  await renderDetail();
}
async function renderDetail() {
  showShell("patient-detail");
  document.querySelectorAll("[data-detail-tab]").forEach(el => el.classList.toggle("active", el.dataset.detailTab === state.detailTab));
  const root = $("#detail-content");
  if (state.detailTab === "overview") root.innerHTML = `<div class="metrics"><article><div><small>مراحل انجام‌شده</small><strong>${number(completed())} / ${number(state.steps.length)}</strong></div></article><article><div><small>امتیاز</small><strong>${number(points())}</strong></div></article><article><div><small>اسکن‌ها</small><strong>${number(state.scans.length)}</strong></div></article><article><div><small>پیام‌ها</small><strong>${number(state.messages.length)}</strong></div></article></div><div class="detail-grid"><div class="panel"><h2>مسیر درمان</h2>${roadmapHtml(true)}</div><div class="panel"><h2>آخرین فعالیت</h2><p class="muted">${state.scans.length ? `آخرین اسکن: ${date(state.scans[0].created_at)}` : "هنوز اسکن ثبت نشده است."}</p><p class="muted">${state.messages.length ? `آخرین پیام: ${time(state.messages.at(-1).created_at)}` : "هنوز پیامی ثبت نشده است."}</p></div></div>`;
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
  else if (state.patientView === "roadmap") root.innerHTML = title("برنامه گام‌به‌گام", "هر مرحله را پس از انجام ثبت کنید. انجام تا موعد تعیین‌شده ۱۰ امتیاز دارد.") + `<div class="patient-stats"><article class="patient-stat"><small>امتیاز</small><strong>${number(points())}</strong></article><article class="patient-stat"><small>انجام‌شده</small><strong>${number(completed())}</strong></article><article class="patient-stat"><small>کل مراحل</small><strong>${number(state.steps.length)}</strong></article></div><div class="panel">${roadmapHtml(false)}</div>`;
  else if (state.patientView === "scans") { root.innerHTML = title("ارسال و مرور اسکن‌ها", "عکس‌های درمان فقط برای شما و پزشک‌تان قابل مشاهده‌اند.") + `<form id="scan-form" class="panel"><h2>اسکن جدید</h2><p class="muted">حداقل یک تصویر JPG، PNG یا WebP تا ۱۰ مگابایت انتخاب کنید.</p><div class="upload-grid">${[["front","روبرو"],["right","سمت راست"],["left","سمت چپ"]].map(([key,label]) => `<label class="upload-field">${label}<input type="file" name="${key}" accept="image/jpeg,image/png,image/webp"><span id="file-${key}">انتخاب تصویر</span></label>`).join("")}</div><button class="primary" type="submit">ارسال برای پزشک</button></form>${title("اسکن‌های قبلی")}${scanGallery()}${title("مقایسه تصاویر")}${compareHtml()}`; syncCompare(); }
  else if (state.patientView === "messages") { root.innerHTML = chatHtml(); await api("messages.read", { patientId: state.user.id }); }
  else if (state.patientView === "profile") root.innerHTML = `<div class="panel"><h2>اطلاعات حساب</h2><div class="info-row"><span>نام</span><b>${escapeHtml(state.user.name)}</b></div><div class="info-row"><span>ایمیل</span><b>${escapeHtml(state.user.email)}</b></div></div><div id="settings-root" style="margin-top:15px"></div>`;
  if (state.patientView === "profile") await renderSettings($("#settings-root"));
}
async function renderSettings(root) {
  state.settings = (await api("settings")).settings;
  root.innerHTML = title("تنظیم اعلان‌ها", "این تنظیمات اعلان‌های داخل برنامه را کنترل می‌کنند.") + `<form id="settings-form" class="panel settings-list">${[["messages","پیام‌ها"],["scans","اسکن‌ها"],["roadmap","مسیر درمان"]].map(([key,label]) => `<label><span>${label}</span><input type="checkbox" name="${key}" ${state.settings[key] ? "checked" : ""}></label>`).join("")}<button class="primary" type="submit">ذخیره تنظیمات</button></form>`;
}
function inviteModal() { modal("دعوت بیمار", `<form id="invite-form" class="form-grid"><label class="full">نام بیمار<input name="name" required maxlength="100"></label><label class="full">ایمیل بیمار<input name="email" type="email" required></label><p class="muted full">لینک دعوت پس از ثبت ساخته می‌شود؛ آن را خودتان در اختیار بیمار قرار دهید. لینک تا ۷ روز اعتبار دارد.</p><div class="modal-actions full"><button class="primary" type="submit">ساخت دعوت‌نامه</button></div></form>`); }
function stepModal() { modal("مرحله جدید درمان", `<form id="step-form" class="form-grid"><label class="full">عنوان مرحله<input name="title" required maxlength="100"></label><label class="full">توضیح<textarea name="detail" maxlength="500"></textarea></label><label class="full">موعد انجام<input name="dueAt" type="date" required></label><div class="modal-actions full"><button class="primary" type="submit">افزودن مرحله</button></div></form>`); }
function reviewModal(id) { modal("نظر روی اسکن", `<form id="review-form" data-scan-id="${id}"><label>نظر پزشک<textarea name="note" maxlength="1000" placeholder="توضیح برای بیمار"></textarea></label><div class="modal-actions"><button class="primary" type="submit">ثبت بررسی</button></div></form>`); }
function notificationsModal() { modal("اعلان‌ها", `<div class="notification-list">${state.notifications.length ? state.notifications.map(item => `<article class="notification ${item.read_at ? "" : "new"}"><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.body)}</p><small>${time(item.created_at)}</small></article>`).join("") : empty("اعلانی ندارید.")}</div><div class="modal-actions"><button class="outline" id="mark-notifications">علامت‌گذاری به‌عنوان خوانده‌شده</button></div>`); }

document.addEventListener("click", async event => {
  const target = event.target.closest("button, tr[data-id]"); if (!target) return;
  try {
    if (target.dataset.authMode) return authMode(target.dataset.authMode);
    if (target.id === "toggle-pass") { $("#login-pass").type = $("#login-pass").type === "password" ? "text" : "password"; return; }
    if (target.hasAttribute("data-logout")) { await api("logout", {}); state.user = null; state.patientId = null; state.patients = []; $("#auth-form").reset(); authMode("login"); closeModal(); showShell("login-screen"); return; }
    if (target.classList.contains("mobile-menu")) return $(".sidebar").classList.toggle("open");
    if (target.dataset.doctorView) { state.doctorView = target.dataset.doctorView; $(".sidebar").classList.remove("open"); return renderDoctor(); }
    if (target.dataset.patientView) { state.patientView = target.dataset.patientView; return renderPatient(); }
    if (target.dataset.openPatient || target.dataset.id) return openPatient(target.dataset.openPatient || target.dataset.id, target.dataset.openTab || "overview");
    if (target.dataset.detailTab) { state.detailTab = target.dataset.detailTab; return renderDetail(); }
    if (target.id === "detail-back") return renderDoctor();
    if (target.id === "detail-message") { state.detailTab = "communication"; return renderDetail(); }
    if (target.id === "detail-action" || target.id === "create-step") return stepModal();
    if (target.id === "add-patient") return inviteModal();
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
    if (form.id === "invite-form") { const result = await api("invite", { name: form.elements.namedItem("name").value, email: form.elements.namedItem("email").value }); const link = `${location.origin}/danto.html?invite=${result.invite}`; modal("دعوت‌نامه آماده است", `<p>این لینک را به بیمار بدهید. تا ${date(result.expiresAt)} اعتبار دارد.</p><div class="invite-link" dir="ltr">${escapeHtml(link)}</div><button id="copy-invite" class="primary" data-link="${escapeHtml(link)}">کپی لینک</button>`); await loadPatients(); await renderDoctor(); }
    else if (form.id === "step-form") { const dueAt = new Date(`${form.elements.namedItem("dueAt").value}T23:59:59`).getTime(); await api("step.create", { patientId: state.patientId, title: form.elements.namedItem("title").value, detail: form.elements.namedItem("detail").value, dueAt }); closeModal(); await loadPatientData(); await renderDetail(); toast("مرحله جدید اضافه شد."); }
    else if (form.id === "review-form") { await api("scan.review", { patientId: state.patientId, scanId: form.dataset.scanId, note: form.elements.namedItem("note").value }); closeModal(); await loadPatientData(); await renderDetail(); toast("نظر پزشک ثبت شد."); }
    else if (form.id === "message-form") { await api("message", { patientId: myPatientId(), text: $("#message-text").value, kind: $("#message-urgent").checked ? "urgent" : "normal" }); await loadPatientData(); if (state.user.role === "doctor") await renderDetail(); else await renderPatient(); toast("پیام ارسال شد."); }
    else if (form.id === "scan-form") { const data = new FormData(form); data.append("op", "scan.create"); await api("scan.create", data); await loadPatientData(); await renderPatient(); toast("تصاویر برای پزشک ارسال شدند."); }
    else if (form.id === "settings-form") { const settings = Object.fromEntries(["messages","scans","roadmap"].map(key => [key, form.elements[key].checked])); await api("settings", { settings }); toast("تنظیمات ذخیره شد."); }
  } catch (error) { showError(error); }
  finally { if (button) button.disabled = false; }
});
document.addEventListener("click", async event => { const copy = event.target.closest("#copy-invite"); if (copy) { try { await navigator.clipboard.writeText(copy.dataset.link); toast("لینک دعوت کپی شد."); } catch { toast("لینک را از کادر بالا کپی کنید."); } } });
document.addEventListener("input", event => { if (event.target.id === "patient-search") { const term = event.target.value.trim().toLowerCase(); $("#patient-rows").innerHTML = patientRows(state.patients.filter(patient => `${patient.name} ${patient.email}`.toLowerCase().includes(term))); } });
document.addEventListener("change", event => { if (event.target.id === "compare-before" || event.target.id === "compare-after") $(`#${event.target.id}-image`).src = imageUrl(event.target.value); if (event.target.type === "file") { const label = $(`#file-${event.target.name}`); if (label) label.textContent = event.target.files[0]?.name || "انتخاب تصویر"; } });
$("#modal-layer").addEventListener("click", event => { if (event.target.id === "modal-layer") closeModal(); });
authMode(new URL(location.href).searchParams.has("invite") ? "accept" : "login");
api("me").then(async result => { state.user = result.user; await enter(); }).catch(() => showShell("login-screen"));
setInterval(async () => { if (!state.user || document.hidden) return; await refreshNotifications(); if (state.user.role === "patient" && state.patientView === "messages") { await loadPatientData(); await renderPatient(); } if (state.user.role === "doctor" && state.patientId && state.detailTab === "communication" && !$("#patient-detail").hidden) { await loadPatientData(); await renderDetail(); } }, 30000);
