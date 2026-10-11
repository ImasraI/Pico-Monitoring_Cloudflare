// Synthetic accounts only; never run integration fixtures against a hosted app.
export const permissionKeys = ['patients.manage','files.manage','treatment.manage','scans.review','messages.send','rewards.manage'];
export async function adminFixture(base) {
  if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Account fixtures only run on localhost.');
  const identifier=process.env.DANTO_TEST_ADMIN_PHONE;
  const password=process.env.DANTO_TEST_ADMIN_PASSWORD;
  if(!identifier||!password)throw new Error('Set DANTO_TEST_ADMIN_PHONE and DANTO_TEST_ADMIN_PASSWORD for your local administrator.');
  const response=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({op:'login',identifier,password})});
  const result=await response.json();if(!response.ok)throw new Error('Admin fixture: '+JSON.stringify(result));
  return {cookie:response.headers.get('set-cookie').split(';')[0],user:result.user};
}
let fixtureSequence=0;
export async function createDoctorFixture(base,admin,fields) {
  const response=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Cookie:admin.cookie,Origin:base},body:JSON.stringify({op:'admin.doctor.create',clinic:'مطب آزمون',phone:'099'+String((Date.now()+fixtureSequence++)%100000000).padStart(8,'0'),permissions:permissionKeys,patientLimit:null,disabled:false,...fields})});
  const result=await response.json();if(!response.ok)throw new Error('Doctor fixture: '+JSON.stringify(result));return result.doctor;
}
