// ============================================================
// ui.js – shared UI utilities (toasts, modals, helpers)
// ============================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function closeModalOnBg(e, id) {
  if (e.target.classList.contains('modal-overlay')) closeModal(id);
}

function setLoading(btnId, loading, text = 'Save') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<i class="fa fa-spinner fa-spin"></i> Loading...'
    : text;
}

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
}

function logout() {
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
  window.location.href = 'auth.html';
}

function requireAuth() {
  const token = localStorage.getItem('tf_token');
  if (!token) { window.location.href = 'auth.html'; return null; }
  const user = JSON.parse(localStorage.getItem('tf_user') || 'null');
  return user;
}

function setNavUser(user) {
  const nameEl = document.getElementById('nav-username');
  const avatarEl = document.getElementById('nav-avatar');
  if (nameEl && user) nameEl.textContent = user.name;
  if (avatarEl && user) avatarEl.textContent = getInitials(user.name);
}

// Escape HTML to prevent XSS
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
