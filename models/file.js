const { db } = require('../config/db');

const insertFile = db.prepare(`
  INSERT INTO files (original_name, display_name, stored_name, mime_type, size, path, uploaded_by)
  VALUES (@original_name, @display_name, @stored_name, @mime_type, @size, @path, @uploaded_by)
`);

// Every read/delete below includes uploaded_by in the WHERE clause.
// That is how file ownership is enforced: another user's file simply "doesn't exist" for you.
const selectByUser = db.prepare(
  'SELECT * FROM files WHERE uploaded_by = ? ORDER BY uploaded_at DESC, id DESC'
);
const selectByIdAndUser = db.prepare(
  'SELECT * FROM files WHERE id = ? AND uploaded_by = ?'
);
const deleteByIdAndUser = db.prepare(
  'DELETE FROM files WHERE id = ? AND uploaded_by = ?'
);

const updateFileQuery = db.prepare(`
  UPDATE files
  SET original_name = COALESCE(@original_name, original_name),
      display_name  = COALESCE(@display_name, display_name),
      stored_name   = COALESCE(@stored_name, stored_name),
      mime_type     = COALESCE(@mime_type, mime_type),
      size          = COALESCE(@size, size),
      path          = COALESCE(@path, path),
      uploaded_at   = datetime('now')
  WHERE id = @id AND uploaded_by = @uploaded_by
`);

const File = {
  create(data) {
    const result = insertFile.run(data);
    return db.prepare('SELECT * FROM files WHERE id = ?').get(result.lastInsertRowid);
  },

  // SQL version of File.find({ uploaded_by: userId })
  findByUser(userId) {
    return selectByUser.all(userId);
  },

  // Returns undefined if the file doesn't exist OR belongs to someone else.
  findByIdAndUser(id, userId) {
    return selectByIdAndUser.get(id, userId);
  },

  // Update file metadata or replacement file
  updateByIdAndUser(id, userId, data) {
    const result = updateFileQuery.run({
      id,
      uploaded_by: userId,
      original_name: data.original_name ?? null,
      display_name: data.display_name ?? null,
      stored_name: data.stored_name ?? null,
      mime_type: data.mime_type ?? null,
      size: data.size ?? null,
      path: data.path ?? null,
    });
    if (result.changes > 0) {
      return selectByIdAndUser.get(id, userId);
    }
    return null;
  },

  // Returns true if a row was deleted, false if nothing matched (wrong id or wrong owner).
  deleteByIdAndUser(id, userId) {
    return deleteByIdAndUser.run(id, userId).changes > 0;
  },
};

module.exports = File;
