// Synthetic accounts only; never run integration fixtures against a hosted app.
export const localAdminKey = 'local-admin-bootstrap-test-key-2026';
export const permissionKeys = ['patients.manage','files.manage','treatment.manage','scans.review','messages.send','rewards.manage'];
export async function adminFixture(base) {
  if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Account fixtures only run on localhost.');
  const email=process.env.DANTO_TEST_ADMIN_EMAIL||'admin-integration@example.test';
  const password=process.env.DANTO_TEST_ADMIN_PASSWORD||'TestPassword123!';
  const status=await fetch(base+'/api?op=admin.bootstrap.status').then(r=>r.json());
  const response=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(status.initialized?{op:'login',identifier:email,password}:{op:'admin.bootstrap',name:'ادمین آزمون',email,password,setupKey:process.env.DANTO_TEST_ADMIN_SETUP_KEY||localAdminKey})});
  const result=await response.json();if(!response.ok)throw new Error('Admin fixture: '+JSON.stringify(result));
  return {cookie:response.headers.get('set-cookie').split(';')[0],user:result.user};
}
export async function createDoctorFixture(base,admin,fields) {
  const response=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Cookie:admin.cookie,Origin:base},body:JSON.stringify({op:'admin.doctor.create',clinic:'مطب آزمون',phone:'',permissions:permissionKeys,patientLimit:null,disabled:false,...fields})});
  const result=await response.json();if(!response.ok)throw new Error('Doctor fixture: '+JSON.stringify(result));return result.doctor;
}
