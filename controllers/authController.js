const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const SALT_ROUNDS = 10;

// Creates a signed token that contains only the user's id.
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// Validates username/password from the request body.
// Returns an error message string, or null if everything is fine.
const validateCredentials = (username, password) => {
  if (typeof username !== 'string' || typeof password !== 'string') {
    return 'Username and password are required';
  }
  if (username.trim().length < 3 || username.trim().length > 30) {
    return 'Username must be 3-30 characters';
  }
  if (password.length < 6 || password.length > 72) {
    // bcrypt only uses the first 72 bytes of a password, so we cap the length
    return 'Password must be 6-72 characters';
  }
  return null;
};

// POST /api/auth/register
const register = async (req, res) => {
  const { username, password } = req.body || {};

  const error = validateCredentials(username, password);
  if (error) return res.status(400).json({ message: error });

  const cleanUsername = username.trim();

  if (User.findByUsername(cleanUsername)) {
    return res.status(409).json({ message: 'Username already taken' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  try {
    user = User.create(cleanUsername, passwordHash);
  } catch (err) {
    // Two people registering the same name at the same moment: the UNIQUE
    // constraint in the database is the final safety net.
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Username already taken' });
    }
    throw err;
  }

  // We return a token too, so the frontend can log the user in automatically.
  res.status(201).json({
    token: generateToken(user.id),
    user: { id: user.id, username: user.username },
  });
};

// POST /api/auth/login
const login = async (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = User.findByUsername(username.trim());
  const passwordOk = user ? await bcrypt.compare(password, user.password_hash) : false;

  // Same message for "no such user" and "wrong password", so attackers
  // can't use the login form to find out which usernames exist.
  if (!passwordOk) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  res.json({
    token: generateToken(user.id),
    user: { id: user.id, username: user.username }, // built by hand: no password_hash
  });
};

module.exports = { register, login };