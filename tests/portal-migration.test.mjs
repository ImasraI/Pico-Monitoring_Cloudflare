import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdir, readFile } from 'node:fs/promises';

test('portal migration preserves existing records and reply/scan deletion keeps messages',async()=>{
  const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
  const directory=new URL('../drizzle/',import.meta.url);
  for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')&&n<'0009').sort())db.exec(await readFile(new URL(name,directory),'utf8'));
  for(const [id,role,doctor]of [['doctor','doctor',null],['patient','patient','doctor']])db.prepare('INSERT INTO users(id,name,role,doctor_id,password_hash,password_salt,created_at) VALUES (?,?,?,?,?,?,?)').run(id,id,role,doctor,'preserved-hash','preserved-salt',1);
  db.exec("INSERT INTO messages(id,doctor_id,patient_id,sender_id,kind,body,created_at) VALUES ('original','doctor','patient','doctor','normal','Preserve this message',1)");
  db.exec(await readFile(new URL('0009_patient_portal.sql',directory),'utf8'));
  assert.equal(db.prepare("SELECT body FROM messages WHERE id='original'").get().body,'Preserve this message');
  assert.equal(db.prepare("SELECT password_hash FROM users WHERE id='patient'").get().password_hash,'preserved-hash');
  db.exec("INSERT INTO patient_intakes(patient_id,answers_json,updated_at) VALUES ('patient','{}',1); INSERT INTO scans(id,patient_id,doctor_id,created_at,status,review_result) VALUES ('scan','patient','doctor',2,'new','pending'); INSERT INTO messages(id,doctor_id,patient_id,sender_id,kind,body,created_at,reply_to_id,scan_id) VALUES ('reply','doctor','patient','patient','urgent','Report',3,'original','scan')");
  db.exec("DELETE FROM messages WHERE id='original'; DELETE FROM scans WHERE id='scan'");
  const reply=db.prepare("SELECT * FROM messages WHERE id='reply'").get();assert.equal(reply.reply_to_id,null);assert.equal(reply.scan_id,null);assert.equal(reply.body,'Report');
  db.exec("DELETE FROM users WHERE id='patient'");assert.equal(db.prepare('SELECT COUNT(*) AS n FROM patient_intakes').get().n,0);db.close();
});
