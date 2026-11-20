const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const authMiddleware = require('../middleware/authMiddleware');
const {
  uploadFile,
  listFiles,
  downloadFile,
  updateFile,
  deleteFile,
} = require('../controllers/fileController');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 5;

// Allowed types: MIME type -> the extension WE choose for the stored file.
// The stored extension never comes from the user's filename.
const ALLOWED_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Random name + trusted extension: no collisions, no path traversal.
  filename: (req, file, cb) => {
    cb(null, crypto.randomUUID() + ALLOWED_TYPES[file.mimetype]);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES[file.mimetype]) {
    const err = new Error('File type not allowed');
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
});

const router = express.Router();

// Authentication runs FIRST for every route below, so an unauthenticated
// request is rejected before Multer writes anything to disk.
router.use(authMiddleware);

router.post('/', upload.single('file'), uploadFile);
router.get('/', listFiles);
router.get('/:id/download', downloadFile);
router.put('/:id', upload.single('file'), updateFile);
router.delete('/:id', deleteFile);

module.exports = router;
