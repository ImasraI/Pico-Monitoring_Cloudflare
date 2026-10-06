CREATE TABLE file_storage_quota (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  used_bytes INTEGER NOT NULL DEFAULT 0 CHECK (used_bytes >= 0 AND used_bytes <= 400000000)
);
INSERT INTO file_storage_quota (id,used_bytes) VALUES (1,0);
CREATE TABLE stored_files (
  object_key TEXT PRIMARY KEY NOT NULL,
  size INTEGER NOT NULL CHECK (size >= 0 AND size <= 10000000)
);
CREATE TABLE stored_file_chunks (
  object_key TEXT NOT NULL REFERENCES stored_files(object_key) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  data BLOB NOT NULL CHECK (length(data) <= 1500000),
  PRIMARY KEY (object_key,position)
);
CREATE TRIGGER stored_files_reserve AFTER INSERT ON stored_files BEGIN
  UPDATE file_storage_quota SET used_bytes=used_bytes+NEW.size WHERE id=1;
END;
CREATE TRIGGER stored_files_release AFTER DELETE ON stored_files BEGIN
  UPDATE file_storage_quota SET used_bytes=used_bytes-OLD.size WHERE id=1;
END;
