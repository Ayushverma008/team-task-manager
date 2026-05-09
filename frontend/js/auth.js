// ============================================================
// auth.js – Login / Signup page logic
// ============================================================

// Redirect if already logged in
if (localStorage.getItem('tf_token')) {
  window.location.href = 'dashboard.html';
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('signup-form').classList.toggle('hidden', isLogin);
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-signup').classList.toggle('active', !isLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  setLoading('login-btn', true, '<i class="fa fa-arrow-right-to-bracket"></i> Sign In');
  try {
    const data = await api.login({ email, password });
    localStorage.setItem('tf_token', data.token);
    localStorage.setItem('tf_user', JSON.stringify(data.user));
    window.location.href = 'dashboard.html';
  } catch (err) {
    showToast(err.message, 'error');
    setLoading('login-btn', false, '<i class="fa fa-arrow-right-to-bracket"></i> Sign In');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const role     = document.getElementById('signup-role').value;
  setLoading('signup-btn', true, '<i class="fa fa-user-plus"></i> Create Account');
  try {
    const data = await api.signup({ name, email, password, role });
    localStorage.setItem('tf_token', data.token);
    localStorage.setItem('tf_user', JSON.stringify(data.user));
    showToast('Account created! Redirecting…', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch (err) {
    showToast(err.message, 'error');
    setLoading('signup-btn', false, '<i class="fa fa-user-plus"></i> Create Account');
  }
}

// Initial state based on URL
(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('tab') === 'signup') switchTab('signup');
})();
