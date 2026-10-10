import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFile} from 'node:fs/promises';
test('admin migration preserves existing doctor and patient identities and grants',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,role TEXT,doctor_id TEXT,created_at INTEGER);INSERT INTO users VALUES ('legacy-doctor','Existing doctor','doctor',NULL,1),('legacy-patient','Existing patient','patient','legacy-doctor',2);");
 db.exec(await readFile(new URL('../drizzle/0006_admin_accounts.sql',import.meta.url),'utf8'));
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users").get().n,2);
 const doctor=db.prepare("SELECT * FROM users WHERE id='legacy-doctor'").get();assert.equal(doctor.role,'doctor');assert.equal(doctor.disabled,0);assert.equal(doctor.auth_version,0);
 const access=db.prepare("SELECT * FROM doctor_access WHERE doctor_id='legacy-doctor'").get();assert.equal(JSON.parse(access.permissions).length,6);assert.equal(access.patient_limit,null);
 assert.equal(db.prepare("SELECT doctor_id FROM users WHERE id='legacy-patient'").get().doctor_id,'legacy-doctor');
 db.exec("INSERT INTO users(id,role,created_at) VALUES ('admin-1','admin',3)");
 assert.throws(()=>db.exec("INSERT INTO users(id,role,created_at) VALUES ('admin-2','admin',4)"),/UNIQUE/);
 db.exec("UPDATE doctor_access SET patient_limit=1 WHERE doctor_id='legacy-doctor'");
 assert.throws(()=>db.exec("INSERT INTO users(id,role,doctor_id,created_at) VALUES ('new-patient','patient','legacy-doctor',5)"),/doctor_patient_limit/);
 db.close();
});
