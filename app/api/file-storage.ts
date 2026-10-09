// No-card storage: private files share the D1 database with application records.
// Keep each BLOB below D1's 2 MB row limit and reserve space for record/index overhead.
const CHUNK_SIZE = 1_500_000;
const MAX_FILE_SIZE = 10_000_000;

export function d1Files(db: D1Database) {
  return {
    async put(key: string, body: ReadableStream, _options?: unknown) {
      const bytes = new Uint8Array(await new Response(body).arrayBuffer());
      if (bytes.byteLength > MAX_FILE_SIZE) throw new Error('File exceeds 10 MB storage limit');
      const statements = [db.prepare('INSERT INTO stored_files (object_key,size) VALUES (?,?)').bind(key, bytes.byteLength)];
      for (let offset = 0, position = 0; offset < bytes.length; offset += CHUNK_SIZE, position++) {
        statements.push(db.prepare('INSERT INTO stored_file_chunks (object_key,position,data) VALUES (?,?,?)')
          .bind(key, position, bytes.slice(offset, offset + CHUNK_SIZE).buffer));
      }
      // D1 batches are transactional, including the quota triggers and all chunks.
      await db.batch(statements);
    },
    async get(key: string) {
      const file = await db.prepare('SELECT size FROM stored_files WHERE object_key=?').bind(key).first<{size:number}>();
      if (!file) return null;
      let position = 0, received = 0;
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            if (received >= file.size) { controller.close(); return; }
            const row = await db.prepare('SELECT data FROM stored_file_chunks WHERE object_key=? AND position=?')
              .bind(key, position++).first<{data:number[] | ArrayBuffer}>();
            if (!row) throw new Error('Stored file is incomplete');
            const chunk = new Uint8Array(row.data);
            received += chunk.byteLength;
            if (received > file.size) throw new Error('Stored file size mismatch');
            controller.enqueue(chunk);
          } catch (error) { controller.error(error); }
        },
      });
      return { body };
    },
    async delete(key: string) {
      await db.prepare('DELETE FROM stored_files WHERE object_key=?').bind(key).run();
    },
  };
}
