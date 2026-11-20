const path = require('path');

// Controller responsible for serving dedicated page views
const renderLogin = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
};

const renderRegister = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'register.html'));
};

const renderDashboard = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
};

module.exports = {
  renderLogin,
  renderRegister,
  renderDashboard,
};
