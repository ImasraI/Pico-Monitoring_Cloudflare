import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {adminFixture,createDoctorFixture,permissionKeys} from './account-fixture.mjs';
const base=process.env.DANTO_TEST_URL||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Synthetic account management tests only run on localhost.');
let checks=0;const stamp=Date.now(),suffix=String(stamp%100000000).padStart(8,'0'),pass='TestPassword123!',nationalId='0012345678';
async function call(actor,op,data,params={}){
 const r=await fetch(base+'/api?'+new URLSearchParams({op,...params}),{method:data===undefined?'GET':'POST',headers:{Origin:base,Cookie:actor?.cookie||'',...(data===undefined||data instanceof FormData?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:data instanceof FormData?data:JSON.stringify({op,...data})});
 const result={status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};return result;
}
async function expect(request,status=200){const r=await request;assert.equal(r.status,status,JSON.stringify(r.body));checks++;return r;}
async function login(phone,password=pass){return expect(call(null,'login',{identifier:phone,password}));}
const admin=await adminFixture(base),doctor=await createDoctorFixture(base,admin,{name:'پزشک نمونه مدیریت بیماران',email:'',password:pass,patientLimit:2}),other=await createDoctorFixture(base,admin,{name:'پزشک دوم مدیریت بیماران',email:'',password:pass});
let doctorActor=await login(doctor.username),otherActor=await login(other.username);
async function createPatient(prefix,name){const f=new FormData();Object.entries({op:'patient.create',name,phone:prefix+suffix,nationalId,birthDate:'2010-01-01'}).forEach(([k,v])=>f.set(k,v));return(await expect(call(doctorActor,'patient.create',f),201)).body.patient;}
const first=await createPatient('091','بیمار اول نمونه'),second=await createPatient('092','بیمار دوم نمونه');let patientActor=await login(first.username,nationalId);
const scope={doctorId:doctor.id,patientId:first.id};
await expect(call(null,'admin.patients',undefined,{doctorId:doctor.id}),401);
for(const actor of [doctorActor,otherActor,patientActor]){
 await expect(call(actor,'admin.patients',undefined,{doctorId:doctor.id}),403);
 await expect(call(actor,'admin.patient',undefined,scope),403);
 for(const op of ['admin.patient.update','admin.patient.delete','admin.patient.restore','admin.doctor.delete','admin.doctor.restore'])await expect(call(actor,op,{...scope,name:'غیرمجاز'}),403);
}
await expect(call(admin,'admin.patient',undefined,{...scope,doctorId:other.id}),404);
await expect(call(admin,'admin.patient.delete',{...scope,doctorId:other.id}),404);
await expect(call(admin,'admin.doctor.delete',{doctorId:admin.user.id}),404);
const list=(await expect(call(admin,'admin.patients',undefined,{doctorId:doctor.id}))).body;
assert.equal(list.total,2);assert.equal(list.doctor.id,doctor.id);assert.ok(!JSON.stringify(list).includes('password'));checks++;
const filtered=(await expect(call(admin,'admin.patients',undefined,{doctorId:doctor.id,q:first.username}))).body;assert.equal(filtered.total,1);assert.equal(filtered.patients[0].id,first.id);checks++;
assert.equal((await expect(call(admin,'admin.patients',undefined,{doctorId:doctor.id,q:first.username.replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[Number(n)])}))).body.total,1);checks++;
await expect(call(admin,'admin.patient.update',{...scope,name:'بیمار اول ویرایش شده',gender:'female',address:'نشانی نمونه',healthHistory:'سابقه آزمایشی',allergies:'حساسیت آزمایشی',medications:'داروی آزمایشی',treatmentType:'aligner',alignerCount:'3',doctorNote:'یادداشت خصوصی آزمایشی',planNote:'طرح آزمایشی'}));
let profile=(await expect(call(admin,'admin.patient',undefined,scope))).body.patient;assert.equal(profile.name,'بیمار اول ویرایش شده');assert.equal(profile.national_id,nationalId);assert.equal(profile.aligner_count,3);assert.equal(profile.doctor_note,'یادداشت خصوصی آزمایشی');checks++;
const personal=(await expect(call(patientActor,'patient.personal',undefined,{patientId:first.id}))).body;assert.equal(personal.profile.address,'نشانی نمونه');assert.ok(!Object.hasOwn(personal.profile,'doctor_note'));checks++;
await expect(call(admin,'admin.patient.update',{...scope,nationalId:'123'}),400);
await expect(call(admin,'admin.patient.update',{...scope,birthDate:'2010-02-30'}),400);
await expect(call(admin,'admin.patient.update',{...scope,phone:other.username,name:'نام ناموفق'}),409);
profile=(await expect(call(admin,'admin.patient',undefined,scope))).body.patient;assert.equal(profile.name,'بیمار اول ویرایش شده');checks++;
const newPhone='093'+suffix;
await expect(call(admin,'admin.patient.update',{...scope,phone:('+98'+newPhone.slice(1)).replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[Number(n)]),nationalId:'۰۰۹۸۷۶۵۴۳۲',allergies:'',doctorNote:''}));
await expect(call(patientActor,'me'),401);await expect(call(null,'login',{identifier:first.username,password:nationalId}),401);
patientActor=await login(newPhone,nationalId);await expect(call(null,'login',{identifier:newPhone,password:'0098765432'}),401);
profile=(await expect(call(admin,'admin.patient',undefined,scope))).body.patient;assert.equal(profile.national_id,'0098765432');assert.equal(profile.allergies,'');assert.equal(profile.health_history,'سابقه آزمایشی');checks++;
const image=new Uint8Array(160);image.set([137,80,78,71,13,10,26,10]);const upload=new FormData();upload.set('op','patient.file.add');upload.set('patientId',first.id);upload.set('file:oral',new File([image],'synthetic.png',{type:'image/png'}));
const file=(await expect(call(doctorActor,'patient.file.add',upload),201)).body.files[0];
await expect(call(doctorActor,'step.create',{patientId:first.id,title:'مرحله آزمایشی',dueAt:Date.now()+86400000}),201);
const before=(await expect(call(admin,'admin.summary'))).body.summary;
await expect(call(admin,'admin.patient.delete',scope));await expect(call(admin,'admin.patient.delete',scope),409);
await expect(call(patientActor,'me'),401);await expect(call(null,'login',{identifier:newPhone,password:nationalId}),401);
await expect(call(doctorActor,'patient.record',undefined,{patientId:first.id}),404);
assert.equal((await call(doctorActor,'patients')).body.patients.length,1);checks++;
assert.equal((await fetch(base+'/api?op=patient.file&fileId='+file.id,{headers:{Cookie:doctorActor.cookie}})).status,404);checks++;
let deleted=(await expect(call(admin,'admin.patients',undefined,{doctorId:doctor.id,status:'deleted'}))).body;assert.equal(deleted.total,1);checks++;
assert.equal((await expect(call(admin,'admin.summary'))).body.summary.patients,before.patients-1);checks++;
const third=await createPatient('094','بیمار سوم نمونه');await expect(call(admin,'admin.patient.restore',scope),409);
await expect(call(admin,'admin.patient.delete',{doctorId:doctor.id,patientId:third.id}));await expect(call(admin,'admin.patient.restore',scope));
patientActor=await login(newPhone,nationalId);
assert.equal((await fetch(base+'/api?op=patient.file&fileId='+file.id,{headers:{Cookie:doctorActor.cookie}})).status,200);checks++;
assert.equal((await expect(call(doctorActor,'steps',undefined,{patientId:first.id}))).body.steps.length,1);checks++;
const removed=await expect(call(admin,'admin.doctor.delete',{doctorId:doctor.id}));assert.equal(removed.body.affectedPatients,2);checks++;
await expect(call(doctorActor,'me'),401);await expect(call(patientActor,'me'),401);await expect(call(null,'login',{identifier:doctor.username,password:pass}),401);
await expect(call(admin,'admin.patient.restore',scope),409);
deleted=(await expect(call(admin,'admin.patients',undefined,{doctorId:doctor.id,status:'deleted'}))).body;assert.equal(deleted.total,3);checks++;
const doctors=(await expect(call(admin,'admin.doctors',undefined,{q:doctor.username}))).body;assert.equal(doctors.total,0);checks++;
const trash=(await expect(call(admin,'admin.doctors',undefined,{q:doctor.username,status:'deleted'}))).body;assert.equal(trash.total,1);checks++;
const race=await Promise.all([call(admin,'admin.doctor.restore',{doctorId:doctor.id}),call(admin,'admin.doctor.restore',{doctorId:doctor.id})]);assert.equal(race.filter(r=>r.status===200).length,1);assert.ok(race.every(r=>[200,409].includes(r.status)));checks++;
doctorActor=await login(doctor.username);patientActor=await login(newPhone,nationalId);
assert.equal((await expect(call(doctorActor,'patients'))).body.patients.length,2);checks++;
deleted=(await expect(call(admin,'admin.patients',undefined,{doctorId:doctor.id,status:'deleted'}))).body;assert.equal(deleted.total,1);assert.equal(deleted.patients[0].id,third.id);checks++;
await expect(call(admin,'admin.doctor.update',{doctorId:other.id,name:other.name,phone:other.username,clinic:'مطب نمونه',permissions:permissionKeys,patientLimit:null,disabled:true}));
await expect(call(admin,'admin.doctor.delete',{doctorId:other.id}));await expect(call(admin,'admin.doctor.restore',{doctorId:other.id}));
const suspended=(await expect(call(admin,'admin.doctors',undefined,{q:other.username}))).body.doctors[0];assert.equal(suspended.disabled,1);checks++;
const audit=(await expect(call(admin,'admin.audit'))).body.audit;assert.ok(audit.some(a=>a.action==='admin.patient.update'));assert.ok(!JSON.stringify(audit).includes('سابقه آزمایشی'));assert.ok(!JSON.stringify(audit).includes(nationalId));checks++;
await mkdir('work',{recursive:true});await writeFile('work/admin-patients-case.json',JSON.stringify({doctorId:doctor.id,doctorName:doctor.name,doctorPhone:doctor.username,patientId:first.id,patientName:'بیمار اول ویرایش شده',patientPhone:newPhone}));
for(const actor of [patientActor,doctorActor,otherActor,admin])await call(actor,'logout',{});
console.log(`PASS ${checks} administrator patient checks: role boundaries, scoped search, identity and clinical edits, preserved passwords, revoked sessions, private files, capacity, recoverable deletion, concurrent restoration and audit privacy.`);
