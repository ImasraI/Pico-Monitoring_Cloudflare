import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFile} from 'node:fs/promises';
const migration=await readFile(new URL('../drizzle/0007_unified_mobile_login.sql',import.meta.url),'utf8');
async function database(){
 const db=new DatabaseSync(':memory:');
 for(const name of ['0000_nappy_warbound','0001_famous_runaways','0002_lazy_quasimodo','0003_dark_frog_thor','0004_chilly_rictor','0005_free_file_storage','0006_admin_accounts'])db.exec(await readFile(new URL('../drizzle/'+name+'.sql',import.meta.url),'utf8'));
 return db;
}
function add(db,id,role,username=null,email=null){db.prepare('INSERT INTO users(id,name,role,username,email,password_hash,password_salt,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id,id,role,username,email,'old-hash','old-salt',1);}
test('provisions exactly one admin and replay preserves rotated credentials and sessions',async()=>{
 const db=await database();db.exec(migration);
 const admin=db.prepare("SELECT * FROM users WHERE role='admin'").get();assert.match(admin.username,/^09\d{9}$/);assert.match(admin.password_hash,/^[a-f0-9]{64}$/);assert.match(admin.password_salt,/^[a-f0-9]{64}$/);
 db.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=?').run('rotated-hash','rotated-salt',admin.id);
 db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').run('new-session',admin.id,9999999999999,2);
 db.exec(migration);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").get().n,1);
 assert.equal(db.prepare('SELECT password_hash FROM users WHERE id=?').get(admin.id).password_hash,'rotated-hash');
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,1);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE action='admin.provision'").get().n,1);db.close();
});
test('existing admin keeps identity and audit history; old sessions are invalidated once',async()=>{
 const db=await database();add(db,'existing-admin','admin',null,'existing@example.test');
 db.exec("INSERT INTO sessions VALUES ('old-session','existing-admin',9999999999999,1);INSERT INTO admin_audit VALUES ('prior-audit','existing-admin','existing-admin','admin.password','{}',1);");
 db.exec(migration);const admin=db.prepare("SELECT * FROM users WHERE role='admin'").get();assert.equal(admin.id,'existing-admin');assert.equal(admin.email,'existing@example.test');assert.equal(admin.disabled,0);assert.equal(admin.auth_version,1);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE id='prior-audit'").get().n,1);db.close();
});
test('existing doctor phones migrate only when unique and valid; patient identities and passwords survive',async()=>{
 const db=await database();add(db,'doctor','doctor',null,'doctor@example.test');add(db,'duplicate-a','doctor');add(db,'duplicate-b','doctor');add(db,'collision','doctor');add(db,'patient','patient','09122223333');
 for(const [id,phone] of [['doctor','09111112222'],['duplicate-a','09133334444'],['duplicate-b','09133334444'],['collision','09122223333']])db.prepare('INSERT INTO doctor_access(doctor_id,phone,updated_at) VALUES (?,?,1)').run(id,phone);
 db.exec(migration);assert.equal(db.prepare("SELECT username FROM users WHERE id='doctor'").get().username,'09111112222');
 for(const id of ['duplicate-a','duplicate-b','collision'])assert.equal(db.prepare('SELECT username FROM users WHERE id=?').get(id).username,null);
 assert.equal(db.prepare("SELECT password_hash FROM users WHERE id='doctor'").get().password_hash,'old-hash');assert.equal(db.prepare("SELECT username FROM users WHERE id='patient'").get().username,'09122223333');db.close();
});
