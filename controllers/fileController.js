const path = require('path');
const fs = require('fs');
const File = require('../models/file');

const ROOT_DIR = path.join(__dirname, '..');
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');

// SQLite's datetime('now') gives "2026-11-20 01:33:00" (UTC, but no timezone marker).
// JavaScript would read that as LOCAL time, so we convert it to a proper ISO string.
const toIso = (sqliteDate) => sqliteDate.replace(' ', 'T') + 'Z';

// What the client is allowed to see. Deliberately leaves out the server path and stored name.
const toPublic = (file) => ({
  id: file.id,
  original_name: file.original_name,
  display_name: file.display_name || file.original_name,
  mime_type: file.mime_type,
  size: file.size,
  uploaded_at: toIso(file.uploaded_at),
});

// Turns the stored relative path into an absolute one and makes sure it is inside uploads/.
const resolveStoredPath = (storedPath) => {
  const absolute = path.resolve(ROOT_DIR, storedPath);
  return absolute.startsWith(UPLOAD_DIR + path.sep) ? absolute : null;
};

// Multer reads multipart filenames as Latin-1, but browsers send UTF-8.
// Without this, names like "résumé.txt" or Hindi names are stored garbled.
const fixFilenameEncoding = (name) => Buffer.from(name, 'latin1').toString('utf8');

// Ids in the URL are strings; only accept plain positive integers.
const parseId = (value) => (/^\d+$/.test(value) ? Number(value) : null);

// POST /api/files
const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded (use the field name "file")' });
  }

  const rawOriginalName = fixFilenameEncoding(req.file.originalname).slice(0, 255);
  const rawDisplayName = req.body?.name || req.body?.display_name;
  const displayName =
    typeof rawDisplayName === 'string' && rawDisplayName.trim().length > 0
      ? rawDisplayName.trim().slice(0, 255)
      : rawOriginalName;

  try {
    const saved = File.create({
      original_name: rawOriginalName,
      display_name: displayName,
      stored_name: req.file.filename,
      mime_type: req.file.mimetype,
      size: req.file.size,
      path: path.posix.join('uploads', req.file.filename),
      uploaded_by: req.user.id, // from the verified token, never from the request body
    });
    res.status(201).json(toPublic(saved));
  } catch (err) {
    // The file is already on disk but the database insert failed: don't leave an orphan.
    await fs.promises.unlink(req.file.path).catch(() => {});
    throw err;
  }
};

// GET /api/files
const listFiles = async (req, res) => {
  const files = File.findByUser(req.user.id);
  res.json(files.map(toPublic));
};

// GET /api/files/:id/download
const downloadFile = async (req, res) => {
  const id = parseId(req.params.id);
  const file = id && File.findByIdAndUser(id, req.user.id);
  if (!file) return res.status(404).json({ message: 'File not found' });

  const absolutePath = resolveStoredPath(file.path);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return res.status(404).json({ message: 'File is missing on the server' });
  }

  // Ensure download filename retains the proper extension if display_name lacks one
  let downloadFilename = file.display_name || file.original_name;
  const ext = path.extname(file.original_name);
  if (ext && !downloadFilename.toLowerCase().endsWith(ext.toLowerCase())) {
    downloadFilename += ext;
  }

  res.download(absolutePath, downloadFilename, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ message: 'Could not send file' });
    }
  });
};

// PUT /api/files/:id (Update replacement file or display name)
const updateFile = async (req, res) => {
  const id = parseId(req.params.id);
  const existingFile = id && File.findByIdAndUser(id, req.user.id);
  if (!existingFile) {
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    return res.status(404).json({ message: 'File not found' });
  }

  const rawDisplayName = req.body?.name ?? req.body?.display_name;
  const hasNewName = typeof rawDisplayName === 'string' && rawDisplayName.trim().length > 0;
  const newDisplayName = hasNewName ? rawDisplayName.trim().slice(0, 255) : undefined;

  const updateData = {};
  if (newDisplayName !== undefined) {
    updateData.display_name = newDisplayName;
  }

  const oldAbsolutePath = resolveStoredPath(existingFile.path);

  // If a replacement file was uploaded
  if (req.file) {
    const rawOriginalName = fixFilenameEncoding(req.file.originalname).slice(0, 255);
    updateData.original_name = rawOriginalName;
    updateData.stored_name = req.file.filename;
    updateData.mime_type = req.file.mimetype;
    updateData.size = req.file.size;
    updateData.path = path.posix.join('uploads', req.file.filename);

    // If no explicit new display name was given, update display name to the new file's name
    if (newDisplayName === undefined && (!existingFile.display_name || existingFile.display_name === existingFile.original_name)) {
      updateData.display_name = rawOriginalName;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'No update data provided (provide a new file or display name)' });
  }

  try {
    const updated = File.updateByIdAndUser(id, req.user.id, updateData);
    if (!updated) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'File not found' });
    }

    // If replacement file succeeded, safely clean up old file from disk
    if (req.file && oldAbsolutePath) {
      await fs.promises.unlink(oldAbsolutePath).catch((err) => {
        if (err.code !== 'ENOENT') {
          console.error(`Could not delete old file ${oldAbsolutePath}:`, err.message);
        }
      });
    }

    res.json(toPublic(updated));
  } catch (err) {
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    throw err;
  }
};

// DELETE /api/files/:id
const deleteFile = async (req, res) => {
  const id = parseId(req.params.id);
  const file = id && File.findByIdAndUser(id, req.user.id);
  if (!file) return res.status(404).json({ message: 'File not found' });

  // 1) Delete the database record (only succeeds for the owner).
  const deleted = File.deleteByIdAndUser(id, req.user.id);
  if (!deleted) return res.status(404).json({ message: 'File not found' });

  // 2) Then remove the physical file. If this fails the record is already gone,
  //    so we log it and still report success to the user.
  const absolutePath = resolveStoredPath(file.path);
  if (absolutePath) {
    try {
      await fs.promises.unlink(absolutePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Could not delete ${absolutePath}:`, err.message);
      }
    }
  }

  res.json({ message: 'File deleted' });
};

module.exports = { uploadFile, listFiles, downloadFile, updateFile, deleteFile };
