require('dotenv').config();

const express = require('express');
const multer = require('multer');

const path = require('path');
require('./config/db'); // opens the SQLite file and creates the tables
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const viewRoutes = require('./routes/viewRoutes');

// Fail fast: without a secret we cannot sign or verify tokens safely.
// if (!process.env.JWT_SECRET) {
//   console.error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
//   process.exit(1);
// }

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static assets (CSS, client JS, images) from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON request bodies (needed for login/register).
// File uploads use multipart/form-data and are parsed by Multer in the routes instead.
app.use(express.json());  // frontend to backend name email password

// View Routes (MVC: Serves the HTML frontend view)
app.use('/', viewRoutes);

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'ok' });
// });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Unknown API route -> 404 JSON
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler (4 arguments = Express error middleware)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Errors thrown by Multer (file too large, wrong field name, ...)
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res
      .status(tooLarge ? 413 : 400)
      .json({ message: tooLarge ? 'File is too large' : `Upload error: ${err.message}` });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  // Never leak internal error details to the client for 500s.
  res.status(status).json({ message: status >= 500 ? 'Server error' : err.message });
});

app.listen(PORT, () => console.log(`Application running on http://localhost:${PORT}`));
