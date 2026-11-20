/**
 * Dedicated Login Page Script
 * Directly calls fetch() for authentication without any external API client.
 */

// If already logged in, redirect to dashboard immediately
if (localStorage.getItem('token') && localStorage.getItem('user')) {
  window.location.href = '/dashboard';
}

const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const btnText = loginBtn.querySelector('.btn-text');
const btnSpinner = loginBtn.querySelector('.btn-spinner');

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  if (isLoading) {
    btnText.textContent = 'Please wait...';
    btnSpinner.classList.remove('hidden');
  } else {
    btnText.textContent = 'Log in';
    btnSpinner.classList.add('hidden');
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginError.textContent = '';

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    loginError.textContent = 'Please enter both username and password.';
    loginError.classList.remove('hidden');
    return;
  }

  setLoading(true);

  try {
    // Direct fetch call to /api/auth/login
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.message || `Login failed (HTTP ${res.status})`);
    }

    // Save session in localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Redirect to dashboard page
    window.location.href = '/dashboard';
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  } finally {
    setLoading(false);
  }
});
