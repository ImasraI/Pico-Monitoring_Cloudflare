import assert from 'node:assert/strict';
import {adminFixture,createDoctorFixture,permissionKeys} from './account-fixture.mjs';
const base=process.env.DANTO_TEST_URL||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local integration testing only.');
let checks=0;
async function call(op,data,cookie='') {
 const r=await fetch(base+'/api?op='+op,{method:data===undefined?'GET':'POST',headers:{Origin:base,Cookie:cookie,...(data===undefined||data instanceof FormData?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:data instanceof FormData?data:JSON.stringify({op,...data})});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
const admin=await adminFixture(base);assert.equal(admin.user.role,'admin');checks++;
const adminPhone=process.env.DANTO_TEST_ADMIN_PHONE;
for(const identifier of [adminPhone,adminPhone.replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[Number(n)]),'+98'+adminPhone.slice(1),'0098'+adminPhone.slice(1)]) {
 const r=await call('login',{identifier,password:process.env.DANTO_TEST_ADMIN_PASSWORD,role:'patient'});
 assert.equal(r.status,200);assert.equal(r.body.user.id,admin.user.id);assert.equal(r.body.user.role,'admin');checks++;
 await call('logout',{},r.cookie);
}
assert.equal((await call('login',{identifier:'adminnn',password:process.env.DANTO_TEST_ADMIN_PASSWORD})).status,401);checks++;
assert.equal((await call('admin.bootstrap',{})).status,404);checks++;
assert.equal((await call('admin.bootstrap.status')).status,404);checks++;
const stamp=Date.now(),phone='098'+String(stamp%100000000).padStart(8,'0'),newPhone='097'+phone.slice(3),pass='MobileTestPassword123!';
const doctor=await createDoctorFixture(base,admin,{name:'پزشک آزمون ورود موبایل',phone:'+98'+phone.slice(1),email:'',password:pass});
assert.equal(doctor.username,phone);assert.equal(doctor.email,null);checks++;
const actor=await call('login',{identifier:phone,password:pass,role:'admin'});assert.equal(actor.status,200);assert.equal(actor.body.user.role,'doctor');checks++;
assert.equal((await call('admin.summary',undefined,actor.cookie)).status,403);checks++;
const fields={name:doctor.name,phone,permissions:permissionKeys,patientLimit:null,disabled:false,password:pass};
assert.equal((await call('admin.doctor.create',fields,admin.cookie)).status,409);checks++;
assert.equal((await call('admin.doctor.create',{...fields,phone:''},admin.cookie)).status,400);checks++;
assert.equal((await call('admin.doctor.create',{...fields,phone:adminPhone},admin.cookie)).status,409);checks++;
const before=await call('admin.doctors',undefined,admin.cookie);assert.equal(before.body.doctors.find(d=>d.id===doctor.id)?.username,phone);checks++;
assert.equal((await call('admin.doctor.update',{...fields,doctorId:doctor.id,phone:newPhone},admin.cookie)).status,200);checks++;
assert.equal((await call('me',undefined,actor.cookie)).status,401);checks++;
assert.equal((await call('login',{identifier:phone,password:pass})).status,401);checks++;
const updated=await call('login',{identifier:newPhone,password:pass});assert.equal(updated.status,200);assert.equal(updated.body.user.id,doctor.id);checks++;
const patientPhone='096'+phone.slice(3),nationalId='0012345678',form=new FormData();
Object.entries({op:'patient.create',name:'بیمار آزمون موبایل',phone:patientPhone,nationalId,birthDate:'2011-01-01'}).forEach(([k,v])=>form.set(k,v));
const patient=await call('patient.create',form,updated.cookie);assert.equal(patient.status,201);checks++;
const patientLogin=await call('login',{identifier:patientPhone.replace(/\d/g,n=>'٠١٢٣٤٥٦٧٨٩'[Number(n)]),password:nationalId.replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[Number(n)]),role:'admin'});
assert.equal(patientLogin.status,200);assert.equal(patientLogin.body.user.role,'patient');checks++;
assert.equal((await call('admin.doctors',undefined,patientLogin.cookie)).status,403);checks++;
const unknown='090'+phone.slice(3);
for(let i=0;i<8;i++){assert.equal((await call('login',{identifier:unknown,password:pass})).status,401);checks++;}
assert.equal((await call('login',{identifier:'+98'+unknown.slice(1),password:pass})).status,429);checks++;
await call('logout',{},updated.cookie);await call('logout',{},patientLogin.cookie);await call('logout',{},admin.cookie);
console.log(`PASS ${checks} mobile login checks: three roles, digit/country-code normalization, no bootstrap, duplicate phones, phone edits, session revocation and throttling.`);
