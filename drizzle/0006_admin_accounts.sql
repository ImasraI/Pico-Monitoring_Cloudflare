ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0,1));
ALTER TABLE users ADD COLUMN last_login_at INTEGER;
ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX users_single_admin_unique ON users(role) WHERE role='admin';
CREATE TABLE doctor_access (
  doctor_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id),
  clinic TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  permissions TEXT NOT NULL DEFAULT '["patients.manage","files.manage","treatment.manage","scans.review","messages.send","rewards.manage"]',
  patient_limit INTEGER CHECK (patient_limit IS NULL OR patient_limit BETWEEN 0 AND 10000),
  updated_at INTEGER NOT NULL
);
INSERT INTO doctor_access (doctor_id,updated_at) SELECT id,created_at FROM users WHERE role='doctor';
CREATE TABLE admin_audit (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id),
  subject_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX admin_audit_created_idx ON admin_audit(created_at);
CREATE TRIGGER doctor_patient_limit BEFORE INSERT ON users
WHEN NEW.role='patient' AND (SELECT patient_limit FROM doctor_access WHERE doctor_id=NEW.doctor_id) IS NOT NULL
AND (SELECT COUNT(*) FROM users WHERE doctor_id=NEW.doctor_id AND role='patient') >= (SELECT patient_limit FROM doctor_access WHERE doctor_id=NEW.doctor_id)
BEGIN SELECT RAISE(ABORT,'doctor_patient_limit'); END;
