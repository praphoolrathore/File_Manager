const express = require('express');
const { register, login } = require('../controllers/authController');

const router = express.Router();

// Routes only map URL + method to a controller function. No logic here.
router.post('/register', register);
router.post('/login', login);

module.exports = router;