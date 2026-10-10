import assert from 'node:assert/strict';
import {localAdminKey} from './account-fixture.mjs';
const base=process.env.DANTO_BOOTSTRAP_TEST_URL;
if(!base||!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Provide DANTO_BOOTSTRAP_TEST_URL for an isolated, empty local database.');
const status=await fetch(base+'/api?op=admin.bootstrap.status').then(r=>r.json());
assert.equal(status.initialized,false,'Use a separate empty database for bootstrap tests.');
const stamp=Date.now(),data={name:'ادمین آزمایش راه‌اندازی',email:'bootstrap-'+stamp+'@example.test',password:'TestPassword123!',setupKey:localAdminKey};
async function post(body){const r=await fetch(base+'/api',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({op:'admin.bootstrap',...body})});return{status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
assert.equal((await post({...data,setupKey:'incorrect-key'})).status,403);
assert.equal((await post({...data,password:'short'})).status,400);
const race=await Promise.all([post(data),post({...data,email:'bootstrap-second-'+stamp+'@example.test'})]);
assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
const winner=race.find(r=>r.status===200);assert.equal(winner.body.user.role,'admin');
assert.equal((await fetch(base+'/api?op=admin.summary',{headers:{Cookie:winner.cookie}})).status,200);
assert.equal((await fetch(base+'/api?op=admin.bootstrap.status').then(r=>r.json())).initialized,true);
assert.equal((await post(data)).status,409);
let limited=false;for(let i=0;i<10;i++){const r=await post({...data,setupKey:'incorrect-key'});if(r.status===429){limited=true;break;}assert.equal(r.status,409);}
assert.equal(limited,true);
console.log('PASS bootstrap: wrong key, password validation, concurrent one-time initialization, admin session and status, permanently closed bootstrap, attempt throttling.');
