import {deflateSync} from 'node:zlib';import assert from 'node:assert/strict';
const base=process.env.DANTO_TEST_URL||'http://127.0.0.1:4173';if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Integration tests only run against a local preview.');const stamp=Date.now(),setupKey=process.env.DANTO_TEST_SETUP_KEY||'local-layout-test';const d={cookie:''},p={cookie:''},other={cookie:''};let checks=0;
async function req(actor,op,data,params={}){const r=await fetch(base+'/api?'+new URLSearchParams({op,...params}),{method:data===undefined?'GET':'POST',headers:{Cookie:actor.cookie,Origin:base,...(data===undefined||data instanceof FormData?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:data instanceof FormData?data:JSON.stringify({op,...data})});if(r.headers.get('set-cookie'))actor.cookie=r.headers.get('set-cookie').split(';')[0];return{status:r.status,body:await r.json()};}
async function ok(a,op,b,params){const r=await req(a,op,b,params);assert.ok(r.status<300,op+' '+JSON.stringify(r));checks++;return r.body;}
async function rejects(a,op,b,status,params){assert.equal((await req(a,op,b,params)).status,status,op);checks++;}
await ok(d,'setup',{email:'rewards-doctor-'+stamp+'@example.test',name:'پزشک آزمون',password:'TestPassword123!',setupKey});await ok(other,'setup',{email:'rewards-other-'+stamp+'@example.test',name:'پزشک دیگر آزمون',password:'TestPassword123!',setupKey});
const phone='094'+String(Date.now()%100000000).padStart(8,'0'),nationalId='0012345678',f=new FormData();Object.entries({op:'patient.create',name:'آزمون امتیاز لبخند',phone,nationalId,birthDate:'2014-01-01'}).forEach(([k,v])=>f.set(k,v));
const id=(await ok(d,'patient.create',f)).patient.id;await ok(p,'login',{identifier:phone,password:nationalId});await ok(p,'patient.personal',{patientId:id,gender:'female',address:'نمونه آزمایشی'});await ok(d,'patient.profile',{patientId:id,treatmentType:'aligner',alignerCount:12});
const summary=()=>ok(p,'rewards',undefined,{patientId:id});const steps=()=>ok(p,'steps',undefined,{patientId:id});const post=(op,data)=>ok(d,op,{patientId:id,...data});
let s=await summary();assert.equal(s.mode,'teen');assert.equal(s.total,0);assert.equal(s.rules.scan_points,20);
await rejects(other,'rewards',undefined,404,{patientId:id});await rejects(p,'rewards.rules',{patientId:id,alignerPoints:100,scanPoints:100,latePoints:5,bonusPoints:10},403);
await rejects(p,'rewards.preferences',{patientId:id,mode:'child',target:100,color:'gold',accessory:'none'},409);
await ok(p,'rewards.preferences',{patientId:id,mode:'adult',target:200,color:'mint',accessory:'none'});assert.equal((await summary()).mode,'adult');
await post('plan.create',{events:[{title:'الاینر زودهنگام',eventType:'aligner',alignerNo:1,dueAt:Date.now()+86400000}]});let [early]=(await steps()).steps;
await rejects(p,'step.complete',{patientId:id,stepId:early.id},409);await post('plan.pause',{stepId:early.id,paused:true});
await rejects(p,'step.complete',{patientId:id,stepId:early.id},409);
await post('plan.create',{events:[{title:'الاینر دوم',eventType:'aligner',alignerNo:2,dueAt:Date.now()+3600000,opensAt:Date.now()-1000},{title:'الاینر سوم',eventType:'aligner',alignerNo:3,dueAt:Date.now()+7200000,opensAt:Date.now()-1000}]});
let al=(await steps()).steps.filter(x=>x.aligner_no>=2);await rejects(p,'step.complete',{patientId:id,stepId:al[1].id},409);
// A real PNG containing a small solid test image, with no patient information.
function crc(b){let c=0xffffffff;for(const byte of b){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(name,data){const type=Buffer.from(name),len=Buffer.alloc(4),checksum=Buffer.alloc(4);len.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([len,type,data,checksum]);}
const header=Buffer.alloc(13);header.writeUInt32BE(3,0);header.writeUInt32BE(3,4);header[8]=8;header[9]=6;const raw=Buffer.alloc(3*13);for(let y=0;y<3;y++)for(let x=0;x<3;x++){const at=y*13+1+x*4;raw.set([85,199,178,255],at);}const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('tEXt',Buffer.from('Description\0Synthetic scan fixture')),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);const upload=stepId=>{const f=new FormData();f.set('op','scan.create');if(stepId)f.set('stepId',stepId);f.set('front',new Blob([png],{type:'image/png'}),'scan.png');return f;};
const deadline=Date.now()+6000;await post('plan.create',{events:[{title:'اسکن دوره‌ای',eventType:'scan',dueAt:deadline,opensAt:Date.now()-1000}]});let scanStep=(await steps()).steps.find(x=>x.event_type==='scan');
await rejects(p,'step.complete',{patientId:id,stepId:scanStep.id},409);
let scan=(await ok(p,'scan.create',upload(scanStep.id))).scan;await rejects(p,'scan.create',upload(scanStep.id),409);assert.equal((await summary()).total,0);assert.equal((await summary()).pending,1);
await rejects(other,'scan.review',{patientId:id,scanId:scan.id,decision:'accepted'},404);
await post('plan.pause',{stepId:scanStep.id,paused:true});
await rejects(d,'scan.review',{patientId:id,scanId:scan.id,decision:'accepted'},409);
await rejects(p,'scan.create',upload(scanStep.id),409);
await post('plan.pause',{stepId:scanStep.id,paused:false});
await rejects(d,'scan.review',{patientId:id,scanId:scan.id,decision:'recapture'},400);
await post('scan.review',{scanId:scan.id,decision:'recapture',note:'زاویه روبرو مجدداً ارسال شود'});
await rejects(d,'plan.update',{patientId:id,stepId:scanStep.id,title:'زمان متفاوت',dueAt:Date.now()+9999999},409);
await new Promise(r=>setTimeout(r,Math.max(0,deadline-Date.now()+300)));
scan=(await ok(p,'scan.create',upload(scanStep.id))).scan;
await post('rewards.rules',{alignerPoints:10,scanPoints:30,latePoints:5,bonusPoints:10});
await post('scan.review',{scanId:scan.id,decision:'accepted',note:'تصاویر قابل استفاده است'});
s=await summary();assert.equal(s.total,20);assert.equal(s.pending,0);assert.equal((await steps()).steps.find(x=>x.id===scanStep.id).on_time,1);
await rejects(d,'scan.review',{patientId:id,scanId:scan.id,decision:'accepted'},409);await rejects(p,'scan.create',upload(scanStep.id),409);
const concurrent=await Promise.all([req(p,'step.complete',{patientId:id,stepId:al[0].id}),req(p,'step.complete',{patientId:id,stepId:al[0].id})]);assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,409]);checks++;
await ok(p,'step.complete',{patientId:id,stepId:al[1].id});s=await summary();assert.equal(s.total,50);assert.equal(s.streak,3);assert.equal(s.history.filter(x=>x.kind==='bonus').length,1);
await rejects(p,'step.complete',{patientId:id,stepId:al[1].id},409);assert.equal((await summary()).total,50);
await post('plan.create',{events:[{title:'ثبت دیرهنگام اسکن',eventType:'scan',dueAt:Date.now()-1000,opensAt:Date.now()-86400000}]});let late=(await steps()).steps.find(x=>x.title==='ثبت دیرهنگام اسکن');let ls=(await ok(p,'scan.create',upload(late.id))).scan;await post('scan.review',{scanId:ls.id,decision:'accepted'});assert.equal((await summary()).total,55);
await ok(p,'rewards.preferences',{patientId:id,mode:'child',target:100,color:'blue',accessory:'none'});assert.equal((await summary()).preferences.color,'blue');
const rid=crypto.randomUUID();await post('rewards.correct',{points:25,reason:'اصلاح با بررسی پرونده',requestId:rid});await post('rewards.correct',{points:25,reason:'اصلاح با بررسی پرونده',requestId:rid});assert.equal((await summary()).total,80);
await ok(p,'rewards.preferences',{patientId:id,mode:'child',target:100,color:'blue',accessory:'cap'});assert.equal((await summary()).preferences.accessory,'cap');
await rejects(d,'rewards.correct',{patientId:id,points:-500,reason:'اصلاح آزمایشی',requestId:crypto.randomUUID()},409);
await post('rewards.correct',{points:-10,reason:'اصلاح مقدار ثبت‌شده',requestId:crypto.randomUUID()});s=await summary();assert.equal(s.total,70);assert.equal(s.lifetime,80);assert.equal(s.preferences.accessory,'cap');assert.ok(s.history.find(x=>x.kind==='correction').creator_name);
await rejects(d,'rewards.rules',{patientId:id,alignerPoints:10,scanPoints:20,latePoints:30,bonusPoints:10},400);
await ok(p,'rewards.preferences',{patientId:id,mode:'adult',target:100,color:'blue',accessory:'cap'});await ok(p,'logout',{});await ok(p,'login',{identifier:phone,password:nationalId});assert.equal((await summary()).mode,'adult');
const free=(await ok(p,'scan.create',upload())).scan;await post('scan.review',{scanId:free.id,decision:'accepted'});assert.equal((await summary()).total,70);
const legacy={cookie:''};const invitation=await ok(d,'invite',{email:'legacy-'+stamp+'@example.test',name:'حساب ایمیلی آزمون'});await ok(legacy,'accept',{invite:invitation.invite,password:'TestPassword123!'});await ok(legacy,'logout',{});await ok(legacy,'login',{email:'legacy-'+stamp+'@example.test',password:'TestPassword123!'});const u=await ok(legacy,'me');const oldSteps=await ok(legacy,'steps',undefined,{patientId:u.user.id});const oldPoints=oldSteps.steps.reduce((a,b)=>a+b.points_awarded,0);assert.equal((await ok(legacy,'rewards',undefined,{patientId:u.user.id})).total,oldPoints);
const g=new FormData(),phone2='095'+phone.slice(3);Object.entries({op:'patient.create',name:'آزمون گروه‌های پاداش',phone:phone2,nationalId,birthDate:'2018-06-01'}).forEach(([k,v])=>g.set(k,v));const id2=(await ok(d,'patient.create',g)).patient.id,q={cookie:''};await ok(q,'login',{identifier:phone2,password:nationalId});assert.equal((await ok(q,'rewards',undefined,{patientId:id2})).mode,'child');
await ok(d,'patient.profile',{patientId:id2,treatmentType:'aligner',alignerCount:5});
const now=Date.now();await ok(d,'plan.create',{patientId:id2,events:[{title:'الاینر یک',eventType:'aligner',alignerNo:1,dueAt:now+3600000,opensAt:now+100000},{title:'اسکن دوم',eventType:'scan',dueAt:now+7200000,opensAt:now-1000},{title:'الاینر دو',eventType:'aligner',alignerNo:2,dueAt:now+10800000,opensAt:now-1000}]});
let rows2=(await ok(q,'steps',undefined,{patientId:id2})).steps;
await rejects(q,'step.complete',{patientId:id2,stepId:rows2[0].id},409);
await ok(d,'plan.update',{patientId:id2,stepId:rows2[0].id,title:rows2[0].title,dueAt:rows2[0].due_at,opensAt:now-1000});
await ok(q,'step.complete',{patientId:id2,stepId:rows2[0].id});
let sc=(await ok(q,'scan.create',upload(rows2[1].id))).scan;await ok(d,'scan.review',{patientId:id2,scanId:sc.id,decision:'accepted'});await ok(q,'step.complete',{patientId:id2,stepId:rows2[2].id});assert.equal((await ok(q,'rewards',undefined,{patientId:id2})).total,50);
async function addScan(title,due){await ok(d,'plan.create',{patientId:id2,events:[{title,eventType:'scan',dueAt:due,opensAt:now-1000}]});const row=(await ok(q,'steps',undefined,{patientId:id2})).steps.find(x=>x.title===title);const scan=(await ok(q,'scan.create',upload(row.id))).scan;await ok(d,'scan.review',{patientId:id2,scanId:scan.id,decision:'accepted'});}
await addScan('اسکن اضافه‌شده پیش از گروه قبلی',now+1800000);let secondSummary=await ok(q,'rewards',undefined,{patientId:id2});assert.equal(secondSummary.total,70);assert.equal(secondSummary.history.filter(x=>x.kind==='bonus').length,1);
await addScan('اسکن بعدی یک',now+14400000);await addScan('اسکن بعدی دو',now+18000000);secondSummary=await ok(q,'rewards',undefined,{patientId:id2});assert.equal(secondSummary.total,120);assert.equal(secondSummary.history.filter(x=>x.kind==='bonus').length,2);assert.ok(secondSummary.history.every(x=>x.kind!=='claim'));
console.log('PASS '+checks+' API checks: defaults and all age modes, ownership, early/paused aligners and rescheduled windows, scan upload and quality review, late review and recapture preserve first submission, replay/concurrency, nonoverlapping bonuses across schedule changes, late reward, preferences and unlocks, audit corrections and nonnegative balance, legacy points and free scan.');
