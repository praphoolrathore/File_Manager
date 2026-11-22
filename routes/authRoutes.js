const express = require('express');
const { register, login } = require('../controllers/authController');

const router = express.Router();


// Routes only map URL + method to a controller function. No logic here.
router.post('/register', register);

const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
router.post('/login', authLimiter, login);




module.exports = router;