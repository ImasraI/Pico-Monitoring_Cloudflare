-- Provision the owner-requested administrator once. Only a salted PBKDF2 hash is stored.
-- The audit marker also protects password changes if this SQL is replayed manually.
INSERT INTO users (id,email,username,name,role,doctor_id,password_hash,password_salt,created_at,disabled,auth_version)
SELECT 'ee5082d1-30e4-404f-960a-1d8929e990b9',NULL,'09934938300','مدیر سامانه','admin',NULL,'befe805281bc8d041ccd63792cd4737f9200cfd0e35ce73ebb3c59633cee0f1a','c62e6e1fb179361fb6e869ae944e8e859202c2fb65b7e8641b817f6e652878d0',unixepoch()*1000,0,0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='admin')
AND NOT EXISTS (SELECT 1 FROM admin_audit WHERE id='primary-admin-mobile-v1');
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role='admin')
AND NOT EXISTS (SELECT 1 FROM admin_audit WHERE id='primary-admin-mobile-v1');
UPDATE users SET username='09934938300',password_hash='befe805281bc8d041ccd63792cd4737f9200cfd0e35ce73ebb3c59633cee0f1a',password_salt='c62e6e1fb179361fb6e869ae944e8e859202c2fb65b7e8641b817f6e652878d0',disabled=0,auth_version=auth_version+1
WHERE role='admin' AND NOT EXISTS (SELECT 1 FROM admin_audit WHERE id='primary-admin-mobile-v1');
INSERT OR IGNORE INTO notification_settings (user_id,messages,scans,roadmap)
SELECT id,1,1,1 FROM users WHERE role='admin';
INSERT INTO admin_audit (id,actor_id,subject_id,action,details,created_at)
SELECT 'primary-admin-mobile-v1',id,id,'admin.provision','{"method":"mobile"}',unixepoch()*1000 FROM users WHERE role='admin'
AND NOT EXISTS (SELECT 1 FROM admin_audit WHERE id='primary-admin-mobile-v1');

-- Give existing doctors mobile login only when their stored number is valid and unique.
-- Never replace another user's identity or change existing doctor passwords.
UPDATE users SET username=(SELECT phone FROM doctor_access WHERE doctor_id=users.id)
WHERE role='doctor' AND (username IS NULL OR instr(username,'@')>0)
AND EXISTS (SELECT 1 FROM doctor_access a WHERE a.doctor_id=users.id AND length(a.phone)=11
AND a.phone GLOB '09[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
AND (SELECT COUNT(*) FROM doctor_access b WHERE b.phone=a.phone)=1
AND NOT EXISTS (SELECT 1 FROM users other WHERE other.id<>users.id AND other.username=a.phone));
