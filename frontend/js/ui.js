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
window.toggleAvatarDropdown = () => {
  const dd = document.getElementById('avatar-dropdown');
  if (dd) dd.classList.toggle('hidden');
};

// Close dropdown when clicking outside
window.addEventListener('click', (e) => {
  const container = document.querySelector('.avatar-dropdown-container');
  const dropdown = document.getElementById('avatar-dropdown');
  if (container && !container.contains(e.target) && dropdown) {
    dropdown.classList.add('hidden');
  }
});

// Profile logic (shared)
window.openProfileModal = () => {
  const dd = document.getElementById('avatar-dropdown');
  if (dd) dd.classList.add('hidden'); // Close dropdown
  
  const user = JSON.parse(localStorage.getItem('tf_user') || '{}');
  if (!user.name) return;
  document.getElementById('profile-name').value = user.name;
  document.getElementById('profile-email').value = user.email || '';
  openModal('profile-modal');
};

window.handleUpdateProfile = async (e) => {
  e.preventDefault();
  const name = document.getElementById('profile-name').value.trim();
  const user = JSON.parse(localStorage.getItem('tf_user') || '{}');
  if (!name || name === user.name) { closeModal('profile-modal'); return; }

  setLoading('update-profile-btn', true, '<i class="fa fa-floppy-disk"></i> Updating...');
  try {
    const res = await api.updateUser(user._id, { name });
    localStorage.setItem('tf_user', JSON.stringify(res.user));
    setNavUser(res.user);
    showToast('Name updated successfully!', 'success');
    closeModal('profile-modal');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('update-profile-btn', false, '<i class="fa fa-floppy-disk"></i> Update Name');
  }
};
