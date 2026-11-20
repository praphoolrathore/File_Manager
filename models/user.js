const { db } = require('../config/db');

// Prepared statements are compiled once and reused.
// The "?" placeholders are filled in safely by SQLite (prevents SQL injection).
const insertUser = db.prepare(
  'INSERT INTO users (username, password_hash) VALUES (?, ?)'
);
const selectByUsername = db.prepare(
  'SELECT id, username, password_hash, created_at FROM users WHERE username = ?'
);
// Note: this one deliberately does NOT select password_hash.
const selectById = db.prepare(
  'SELECT id, username, created_at FROM users WHERE id = ?'
);

const User = {
  // Receives an already-hashed password. This model never sees plain-text passwords.
  create(username, passwordHash) {
    const result = insertUser.run(username, passwordHash);
    return selectById.get(result.lastInsertRowid);
  },

  // Includes password_hash because login needs it to compare.
  // The controller must never send this object to the client.
  findByUsername(username) {
    return selectByUsername.get(username);
  },

  // Safe version: no password hash.
  findById(id) {
    return selectById.get(id);
  },
};

module.exports = User;