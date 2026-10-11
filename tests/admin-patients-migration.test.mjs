import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFile} from 'node:fs/promises';
test('deletion migration preserves identities and makes patient capacity and restoration consistent',async()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,role TEXT,doctor_id TEXT,created_at INTEGER);INSERT INTO users VALUES ('doctor','Existing doctor','doctor',NULL,1),('patient','Existing patient','patient','doctor',2);");
 db.exec(await readFile(new URL('../drizzle/0006_admin_accounts.sql',import.meta.url),'utf8'));
 db.exec(await readFile(new URL('../drizzle/0008_admin_patient_management.sql',import.meta.url),'utf8'));
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n,2);assert.equal(db.prepare("SELECT deleted_at FROM users WHERE id='patient'").get().deleted_at,null);
 db.exec("UPDATE doctor_access SET patient_limit=1 WHERE doctor_id='doctor';UPDATE users SET deleted_at=3,disabled=1 WHERE id='patient';INSERT INTO users(id,role,doctor_id,created_at) VALUES ('replacement','patient','doctor',4)");
 assert.throws(()=>db.exec("UPDATE users SET deleted_at=NULL WHERE id='patient'"),/doctor_patient_limit/);
 db.exec("UPDATE users SET deleted_at=5 WHERE id='replacement';UPDATE users SET deleted_at=NULL,disabled=0 WHERE id='patient'");
 db.exec("UPDATE users SET deleted_at=6 WHERE id='patient';UPDATE users SET deleted_at=6 WHERE id='doctor'");
 assert.throws(()=>db.exec("UPDATE users SET deleted_at=NULL WHERE id='patient'"),/doctor_deleted/);
 assert.throws(()=>db.exec("INSERT INTO users(id,role,doctor_id,created_at) VALUES ('late','patient','doctor',7)"),/doctor_deleted/);
 db.close();
});
