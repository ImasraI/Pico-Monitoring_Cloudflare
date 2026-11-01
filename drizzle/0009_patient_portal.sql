CREATE TABLE patient_intakes (
  patient_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  answers_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  submitted_at INTEGER
);

ALTER TABLE messages ADD COLUMN reply_to_id TEXT REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN scan_id TEXT REFERENCES scans(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN subject TEXT;
CREATE INDEX messages_reply_idx ON messages(reply_to_id);
