"use strict";
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const permissions = {"patients.manage":"افزودن و ویرایش بیمار","files.manage":"ثبت و حذف مدارک","treatment.manage":"برنامه و یادداشت درمان","scans.review":"بررسی و تأیید اسکن","messages.send":"ارسال پیام به بیمار","rewards.manage":"تنظیم و اصلاح امتیاز"};
const actions = {"admin.provision":"ثبت حساب ادمین","admin.bootstrap":"ثبت حساب ادمین","admin.doctor.create":"ساخت حساب پزشک","admin.doctor.update":"ویرایش حساب و دسترسی‌ها","admin.doctor.reset-password":"بازنشانی رمز پزشک","admin.doctor.revoke-sessions":"خروج نشست‌های پزشک","admin.password":"تغییر رمز ادمین","admin.patient.update":"ویرایش اطلاعات بیمار","admin.patient.delete":"حذف بیمار","admin.patient.restore":"بازیابی بیمار","admin.doctor.delete":"حذف پزشک و بیماران وابسته","admin.doctor.restore":"بازیابی پزشک و بیماران وابسته"};
const number = value => Number(value || 0).toLocaleString("fa-IR");
const date = value => value ? new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tehran"}).format(new Date(Number(value))) : "هنوز وارد نشده";
const state = { user:null, doctors:[], page:1, auditPage:1, view:"doctors", query:"", status:"all", selectedDoctor:null,patients:[],patientPage:1,patientQuery:"",patientStatus:"active" };
let noticeTimer, listRequest = 0,patientRequest=0;
function notice(message){ clearTimeout(noticeTimer);$("#notice").textContent=message;$("#notice").hidden=false;noticeTimer=setTimeout(()=>{$("#notice").hidden=true;},6000); }
function signOut(){ state.user=null;closeDialog();location.replace("/danto.html"); }
async function api(op,data,params={}){
  const response=await fetch("/api?"+new URLSearchParams({op,...params}),{credentials:"same-origin",...(data===undefined?{}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({op,...data})})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){if(response.status===401&&state.user)signOut();throw new Error(result.error||"درخواست انجام نشد؛ دوباره تلاش کنید.");}
  return result;
}
async function enter(user){
  if(user.role!=="admin"){signOut();return;}
  state.user=user;$("#account-name").textContent=user.name;
  $("#session-status").hidden=true;$("#admin-shell").hidden=false;
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
  if(state.page>1&&!result.doctors.length){state.page=Math.max(1,Math.ceil(result.total/result.pageSize));return loadDoctors();}
  state.doctors=result.doctors;$("#list-status").textContent=number(result.total)+" پزشک";
  $("#doctors-list").innerHTML=result.doctors.length?result.doctors.map(d=>`<article class="doctor-card"><div class="doctor-identity"><span class="avatar" aria-hidden="true">${escape(d.name[0])}</span><div><h3><button class="doctor-open" data-open-doctor="${escape(d.id)}" aria-label="بیماران ${escape(d.name)}">${escape(d.name)}</button> <span class="badge ${d.deleted_at?"deleted":d.disabled?"suspended":""}">${d.deleted_at?"حذف‌شده":d.disabled?"تعلیق‌شده":"فعال"}</span></h3><p class="email">${escape(d.username||d.phone||"شماره ورود ثبت نشده")}</p><small class="hint">${escape(d.clinic||"مطب ثبت نشده")}</small></div></div><div class="doctor-meta"><div><span>${number(d.patient_count)} بیمار${d.patient_limit!==null?" از سقف "+number(d.patient_limit):""}</span><span>${number(d.deleted_patient_count)} بیمار حذف‌شده</span></div><p>آخرین ورود: ${date(d.last_login_at)}</p><div class="permission-chips">${d.permissions.length?d.permissions.map(key=>`<span>${permissions[key]}</span>`).join(""):"<span>فقط مشاهدهٔ پرونده‌ها</span>"}</div></div><div class="doctor-actions"><button class="primary" data-open-doctor="${escape(d.id)}" aria-label="مشاهده بیماران ${escape(d.name)}">مشاهده بیماران ←</button>${d.deleted_at?`<button class="outline" data-restore-doctor="${escape(d.id)}">بازیابی پزشک</button>`:`<button class="outline" data-edit="${escape(d.id)}" aria-label="ویرایش حساب ${escape(d.name)}">ویرایش و دسترسی‌ها</button><button class="outline" data-reset="${escape(d.id)}" aria-label="بازنشانی رمز ${escape(d.name)}">بازنشانی رمز</button><button class="text-button" data-revoke="${escape(d.id)}" aria-label="خروج همهٔ نشست‌های ${escape(d.name)}">خروج نشست‌ها</button><button class="danger" data-delete-doctor="${escape(d.id)}" aria-label="حذف پزشک ${escape(d.name)}">حذف پزشک</button>`}</div></article>`).join(""):"<div class=\"empty\">پزشکی با این شرایط پیدا نشد.</div>";
  pagination("#doctor-pagination",result.page,result.total,result.pageSize,"doctor");
}
function auditDetails(row){
  try{const d=JSON.parse(row.details);if(row.action==="admin.doctor.update"||row.action==="admin.doctor.create")return `${d.disabled?"حساب تعلیق‌شده":"حساب فعال"} · ${number(d.permissions?.length)} دسترسی · سقف بیمار: ${d.patientLimit==null?"نامحدود":number(d.patientLimit)}`;if(row.action==="admin.patient.update")return 'ویرایش '+number(d.fields?.length)+' بخش از اطلاعات پرونده';}catch{}
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
  dialog(doctor?"ویرایش حساب پزشک":"افزودن پزشک",`<form id="doctor-form" ${doctor?`data-id="${escape(d.id)}"`:""}><div class="form-grid"><div><label for="doctor-name">نام کامل پزشک</label><input id="doctor-name" name="name" required minlength="2" maxlength="100" value="${escape(d.name)}" autocomplete="name"></div><div><label for="doctor-email">ایمیل (اختیاری)</label><input id="doctor-email" name="email" type="email" dir="ltr" maxlength="254" value="${escape(d.email)}" autocomplete="off"></div><div><label for="doctor-clinic">نام مطب یا کلینیک</label><input id="doctor-clinic" name="clinic" maxlength="150" value="${escape(d.clinic)}"></div><div><label for="doctor-phone">شماره موبایل ورود</label><input id="doctor-phone" name="phone" type="tel" inputmode="tel" required autocomplete="off" dir="ltr" maxlength="30" value="${escape(d.phone)}"></div>${doctor?"":`<div class="wide"><label for="doctor-password">رمز عبور اولیه</label><input id="doctor-password" name="password" type="password" minlength="12" maxlength="128" dir="ltr" required autocomplete="new-password"><button class="text-button" type="button" data-generate="doctor-password">ساخت رمز تصادفی</button></div>`}<div><label for="doctor-status">وضعیت حساب</label><select id="doctor-status" name="disabled"><option value="false" ${!d.disabled?"selected":""}>فعال</option><option value="true" ${d.disabled?"selected":""}>تعلیق‌شده</option></select></div><div><label for="doctor-limit">سقف تعداد بیماران</label><input id="doctor-limit" name="patientLimit" type="number" min="0" max="10000" step="1" value="${d.patient_limit??""}" placeholder="خالی = نامحدود"><small class="hint">پرونده‌های فعلی حفظ می‌شوند.</small></div></div><fieldset><legend>دسترسی‌های پزشک</legend><p class="hint">مشاهدهٔ پرونده‌ها محدود به بیماران همین پزشک است. موارد زیر اجازهٔ انجام تغییر را مشخص می‌کنند.</p><div class="permissions">${Object.entries(permissions).map(([key,label])=>`<label><input type="checkbox" name="permissions" value="${key}" ${d.permissions.includes(key)?"checked":""}>${label}</label>`).join("")}</div></fieldset><p class="error" role="alert" hidden data-form-error></p><div class="dialog-actions"><button class="primary" type="submit">${doctor?"ذخیرهٔ تغییرات":"ساخت حساب پزشک"}</button><button class="outline" type="button" data-close>انصراف</button></div></form>`);
}
function credentialReceipt(phone,password,title){
  closeDialog();dialog(title,`<p>اطلاعات ورود را در اختیار پزشک قرار دهید.</p><div class="credential"><label for="receipt-email">شماره موبایل ورود</label><input id="receipt-email" readonly dir="ltr" value="${escape(phone)}"><label for="receipt-password">رمز عبور</label><input id="receipt-password" readonly type="password" dir="ltr" value="${escape(password)}"><button class="text-button" type="button" id="show-receipt">نمایش رمز</button></div><p class="hint">این رمز پس از بستن این پنجره در پنل نمایش داده نمی‌شود.</p><div class="dialog-actions"><button class="primary" type="button" id="copy-receipt">کپی اطلاعات ورود</button><button class="outline" type="button" data-close>بستن</button></div>`);
}
function resetForm(doctor){dialog("بازنشانی رمز "+doctor.name,`<form id="reset-form" data-id="${escape(doctor.id)}"><p>نشست‌های قبلی این پزشک باطل می‌شوند و ورود بعدی با رمز جدید خواهد بود.</p><label for="reset-password">رمز عبور جدید</label><input id="reset-password" name="password" required type="password" minlength="12" maxlength="128" dir="ltr" autocomplete="new-password"><button class="text-button" type="button" data-generate="reset-password">ساخت رمز تصادفی</button><p class="error" role="alert" hidden data-form-error></p><div class="dialog-actions"><button class="primary" type="submit">ثبت رمز جدید</button><button class="outline" type="button" data-close>انصراف</button></div></form>`);}
function findDoctor(id){return state.doctors.find(d=>d.id===id)||(state.selectedDoctor?.id===id?state.selectedDoctor:null);}
function setView(view){
  state.view=view;patientRequest++;
  for(const name of ['doctors','patients','audit'])$('#'+name+'-view').hidden=view!==name;
  document.querySelectorAll('[data-view]').forEach(item=>{const selected=item.dataset.view===(view==='patients'?'doctors':view);item.classList.toggle('selected',selected);item.setAttribute('aria-current',selected?'page':'false');});
  $('#view-title').textContent=view==='patients'?'بیماران پزشک':view==='audit'?'سابقهٔ تغییرات':'حساب پزشک‌ها';
}
async function openDoctor(id){
  state.selectedDoctor={id};state.patients=[];state.patientPage=1;state.patientQuery='';state.patientStatus=findDoctor(id)?.deleted_at?'deleted':'active';
  $('#patient-search-form').reset();$('#patient-search-form select').value=state.patientStatus;$('#patients-list').replaceChildren();$('#selected-doctor').replaceChildren();setView('patients');
  await loadPatients();$('#admin-content').focus();
}
async function loadPatients(){
  const id=state.selectedDoctor?.id;if(!id||state.view!=='patients')return;
  const request=++patientRequest;$('#patient-list-status').textContent='در حال دریافت بیماران…';
  const result=await api('admin.patients',undefined,{doctorId:id,page:state.patientPage,q:state.patientQuery,status:state.patientStatus});
  if(request!==patientRequest||state.view!=='patients'||state.selectedDoctor?.id!==id)return;
  if(state.patientPage>1&&!result.patients.length){state.patientPage=Math.max(1,Math.ceil(result.total/result.pageSize));return loadPatients();}
  const d=state.selectedDoctor=result.doctor;state.patients=result.patients;
  $('#view-title').textContent='بیماران '+d.name;
  $('#selected-doctor').innerHTML=`<div><h2>${escape(d.name)} <span class="badge ${d.deleted_at?'deleted':d.disabled?'suspended':''}">${d.deleted_at?'حذف‌شده':d.disabled?'تعلیق‌شده':'فعال'}</span></h2><p class="hint">${escape(d.clinic||'مطب ثبت نشده')} · <bdi>${escape(d.username||d.phone||'شماره ثبت نشده')}</bdi></p><p class="doctor-counts">${number(d.patient_count)} بیمار ثبت‌شده · ${number(d.deleted_patient_count)} بیمار حذف‌شده</p>${d.deleted_at?'<p class="deleted-warning">حساب این پزشک حذف شده است. برای فعال‌شدن بیماران وابسته، پزشک را بازیابی کنید.</p>':''}</div><div class="dialog-actions">${d.deleted_at?`<button class="primary" data-restore-doctor="${escape(id)}">بازیابی پزشک</button>`:`<button class="outline" data-edit="${escape(id)}">ویرایش پزشک</button><button class="danger" data-delete-doctor="${escape(id)}">حذف پزشک</button>`}</div>`;
  $('#patient-list-status').textContent=number(result.total)+(state.patientStatus==='deleted'?' بیمار حذف‌شده':' بیمار');
  $('#patients-list').innerHTML=result.patients.length?result.patients.map(p=>`<article class="patient-card"><div><h3>${escape(p.name)}${p.deleted_at?'<span class="badge deleted">حذف‌شده</span>':''}</h3><small>شماره ورود: <bdi>${escape(p.username||p.phone||'ثبت نشده')}</bdi></small><small>کد ملی: <bdi>${escape(p.national_id||'ثبت نشده')}</bdi></small></div><div class="patient-meta"><p>درمان: ${escape(({aligner:'الاینر',bracket:'براکت'})[p.treatment_type]||'ثبت نشده')}</p><p>${number(p.file_count)} مدرک · ${p.personal_completed_at?'اطلاعات تکمیلی ثبت شده':'در انتظار تکمیل اطلاعات'}</p></div><div class="doctor-actions">${p.deleted_at?`<button class="outline" data-restore-patient="${escape(p.id)}" ${d.deleted_at?'disabled':''}>بازیابی بیمار</button>`:`<button class="outline" data-edit-patient="${escape(p.id)}" aria-label="ویرایش اطلاعات ${escape(p.name)}">ویرایش اطلاعات</button><button class="danger" data-delete-patient="${escape(p.id)}" aria-label="حذف بیمار ${escape(p.name)}">حذف بیمار</button>`}</div></article>`).join(''):`<div class="empty">${state.patientStatus==='deleted'?'بیمار حذف‌شده‌ای با این شرایط وجود ندارد.':'بیماری با این شرایط پیدا نشد.'}</div>`;
  pagination('#patient-pagination',result.page,result.total,result.pageSize,'patient');
}
function dayInput(value){return value?new Date(Number(value)+3.5*3600000).toISOString().slice(0,10):'';}
function editorInput(name,label,value,attrs=''){return `<div><label for="patient-${name}">${label}</label><input id="patient-${name}" name="${name}" value="${escape(value)}" ${attrs}></div>`;}
function editorText(name,label,value,limit=2000){return `<div class="wide"><label for="patient-${name}">${label}</label><textarea id="patient-${name}" name="${name}" maxlength="${limit}">${escape(value)}</textarea></div>`;}
async function patientForm(id){
  const doctorId=state.selectedDoctor.id,result=await api('admin.patient',undefined,{patientId:id,doctorId}),p=result.patient;
  if(p.deleted_at)throw Error('ابتدا حساب بیمار را بازیابی کنید.');
  dialog('ویرایش اطلاعات '+p.name,`<form id="patient-form" class="patient-editor" data-id="${escape(id)}" data-doctor-id="${escape(doctorId)}"><p class="hint">تغییر شماره موبایل، نام کاربری را عوض می‌کند. تغییر کد ملی، رمز فعلی بیمار را تغییر نمی‌دهد.</p><fieldset><legend>مشخصات اولیه</legend><div class="form-grid">${editorInput('name','نام کامل',p.name,'required minlength="2" maxlength="100" autocomplete="off"')}${editorInput('phone','شماره موبایل ورود',p.phone||p.username,'type="tel" dir="ltr" maxlength="30" '+(p.username?'required':''))}${editorInput('nationalId','کد ملی',p.national_id,'inputmode="numeric" dir="ltr" maxlength="10" pattern="[0-9۰-۹٠-٩]{10}" '+(p.national_id?'required':''))}${editorInput('birthDate','تاریخ تولد',p.birth_date,'type="date" '+(p.birth_date?'required':''))}</div></fieldset><fieldset><legend>اطلاعات تکمیلی</legend><div class="form-grid"><div><label for="patient-gender">جنسیت</label><select id="patient-gender" name="gender"><option value="">انتخاب نشده</option><option value="female" ${p.gender==='female'?'selected':''}>زن</option><option value="male" ${p.gender==='male'?'selected':''}>مرد</option></select></div>${editorInput('email','ایمیل (اختیاری)',p.email,'type="email" dir="ltr" maxlength="254"')}${editorInput('emergencyPhone','شماره تماس ضروری',p.emergency_phone,'type="tel" dir="ltr" maxlength="30"')}${editorText('address','نشانی',p.address,500)}${editorText('healthHistory','سوابق پزشکی',p.health_history)}${editorText('allergies','حساسیت‌ها',p.allergies)}${editorText('medications','داروهای مصرفی',p.medications)}</div></fieldset><fieldset><legend>اطلاعات درمان</legend><div class="form-grid"><div><label for="patient-treatmentType">نوع درمان</label><select id="patient-treatmentType" name="treatmentType"><option value="">ثبت نشده</option><option value="aligner" ${p.treatment_type==='aligner'?'selected':''}>الاینر</option><option value="bracket" ${p.treatment_type==='bracket'?'selected':''}>براکت</option></select></div>${editorInput('alignerCount','تعداد الاینر (برای درمان الاینر)',p.aligner_count,'type="number" min="1" max="120" step="1"')}${editorInput('nextScanAt','تاریخ اسکن بعدی',dayInput(p.next_scan_at),'type="date"')}${editorInput('nextVisitAt','تاریخ ویزیت بعدی',dayInput(p.next_visit_at),'type="date"')}${editorText('doctorNote','یادداشت خصوصی پزشک',p.doctor_note)}${editorText('planNote','توضیحات طرح درمان',p.plan_note)}</div></fieldset><p class="error" role="alert" hidden data-form-error></p><div class="dialog-actions"><button class="primary" type="submit">ذخیره اطلاعات بیمار</button><button class="outline" type="button" data-close>انصراف</button></div></form>`);
}
function accountAction(kind,id,restore=false){
  const item=kind==='doctor'?findDoctor(id):state.patients.find(p=>p.id===id);if(!item)throw Error('حساب پیدا نشد؛ صفحه را تازه کنید.');
  const label=kind==='doctor'?'پزشک':'بیمار',action=restore?'بازیابی':'حذف';
  const detail=restore?(kind==='doctor'?'بیمارانی که همراه این پزشک حذف شدند نیز بازیابی می‌شوند. بیمارانِ جداگانه حذف‌شده در بخش حذف‌شده‌ها باقی می‌مانند.':'اطلاعات پرونده و رمز فعلی بیمار حفظ می‌شوند و حساب دوباره در فهرست پزشک قرار می‌گیرد.'):(kind==='doctor'?`${number(item.patient_count)} بیمار ثبت‌شدهٔ این پزشک هم به حذف‌شده‌ها منتقل می‌شوند و امکان ورود آن‌ها متوقف می‌شود.`:'حساب از فهرست بیماران پزشک خارج می‌شود و ورود بیمار متوقف می‌شود.');
  dialog(action+' '+item.name,`<form id="account-action-form" data-id="${escape(id)}" data-kind="${kind}" data-restore="${restore}" data-doctor-id="${escape(kind==='doctor'?id:state.selectedDoctor.id)}"><div class="delete-summary"><strong>${action} حساب ${label} «${escape(item.name)}»</strong><p>${detail}</p></div><p class="hint">${restore?'برای ورود مجدد، همان شماره موبایل و رمز فعلی استفاده می‌شود.':'تمام ورودهای فعال حساب بسته می‌شوند. اطلاعات و مدارک حفظ می‌شوند و از بخش حذف‌شده‌ها قابل بازیابی‌اند.'}</p><p class="error" role="alert" hidden data-form-error></p><div class="dialog-actions"><button class="${restore?'primary':'danger'}" type="submit">${restore?'بازیابی حساب':'حذف و انتقال به حذف‌شده‌ها'}</button><button class="outline" type="button" data-close>انصراف</button></div></form>`);
}
async function refreshManagement(){await Promise.all([loadSummary(),loadDoctors(),loadPatients()]);}
$('#patient-search-form').addEventListener('submit',event=>{event.preventDefault();const data=new FormData(event.target);state.patientQuery=String(data.get('q')).trim();state.patientStatus=String(data.get('status'));state.patientPage=1;loadPatients().catch(error=>notice(error.message));});
$("#search-form").addEventListener("submit",event=>{event.preventDefault();const data=new FormData(event.target);state.query=String(data.get("q")).trim();state.status=String(data.get("status"));state.page=1;loadDoctors().catch(error=>notice(error.message));});
document.addEventListener("click",async event=>{
  const button=event.target.closest("button");if(!button)return;
  try{
    if(button.id==="close-dialog"||button.hasAttribute("data-close"))return closeDialog();
    if(button.id==="create-doctor")return doctorForm();
    if(button.dataset.openDoctor)return await openDoctor(button.dataset.openDoctor);
    if(button.dataset.editPatient)return await patientForm(button.dataset.editPatient);
    if(button.dataset.deletePatient)return accountAction('patient',button.dataset.deletePatient);
    if(button.dataset.restorePatient)return accountAction('patient',button.dataset.restorePatient,true);
    if(button.dataset.deleteDoctor)return accountAction('doctor',button.dataset.deleteDoctor);
    if(button.dataset.restoreDoctor)return accountAction('doctor',button.dataset.restoreDoctor,true);
    if(button.id==='back-doctors'){setView('doctors');return await loadDoctors();}
    if(button.dataset.edit)return doctorForm(findDoctor(button.dataset.edit));
    if(button.dataset.reset)return resetForm(findDoctor(button.dataset.reset));
    if(button.dataset.revoke){const doctor=state.doctors.find(d=>d.id===button.dataset.revoke);dialog("خروج نشست‌های "+doctor.name,`<form id="revoke-form" data-id="${escape(doctor.id)}"><p>تمام نشست‌های فعال این پزشک بسته می‌شوند. او همچنان می‌تواند با رمز فعلی دوباره وارد شود.</p><p class="error" role="alert" hidden data-form-error></p><div class="dialog-actions"><button class="primary" type="submit">خروج همهٔ نشست‌ها</button><button class="outline" type="button" data-close>انصراف</button></div></form>`);return;}
    if(button.dataset.generate){const bytes=new Uint8Array(20),alphabet="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";crypto.getRandomValues(bytes);const input=document.getElementById(button.dataset.generate);input.value=Array.from(bytes,n=>alphabet[n%alphabet.length]).join("");input.type="text";return;}
    if(button.id==="show-receipt"){$("#receipt-password").type=$("#receipt-password").type==="password"?"text":"password";button.textContent=$("#receipt-password").type==="password"?"نمایش رمز":"پنهان کردن رمز";return;}
    if(button.id==="copy-receipt"){await navigator.clipboard.writeText("شماره موبایل: "+$("#receipt-email").value+"\nرمز عبور: "+$("#receipt-password").value);notice("اطلاعات ورود کپی شد.");return;}
    if(button.id==="logout"){await api("logout",{});signOut();return;}
    if(button.id==="own-password"){dialog("تغییر رمز من",`<form id="own-password-form"><label for="current-password">رمز فعلی</label><input id="current-password" name="currentPassword" type="password" required maxlength="128" autocomplete="current-password" dir="ltr"><label for="new-password">رمز جدید</label><input id="new-password" name="password" type="password" minlength="12" maxlength="128" required autocomplete="new-password" dir="ltr"><p class="hint">پس از ذخیره، با رمز جدید دوباره وارد شوید.</p><p class="error" role="alert" hidden data-form-error></p><div class="dialog-actions"><button class="primary" type="submit">ذخیرهٔ رمز جدید</button><button class="outline" type="button" data-close>انصراف</button></div></form>`);return;}
    if(button.dataset.view){setView(button.dataset.view);return state.view==='audit'?await loadAudit():await loadDoctors();}
    if(button.dataset.doctorPage){state.page=Number(button.dataset.doctorPage);await loadDoctors();}
    if(button.dataset.auditPage){state.auditPage=Number(button.dataset.auditPage);await loadAudit();}
    if(button.dataset.patientPage){state.patientPage=Number(button.dataset.patientPage);await loadPatients();}
  }catch(error){notice(error.message);}
});
document.addEventListener("submit",async event=>{
  const form=event.target;if(!["doctor-form","reset-form","revoke-form","own-password-form","patient-form","account-action-form"].includes(form.id))return;
  event.preventDefault();const button=form.querySelector("button[type=submit]"),errorBox=form.querySelector("[data-form-error]");button.disabled=true;errorBox.hidden=true;
  try{
    const fields=Object.fromEntries(new FormData(form));
    if(form.id==="doctor-form"){
      const data={...fields,doctorId:form.dataset.id,disabled:fields.disabled==="true",permissions:new FormData(form).getAll("permissions")};
      await api(form.dataset.id?"admin.doctor.update":"admin.doctor.create",data);
      if(form.dataset.id){closeDialog();notice("حساب و دسترسی‌ها ذخیره شدند.");}else{credentialReceipt(fields.phone,fields.password,"حساب پزشک ساخته شد");}
    }else if(form.id==='patient-form'){
      await api('admin.patient.update',{...fields,patientId:form.dataset.id,doctorId:form.dataset.doctorId});closeDialog();notice('اطلاعات بیمار ذخیره شد.');
    }else if(form.id==='account-action-form'){
      const restore=form.dataset.restore==='true',kind=form.dataset.kind;
      const result=await api('admin.'+kind+(restore?'.restore':'.delete'),kind==='doctor'?{doctorId:form.dataset.id}:{doctorId:form.dataset.doctorId,patientId:form.dataset.id});
      closeDialog();notice(restore?'حساب بازیابی شد.':'حساب به حذف‌شده‌ها منتقل شد.');
      if(kind==='doctor'&&state.view==='patients'){state.patientStatus=restore?'active':'deleted';state.patientPage=1;$('#patient-search-form select').value=state.patientStatus;}
      if(kind==='doctor'&&result.affectedPatients)notice((restore?'حساب پزشک و ':'پزشک و ')+number(result.affectedPatients)+(restore?' بیمار وابسته بازیابی شدند.':' بیمار وابسته به حذف‌شده‌ها منتقل شدند.'));
    }else if(form.id==="reset-form"){
      const doctor=state.doctors.find(d=>d.id===form.dataset.id);await api("admin.doctor.reset-password",{doctorId:doctor.id,password:fields.password});credentialReceipt(doctor.username||doctor.phone,fields.password,"رمز جدید ثبت شد");
    }else if(form.id==="revoke-form"){await api("admin.doctor.revoke-sessions",{doctorId:form.dataset.id});closeDialog();notice("نشست‌های پزشک بسته شدند.");}
    else{await api("admin.password",fields);signOut();notice("رمز تغییر کرد؛ با رمز جدید وارد شوید.");return;}
    await refreshManagement();
  }catch(error){if(form.isConnected){errorBox.textContent=error.message;errorBox.hidden=false;}else notice(error.message);}finally{button.disabled=false;}
});
$("#editor-dialog").addEventListener("close",()=>{if(!$("#editor-dialog").open)$("#dialog-body").replaceChildren();});
(async()=>{
  try{const result=await api("me");await enter(result.user);}
  catch(error){if(!state.user)signOut();else notice(error.message);}
})();
