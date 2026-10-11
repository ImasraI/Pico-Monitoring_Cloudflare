-- Reversible account deletion keeps treatment records and private files intact.
ALTER TABLE users ADD COLUMN deleted_at INTEGER;
ALTER TABLE users ADD COLUMN deleted_by TEXT;
ALTER TABLE users ADD COLUMN deleted_disabled INTEGER;
ALTER TABLE users ADD COLUMN deleted_group TEXT;
CREATE INDEX users_deleted_doctor_idx ON users(deleted_at,doctor_id,role);

DROP TRIGGER doctor_patient_limit;
CREATE TRIGGER doctor_patient_limit BEFORE INSERT ON users
WHEN NEW.role='patient' AND NEW.deleted_at IS NULL
AND (SELECT patient_limit FROM doctor_access WHERE doctor_id=NEW.doctor_id) IS NOT NULL
AND (SELECT COUNT(*) FROM users WHERE doctor_id=NEW.doctor_id AND role='patient' AND deleted_at IS NULL) >= (SELECT patient_limit FROM doctor_access WHERE doctor_id=NEW.doctor_id)
BEGIN SELECT RAISE(ABORT,'doctor_patient_limit'); END;

CREATE TRIGGER patient_restore_limit BEFORE UPDATE OF deleted_at ON users
WHEN NEW.role='patient' AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL
AND (SELECT patient_limit FROM doctor_access WHERE doctor_id=NEW.doctor_id) IS NOT NULL
AND (SELECT COUNT(*) FROM users WHERE doctor_id=NEW.doctor_id AND role='patient' AND deleted_at IS NULL) >= (SELECT patient_limit FROM doctor_access WHERE doctor_id=NEW.doctor_id)
BEGIN SELECT RAISE(ABORT,'doctor_patient_limit'); END;

CREATE TRIGGER patient_active_doctor_insert BEFORE INSERT ON users
WHEN NEW.role='patient' AND NEW.deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.doctor_id AND role='doctor' AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT,'doctor_deleted'); END;

CREATE TRIGGER patient_active_doctor_restore BEFORE UPDATE OF deleted_at ON users
WHEN NEW.role='patient' AND NEW.deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.doctor_id AND role='doctor' AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT,'doctor_deleted'); END;
