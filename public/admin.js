"use strict";
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const permissions = {"patients.manage":"افزودن و ویرایش بیمار","files.manage":"ثبت و حذف مدارک","treatment.manage":"برنامه و یادداشت درمان","scans.review":"بررسی و تأیید اسکن","messages.send":"ارسال پیام به بیمار","rewards.manage":"تنظیم و اصلاح امتیاز"};
const actions = {"admin.bootstrap":"راه‌اندازی ادمین","admin.doctor.create":"ساخت حساب پزشک","admin.doctor.update":"ویرایش حساب و دسترسی‌ها","admin.doctor.reset-password":"بازنشانی رمز پزشک","admin.doctor.revoke-sessions":"خروج نشست‌های پزشک","admin.password":"تغییر رمز ادمین"};
const number = value => Number(value || 0).toLocaleString("fa-IR");
const date = value => value ? new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tehran"}).format(new Date(Number(value))) : "هنوز وارد نشده";
const state = { user:null, bootstrap:false, initialized:true, doctors:[], page:1, auditPage:1, view:"doctors", query:"", status:"all" };
let noticeTimer, listRequest = 0;
function notice(message){ clearTimeout(noticeTimer);$("#notice").textContent=message;$("#notice").hidden=false;noticeTimer=setTimeout(()=>{$("#notice").hidden=true;},6000); }
function signOut(){ state.user=null;$("#admin-shell").hidden=true;$("#auth-screen").hidden=false;$("#admin-password").value="";$("#setup-key").value="";closeDialog(); }
async function api(op,data,params={}){
  const response=await fetch("/api?"+new URLSearchParams({op,...params}),{credentials:"same-origin",...(data===undefined?{}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({op,...data})})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){if(response.status===401&&state.user)signOut();throw new Error(result.error||"درخواست انجام نشد؛ دوباره تلاش کنید.");}
  return result;
}
function setBootstrap(value){
  state.bootstrap=value;$("#bootstrap-fields").hidden=!value;$("#admin-name").required=value;$("#setup-key").required=value;
  $("#admin-password").minLength=value?12:1;$("#admin-password").autocomplete=value?"new-password":"current-password";
  $("#auth-title").textContent=value?"راه‌اندازی ادمین اولیه":"ورود به مدیریت";
  $("#auth-copy").textContent=value?"این مرحله فقط یک بار برای صاحب سامانه انجام می‌شود.":"با ایمیل و رمز حساب ادمین وارد شوید.";
  $("#auth-submit").textContent=value?"ساخت حساب ادمین":"ورود";
  $("#bootstrap-switch").textContent=value?"بازگشت به ورود":"راه‌اندازی ادمین اولیه";$("#auth-error").hidden=true;
}
async function enter(user){
  if(user.role!=="admin"){notice("این حساب ادمین نیست. برای استفاده از حساب پزشک یا بیمار به صفحهٔ ورود سامانه بروید.");return;}
  state.user=user;state.initialized=true;$("#bootstrap-switch").hidden=true;$("#account-name").textContent=user.name;
  $("#auth-screen").hidden=true;$("#admin-shell").hidden=false;$("#admin-password").value="";$("#setup-key").value="";
  await Promise.all([loadSummary(),loadDoctors()]);
}
async function loadSummary(){
  const {summary}=await api("admin.summary");
  $("#summary").innerHTML=[["پزشک ثبت‌شده",summary.doctors],["پزشک فعال",summary.active_doctors],["حساب تعلیق‌شده",summary.suspended_doctors],["بیمار ثبت‌شده",summary.patients]].map(([label,value])=>`<article><b>${number(value)}</b><small>${label}</small></article>`).join("");
}
function pagination(target,page,total,size,kind){
  const pages=Math.max(1,Math.ceil(total/size));
  $(target).innerHTML=total>size?`<button class="outline" data-${kind}-page="${page-1}" ${page<=1?"disabled":""}>قبلی</button><span>صفحهٔ ${number(page)} از ${number(pages)}</span><button class="outline" data-${kind}-page="${page+1}" ${page>=pages?"disabled":""}>بعدی</button>`:"";
}
async function loadDoctors(){
  const request=++listRequest;$("#list-status").textContent="در حال دریافت پزشک‌ها…";
  const result=await api("admin.doctors",undefined,{page:state.page,q:state.query,status:state.status});if(request!==listRequest)return;
  if(state.page>1&&!result.doctors.length&&result.total){state.page=Math.max(1,Math.ceil(result.total/result.pageSize));return loadDoctors();}
  state.doctors=result.doctors;$("#list-status").textContent=number(result.total)+" پزشک";
  $("#doctors-list").innerHTML=result.doctors.length?result.doctors.map(d=>`<article class="doctor-card"><div class="doctor-identity"><span class="avatar" aria-hidden="true">${escape(d.name[0])}</span><div><h3>${escape(d.name)} <span class="badge ${d.disabled?"suspended":""}">${d.disabled?"تعلیق‌شده":"فعال"}</span></h3><p class="email">${escape(d.email)}</p><small class="hint">${escape(d.clinic||"مطب ثبت نشده")}</small></div></div><div class="doctor-meta"><div><span>${number(d.patient_count)} بیمار${d.patient_limit!==null?" از سقف "+number(d.patient_limit):""}</span><span>${number(d.session_count)} نشست فعال</span></div><p>آخرین ورود: ${date(d.last_login_at)}</p><div class="permission-chips">${d.permissions.length?d.permissions.map(key=>`<span>${permissions[key]}</span>`).join(""):"<span>فقط مشاهدهٔ پرونده‌ها</span>"}</div></div><div class="doctor-actions"><button class="outline" data-edit="${escape(d.id)}" aria-label="ویرایش حساب ${escape(d.name)}">ویرایش و دسترسی‌ها</button><button class="outline" data-reset="${escape(d.id)}" aria-label="بازنشانی رمز ${escape(d.name)}">بازنشانی رمز</button><button class="text-button" data-revoke="${escape(d.id)}" aria-label="خروج همهٔ نشست‌های ${escape(d.name)}">خروج نشست‌ها</button></div></article>`).join(""):"<div class=\"empty\">پزشکی با این شرایط پیدا نشد.</div>";
  pagination("#doctor-pagination",result.page,result.total,result.pageSize,"doctor");
}
function auditDetails(row){
  try{const d=JSON.parse(row.details);if(row.action==="admin.doctor.update"||row.action==="admin.doctor.create")return `${d.disabled?"حساب تعلیق‌شده":"حساب فعال"} · ${number(d.permissions?.length)} دسترسی · سقف بیمار: ${d.patientLimit==null?"نامحدود":number(d.patientLimit)}`;}catch{}
  return "";
}
async function loadAudit(){
  const result=await api("admin.audit",undefined,{page:state.auditPage});
  $("#audit-list").innerHTML=result.audit.length?result.audit.map(row=>`<article class="audit-item"><div><b>${escape(actions[row.action]||row.action)}</b><small>${escape(row.actor_name)} · ${escape(row.subject_name||"سامانه")}</small><p class="audit-detail">${escape(auditDetails(row))}</p></div><time datetime="${new Date(row.created_at).toISOString()}">${date(row.created_at)}</time></article>`).join(""):"<div class=\"empty\">هنوز تغییری ثبت نشده است.</div>";
  pagination("#audit-pagination",result.page,result.total,result.pageSize,"audit");
}
function dialog(title,html){$("#dialog-title").textContent=title;$("#dialog-body").innerHTML=html;$("#editor-dialog").showModal();}
function closeDialog(){ $("#editor-dialog").close();$("#dialog-body").replaceChildren(); }
function doctorForm(doctor){
  const d=doctor||{name:"",email:"",clinic:"",phone:"",permissions:Object.keys(permissions),disabled:0,patient_limit:null};
  dialog(doctor?"ویرایش حساب پزشک":"افزودن پزشک",`<form id="doctor-form" ${doctor?`data-id="${escape(d.id)}"`:""}><div class="form-grid"><div><label for="doctor-name">نام کامل پزشک</label><input id="doctor-name" name="name" required minlength="2" maxlength="100" value="${escape(d.name)}" autocomplete="name"></div><div><label for="doctor-email">ایمیل ورود</label><input id="doctor-email" name="email" type="email" dir="ltr" required maxlength="254" value="${escape(d.email)}" autocomplete="off"></div><div><label for="doctor-clinic">نام مطب یا کلینیک</label><input id="doctor-clinic" name="clinic" maxlength="150" value="${escape(d.clinic)}"></div><div><label for="doctor-phone">شماره تماس</label><input id="doctor-phone" name="phone" type="tel" dir="ltr" maxlength="30" value="${escape(d.phone)}"></div>${doctor?"":`<div class="wide"><label for="doctor-password">رمز عبور اولیه</label><input id="doctor-password" name="password" type="password" minlength="12" maxlength="128" dir="ltr" required autocomplete="new-password"><button class="text-button" type="button" data-generate="doctor-password">ساخت رمز تصادفی</button></div>`}<div><label for="doctor-status">وضعیت حساب</label><select id="doctor-status" name="disabled"><option value="false" ${!d.disabled?"selected":""}>فعال</option><option value="true" ${d.disabled?"selected":""}>تعلیق‌شده</option></select></div><div><label for="doctor-limit">سقف تعداد بیماران</label><input id="doctor-limit" name="patientLimit" type="number" min="0" max="10000" step="1" value="${d.patient_limit??""}" placeholder="خالی = نامحدود"><small class="hint">پرونده‌های فعلی حفظ می‌شوند.</small></div></div><fieldset><legend>دسترسی‌های پزشک</legend><p class="hint">مشاهدهٔ پرونده‌ها محدود به بیماران همین پزشک است. موارد زیر اجازهٔ انجام تغییر را مشخص می‌کنند.</p><div class="permissions">${Object.entries(permissions).map(([key,label])=>`<label><input type="checkbox" name="permissions" value="${key}" ${d.permissions.includes(key)?"checked":""}>${label}</label>`).join("")}</div></fieldset><p class="error" role="alert" hidden data-form-error></p><div class="dialog-actions"><button class="primary" type="submit">${doctor?"ذخیرهٔ تغییرات":"ساخت حساب پزشک"}</button><button class="outline" type="button" data-close>انصراف</button></div></form>`);
}
function credentialReceipt(email,password,title){
  closeDialog();dialog(title,`<p>اطلاعات ورود را در اختیار پزشک قرار دهید.</p><div class="credential"><label for="receipt-email">ایمیل ورود</label><input id="receipt-email" readonly dir="ltr" value="${escape(email)}"><label for="receipt-password">رمز عبور</label><input id="receipt-password" readonly type="password" dir="ltr" value="${escape(password)}"><button class="text-button" type="button" id="show-receipt">نمایش رمز</button></div><p class="hint">این رمز پس از بستن این پنجره در پنل نمایش داده نمی‌شود.</p><div class="dialog-actions"><button class="primary" type="button" id="copy-receipt">کپی اطلاعات ورود</button><button class="outline" type="button" data-close>بستن</button></div>`);
}
function resetForm(doctor){dialog("بازنشانی رمز "+doctor.name,`<form id="reset-form" data-id="${escape(doctor.id)}"><p>نشست‌های قبلی این پزشک باطل می‌شوند و ورود بعدی با رمز جدید خواهد بود.</p><label for="reset-password">رمز عبور جدید</label><input id="reset-password" name="password" required type="password" minlength="12" maxlength="128" dir="ltr" autocomplete="new-password"><button class="text-button" type="button" data-generate="reset-password">ساخت رمز تصادفی</button><p class="error" role="alert" hidden data-form-error></p><div class="dialog-actions"><button class="primary" type="submit">ثبت رمز جدید</button><button class="outline" type="button" data-close>انصراف</button></div></form>`);}
$("#admin-auth-form").addEventListener("submit",async event=>{
  event.preventDefault();const button=$("#auth-submit");button.disabled=true;$("#auth-error").hidden=true;
  try{const fields=Object.fromEntries(new FormData(event.target));const result=await api(state.bootstrap?"admin.bootstrap":"login",state.bootstrap?fields:{identifier:fields.email,password:fields.password});setBootstrap(false);await enter(result.user);}
  catch(error){$("#auth-error").textContent=error.message;$("#auth-error").hidden=false;}finally{button.disabled=false;}
});
$("#bootstrap-switch").addEventListener("click",()=>setBootstrap(!state.bootstrap));
$("#search-form").addEventListener("submit",event=>{event.preventDefault();const data=new FormData(event.target);state.query=String(data.get("q")).trim();state.status=String(data.get("status"));state.page=1;loadDoctors().catch(error=>notice(error.message));});
document.addEventListener("click",async event=>{
  const button=event.target.closest("button");if(!button)return;
  try{
    if(button.id==="close-dialog"||button.hasAttribute("data-close"))return closeDialog();
    if(button.id==="create-doctor")return doctorForm();
    if(button.dataset.edit)return doctorForm(state.doctors.find(d=>d.id===button.dataset.edit));
    if(button.dataset.reset)return resetForm(state.doctors.find(d=>d.id===button.dataset.reset));
    if(button.dataset.revoke){const doctor=state.doctors.find(d=>d.id===button.dataset.revoke);dialog("خروج نشست‌های "+doctor.name,`<form id="revoke-form" data-id="${escape(doctor.id)}"><p>تمام نشست‌های فعال این پزشک بسته می‌شوند. او همچنان می‌تواند با رمز فعلی دوباره وارد شود.</p><p class="error" role="alert" hidden data-form-error></p><div class="dialog-actions"><button class="primary" type="submit">خروج همهٔ نشست‌ها</button><button class="outline" type="button" data-close>انصراف</button></div></form>`);return;}
    if(button.dataset.generate){const bytes=new Uint8Array(20),alphabet="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";crypto.getRandomValues(bytes);const input=document.getElementById(button.dataset.generate);input.value=Array.from(bytes,n=>alphabet[n%alphabet.length]).join("");input.type="text";return;}
    if(button.id==="show-receipt"){$("#receipt-password").type=$("#receipt-password").type==="password"?"text":"password";button.textContent=$("#receipt-password").type==="password"?"نمایش رمز":"پنهان کردن رمز";return;}
    if(button.id==="copy-receipt"){await navigator.clipboard.writeText("ایمیل: "+$("#receipt-email").value+"\nرمز عبور: "+$("#receipt-password").value);notice("اطلاعات ورود کپی شد.");return;}
    if(button.id==="logout"){await api("logout",{});signOut();return;}
    if(button.id==="own-password"){dialog("تغییر رمز من",`<form id="own-password-form"><label for="current-password">رمز فعلی</label><input id="current-password" name="currentPassword" type="password" required maxlength="128" autocomplete="current-password" dir="ltr"><label for="new-password">رمز جدید</label><input id="new-password" name="password" type="password" minlength="12" maxlength="128" required autocomplete="new-password" dir="ltr"><p class="hint">پس از ذخیره، با رمز جدید دوباره وارد شوید.</p><p class="error" role="alert" hidden data-form-error></p><div class="dialog-actions"><button class="primary" type="submit">ذخیرهٔ رمز جدید</button><button class="outline" type="button" data-close>انصراف</button></div></form>`);return;}
    if(button.dataset.view){state.view=button.dataset.view;document.querySelectorAll("[data-view]").forEach(item=>{item.classList.toggle("selected",item===button);item.setAttribute("aria-current",item===button?"page":"false");});$("#doctors-view").hidden=state.view!=="doctors";$("#audit-view").hidden=state.view!=="audit";$("#view-title").textContent=state.view==="doctors"?"حساب پزشک‌ها":"سابقهٔ تغییرات";return state.view==="audit"?await loadAudit():await loadDoctors();}
    if(button.dataset.doctorPage){state.page=Number(button.dataset.doctorPage);await loadDoctors();}
    if(button.dataset.auditPage){state.auditPage=Number(button.dataset.auditPage);await loadAudit();}
  }catch(error){notice(error.message);}
});
document.addEventListener("submit",async event=>{
  const form=event.target;if(!["doctor-form","reset-form","revoke-form","own-password-form"].includes(form.id))return;
  event.preventDefault();const button=form.querySelector("button[type=submit]"),errorBox=form.querySelector("[data-form-error]");button.disabled=true;errorBox.hidden=true;
  try{
    const fields=Object.fromEntries(new FormData(form));
    if(form.id==="doctor-form"){
      const data={...fields,doctorId:form.dataset.id,disabled:fields.disabled==="true",permissions:new FormData(form).getAll("permissions")};
      await api(form.dataset.id?"admin.doctor.update":"admin.doctor.create",data);
      if(form.dataset.id){closeDialog();notice("حساب و دسترسی‌ها ذخیره شدند.");}else{credentialReceipt(fields.email,fields.password,"حساب پزشک ساخته شد");}
    }else if(form.id==="reset-form"){
      const doctor=state.doctors.find(d=>d.id===form.dataset.id);await api("admin.doctor.reset-password",{doctorId:doctor.id,password:fields.password});credentialReceipt(doctor.email,fields.password,"رمز جدید ثبت شد");
    }else if(form.id==="revoke-form"){await api("admin.doctor.revoke-sessions",{doctorId:form.dataset.id});closeDialog();notice("نشست‌های پزشک بسته شدند.");}
    else{await api("admin.password",fields);signOut();notice("رمز تغییر کرد؛ با رمز جدید وارد شوید.");return;}
    await Promise.all([loadSummary(),loadDoctors()]);
  }catch(error){if(form.isConnected){errorBox.textContent=error.message;errorBox.hidden=false;}else notice(error.message);}finally{button.disabled=false;}
});
$("#editor-dialog").addEventListener("close",()=>{if(!$("#editor-dialog").open)$("#dialog-body").replaceChildren();});
(async()=>{
  try{const status=await api("admin.bootstrap.status");state.initialized=status.initialized;$("#bootstrap-switch").hidden=status.initialized;}
  catch(error){notice(error.message);}
  try{const result=await api("me");await enter(result.user);}catch{}
})();
