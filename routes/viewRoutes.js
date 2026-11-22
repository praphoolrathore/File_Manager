const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  renderLogin,
  renderRegister,
  renderDashboard,
} = require('../controllers/viewController');

const router = express.Router();

// Page View Routes
router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', renderLogin);
router.get('/register', renderRegister);
router.get('/dashboard', renderDashboard);

module.exports = router;
