import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { adminFixture, createDoctorFixture, permissionKeys } from './account-fixture.mjs';

const base=process.env.DANTO_TEST_URL || 'http://127.0.0.1:4175';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local tests only');
let checks=0, sequence=0;
const doctor={},patient={},other={},anonymous={};
async function call(actor,op,data,params={}) {
  const form=data instanceof FormData;
  const response=await fetch(base+'/api?'+new URLSearchParams({op,...params}),{method:data===undefined?'GET':'POST',headers:{Origin:base,Cookie:actor.cookie||'',...(data===undefined||form?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:form?data:JSON.stringify({op,...data})});
  if(response.headers.has('set-cookie'))actor.cookie=response.headers.get('set-cookie').split(';')[0];
  return {status:response.status,body:await response.json()};
}
async function expect(actor,op,data,status=200,params){const result=await call(actor,op,data,params);assert.equal(result.status,status,op+': '+JSON.stringify(result));checks++;return result.body;}
const admin=await adminFixture(base),password='PortalTestPassword123!';
const account=await createDoctorFixture(base,admin,{name:'پزشک آزمون پرونده پیکو',password});
const outsider=await createDoctorFixture(base,admin,{name:'پزشک دیگر آزمون پرونده',password});
try {
  await expect(doctor,'login',{identifier:account.username,password});
  await expect(other,'login',{identifier:outsider.username,password});
  async function create(name) {const form=new FormData();for(const [key,value]of Object.entries({op:'patient.create',name,phone:'094'+String((Date.now()+sequence++)%100000000).padStart(8,'0'),nationalId:'0012345678',birthDate:'2010-01-01'}))form.set(key,value);return (await expect(doctor,'patient.create',form,201)).patient;}
  const person=await create('بیمار آزمایشی پرونده کامل'),second=await create('بیمار دوم آزمون پرونده');
  await expect(patient,'login',{identifier:person.username,password:'0012345678'});
  const params={patientId:person.id};
  assert.equal((await expect(patient,'portal.capabilities')).version,1);checks++;
  await expect(anonymous,'patient.intake',undefined,401,params);
  await expect(other,'patient.intake',undefined,404,params);
  await expect(admin,'patient.intake',undefined,404,params);
  const initial=await expect(patient,'patient.intake',undefined,200,params);
  assert.equal(initial.total,91);assert.equal(initial.revision,0);assert.equal(initial.answers.patient_name.value,person.name);checks+=3;
  const answers={...initial.answers,patient_name:{value:'نام جعلی',deferred:false},form_date:{value:'۱۴۰۵/۰۸/۱۰',deferred:false},relationship:{value:'خود بیمار',deferred:false},visit_goals:{value:['دریافت اطلاعات درباره ارتودنسی'],deferred:false},med_health_problem:{value:{answer:'بله',detail:'اطلاعات آزمایشی'},deferred:false},med_father_metrics:{value:{height:'۱۷۵',weight:'۷۰'},deferred:false},med_older_siblings:{value:{status:'دارد',entries:[{height:'۱۶۰',weight:'۵۰'}]},deferred:false},adult_height:{value:null,deferred:true}};
  let saved=await expect(patient,'patient.intake',{patientId:person.id,revision:0,answers});
  assert.equal(saved.answers.patient_name.value,person.name);assert.equal(saved.answers.form_date.value,'1405/08/10');assert.equal(saved.answers.med_father_metrics.value.height,'175');checks+=3;
  const seen=await expect(doctor,'patient.intake',undefined,200,params);assert.deepEqual(seen,saved);checks++;
  await expect(patient,'patient.intake',{patientId:person.id,revision:0,answers},409);
  await expect(other,'patient.intake',{patientId:person.id,revision:1,answers},404);
  await expect(patient,'patient.intake',{patientId:second.id,revision:0,answers},404);
  for(const invalid of [{unknown:{value:'x',deferred:false}},{relationship:{value:'invalid',deferred:false}},{form_date:{value:'1405/13/10',deferred:false}},{adult_height:{value:'900',deferred:false}},{visit_goals:{value:['invalid'],deferred:false}},{med_health_problem:{value:{answer:'invalid'},deferred:false}}])await expect(patient,'patient.intake',{patientId:person.id,revision:1,answers:invalid},400);
  saved=await expect(doctor,'patient.intake',{patientId:person.id,revision:1,answers:saved.answers,submit:true});
  assert.ok(saved.submittedAt&&saved.missing.length);checks++;
  await expect(admin,'admin.doctor.update',{doctorId:account.id,name:account.name,phone:account.username,clinic:'مطب آزمون',disabled:false,permissions:permissionKeys.filter(p=>p!=='patients.manage'),patientLimit:null});
  await expect(doctor,'login',{identifier:account.username,password});
  await expect(doctor,'patient.intake',{patientId:person.id,revision:saved.revision,answers:saved.answers},403);
  await expect(admin,'admin.doctor.update',{doctorId:account.id,name:account.name,phone:account.username,clinic:'مطب آزمون',disabled:false,permissions:permissionKeys,patientLimit:null});
  await expect(doctor,'login',{identifier:account.username,password});
  // Concurrent edits cannot overwrite each other, including first-write races.
  const revision=saved.revision;
  const race=await Promise.all([call(patient,'patient.intake',{patientId:person.id,revision,answers:saved.answers}),call(doctor,'patient.intake',{patientId:person.id,revision,answers:saved.answers})]);
  assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);checks++;
  const firstWrites=await Promise.all([call(doctor,'patient.intake',{patientId:second.id,revision:0,answers:{}}),call(doctor,'patient.intake',{patientId:second.id,revision:0,answers:{}})]);assert.deepEqual(firstWrites.map(r=>r.status).sort(),[200,409]);checks++;
  const m=(await expect(doctor,'message',{patientId:person.id,text:'پیام نمونه پزشک'},201)).message;
  const r=(await expect(patient,'message',{patientId:person.id,text:'پاسخ بیمار',replyToId:m.id},201)).message;
  const foreign=(await expect(doctor,'message',{patientId:second.id,text:'پیام بیمار دیگر'},201)).message;
  await expect(patient,'message',{patientId:person.id,text:'ارجاع نامعتبر',replyToId:foreign.id},404);
  const messages=(await expect(doctor,'messages',undefined,200,params)).messages;
  assert.equal(messages.find(item=>item.id===r.id).reply_body,m.body);checks++;
  function upload(file=true,subject='گزارش فوری آزمایشی'){const form=new FormData();form.set('op','scan.create');form.set('urgentSubject',subject);if(file)form.set('front',new File([file],'synthetic.png',{type:'image/png'}));return form;}
  await expect(patient,'scan.create',upload(false),400);
  await expect(patient,'scan.create',upload(new Uint8Array(120)),400);
  const before=(await expect(doctor,'messages',undefined,200,params)).messages.length;
  const bytes=Buffer.concat([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'),Buffer.alloc(64)]);
  const scan=(await expect(patient,'scan.create',upload(bytes),201)).scan;
  const report=(await expect(doctor,'messages',undefined,200,params)).messages;
  assert.equal(report.length,before+1);const linked=report.find(m=>m.scan_id===scan.id);assert.equal(linked.kind,'urgent');assert.equal(linked.subject,'گزارش فوری آزمایشی');checks+=3;
  await expect(other,'scans',undefined,404,params);
  await expect(doctor,'scan.create',upload(bytes),403);
  await expect(patient,'scan.create',upload(bytes,'ab'),400);
  await mkdir('work',{recursive:true});
  await writeFile('work/portal-case.json',JSON.stringify({doctorPhone:account.username,doctorId:account.id,patientPhone:person.username,patientId:person.id}));
  console.log(`PASS ${checks} portal checks: persistent intake, canonical identity, validation, ownership, permissions, concurrent edits, reply scoping, atomic urgent image reports.`);
} finally {for(const actor of [doctor,patient,other,admin])if(actor.cookie)await call(actor,'logout',{});}
