import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {adminFixture,createDoctorFixture} from './account-fixture.mjs';
const base=process.env.DANTO_TEST_URL||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Password integration testing only runs on localhost.');
let checks=0;
async function call(op,data,cookie='',origin=base) {
 const response=await fetch(base+'/api?op='+op,{method:data===undefined?'GET':'POST',headers:{Origin:origin,Cookie:cookie,...(data===undefined||data instanceof FormData?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:data instanceof FormData?data:JSON.stringify({op,...data})});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],cookieHeader:response.headers.get('set-cookie')};
}
async function expect(result,status) {const r=await result;assert.equal(r.status,status,JSON.stringify(r.body));checks++;return r;}
const admin=await adminFixture(base),stamp=Date.now(),original='TestPassword123!',nationalId='0012345678';
const doctor=await createDoctorFixture(base,admin,{name:'پزشک آزمون تغییر رمز',email:'',password:original});
let doctorLogin=await expect(call('login',{identifier:doctor.username,password:original}),200);
async function createPatient(phone){
 const form=new FormData();Object.entries({op:'patient.create',name:'بیمار آزمون تغییر رمز',phone,nationalId,birthDate:'2010-02-01'}).forEach(([k,v])=>form.set(k,v));
 return (await expect(call('patient.create',form,doctorLogin.cookie),201)).body.patient;
}
const phone='096'+String(stamp%100000000).padStart(8,'0'),patient=await createPatient(phone),limited=await createPatient('095'+phone.slice(3));
await expect(call('account.password',{currentPassword:nationalId,password:'MyPass88'}),401);
const first=await expect(call('login',{identifier:phone,password:nationalId}),200),second=await expect(call('login',{identifier:phone,password:nationalId}),200);
await expect(call('account.password',{currentPassword:nationalId,password:'short'},first.cookie),400);
await expect(call('account.password',{currentPassword:nationalId,password:'a'.repeat(129)},first.cookie),400);
await expect(call('account.password',{currentPassword:'incorrect',password:'MyPass88'},first.cookie),403);
await expect(call('account.password',{currentPassword:nationalId,password:'MyPass88',userId:doctor.id},first.cookie),403);
await expect(call('account.password',{currentPassword:original,password:'Replacement123!',patientId:patient.id},doctorLogin.cookie),403);
const changed=await expect(call('account.password',{currentPassword:nationalId,password:'MyPass88'},first.cookie),200);
assert.equal(changed.body.signInAgain,true);assert.match(changed.cookieHeader,/Max-Age=0/);checks++;
await expect(call('me',undefined,first.cookie),401);await expect(call('me',undefined,second.cookie),401);
await expect(call('login',{identifier:phone,password:nationalId}),401);
const renewed=await expect(call('login',{identifier:phone,password:'MyPass88'}),200);assert.equal(renewed.body.user.id,patient.id);checks++;
const profile=await fetch(base+'/api?op=patient.personal&patientId='+patient.id,{headers:{Cookie:renewed.cookie}}).then(r=>r.json());
assert.equal(profile.profile.national_id,nationalId);assert.equal(profile.profile.phone,phone);checks++;
const choices=['NextPass8','NextPass9'];
const race=await Promise.all(choices.map(password=>call('account.password',{currentPassword:'MyPass88',password},renewed.cookie)));
assert.equal(race.filter(r=>r.status===200).length,1);assert.ok(race.every(r=>[200,401,403,409].includes(r.status)));checks++;
const winner=choices[race.findIndex(r=>r.status===200)],afterRace=await expect(call('login',{identifier:phone,password:winner}),200);
await expect(call('account.password',{currentPassword:winner,password:'۰۰۹۸۷۶۵۴۳۲'},afterRace.cookie),200);
const numeric=await expect(call('login',{identifier:phone,password:'0098765432'}),200);
await expect(call('login',{identifier:phone,password:'۰۰۹۸۷۶۵۴۳۲'}),200);
await expect(call('account.password',{currentPassword:'٠٠٩٨٧٦٥٤٣٢',password:'PatientPass8'},numeric.cookie),200);
await expect(call('login',{identifier:phone,password:'0098765432'}),401);
const final=await expect(call('login',{identifier:phone,password:'PatientPass8'}),200);
const lock=await expect(call('login',{identifier:limited.username,password:nationalId}),200);
for(let i=0;i<8;i++)await expect(call('account.password',{currentPassword:'incorrect',password:'ValidPass8'},lock.cookie),403);
await expect(call('account.password',{currentPassword:nationalId,password:'ValidPass8'},lock.cookie),429);
await expect(call('admin.doctor.update',{doctorId:doctor.id,name:doctor.name,phone:doctor.username,email:'',permissions:[],patientLimit:null,disabled:false},admin.cookie),200);
await expect(call('account.password',{currentPassword:original,password:'MyPass88'},doctorLogin.cookie),400);
await expect(call('account.password',{currentPassword:original,password:'DoctorChanged123!'},doctorLogin.cookie),200);
await expect(call('me',undefined,doctorLogin.cookie),401);
doctorLogin=await expect(call('login',{identifier:doctor.username,password:'DoctorChanged123!'}),200);
await expect(call('login',{identifier:doctor.username,password:original}),401);
// Rejection must preserve both the active session and the current password.
await expect(call('account.password',{currentPassword:'PatientPass8',password:'UnexpectedPass8'},final.cookie,'https://different.example'),403);
await expect(call('me',undefined,final.cookie),200);
await expect(call('login',{identifier:phone,password:'UnexpectedPass8'}),401);
const afterCsrf=await expect(call('login',{identifier:phone,password:'PatientPass8'}),200);
await mkdir('work',{recursive:true});await writeFile('work/password-case.json',JSON.stringify({phone,password:'PatientPass8',patientId:patient.id}));
await call('logout',{},afterCsrf.cookie);await call('logout',{},final.cookie);await call('logout',{},doctorLogin.cookie);await call('logout',{},admin.cookie);
console.log(`PASS ${checks} password checks: initial national ID, eight-character patient password, self-only changes, current-password verification, CSRF, concurrent changes, revoked sessions, normalized digits and throttling.`);
