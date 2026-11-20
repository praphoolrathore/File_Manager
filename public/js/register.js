/**
 * Dedicated Register Page Script
 * Directly calls fetch() for registration without any external API client.
 */

// If already logged in, redirect to dashboard immediately
if (localStorage.getItem('token') && localStorage.getItem('user')) {
  window.location.href = '/dashboard';
}

const registerForm = document.getElementById('register-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const registerError = document.getElementById('register-error');
const registerBtn = document.getElementById('register-btn');
const btnText = registerBtn.querySelector('.btn-text');
const btnSpinner = registerBtn.querySelector('.btn-spinner');

function setLoading(isLoading) {
  registerBtn.disabled = isLoading;
  if (isLoading) {
    btnText.textContent = 'Please wait...';
    btnSpinner.classList.remove('hidden');
  } else {
    btnText.textContent = 'Create Account';
    btnSpinner.classList.add('hidden');
  }
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.classList.add('hidden');
  registerError.textContent = '';

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    registerError.textContent = 'Please enter both username and password.';
    registerError.classList.remove('hidden');
    return;
  }

  if (username.length < 3 || username.length > 30) {
    registerError.textContent = 'Username must be 3-30 characters.';
    registerError.classList.remove('hidden');
    return;
  }

  if (password.length < 6 || password.length > 72) {
    registerError.textContent = 'Password must be 6-72 characters.';
    registerError.classList.remove('hidden');
    return;
  }

  setLoading(true);

  try {
    // Direct fetch call to /api/auth/register
    const res = await fetch('/api/auth/register', {
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
      throw new Error(data?.message || `Registration failed (HTTP ${res.status})`);
    }

    // Save session in localStorage (registration automatically logs user in)
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Redirect to dashboard page
    window.location.href = '/dashboard';
  } catch (err) {
    registerError.textContent = err.message;
    registerError.classList.remove('hidden');
  } finally {
    setLoading(false);
  }
});
