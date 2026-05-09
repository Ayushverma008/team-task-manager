// ============================================================
// api.js – centralised fetch wrapper
// ============================================================

const BASE_URL = window.location.origin; // same-origin when served by Express

function getToken() {
  return localStorage.getItem('tf_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || data.errors?.[0]?.msg || 'Something went wrong';
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  return data;
}

const api = {
  // Auth
  signup: (body) => apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login:  (body) => apiFetch('/api/auth/login',  { method: 'POST', body: JSON.stringify(body) }),
  me:     ()     => apiFetch('/api/auth/me'),

  // Projects
  createProject: (body)   => apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  getProjects:   ()        => apiFetch('/api/projects'),
  getProject:    (id)      => apiFetch(`/api/projects/${id}`),
  addMember:     (id, body) => apiFetch(`/api/projects/${id}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateMemberRole: (id, uid, body) => apiFetch(`/api/projects/${id}/members/${uid}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeMember:  (id, uid) => apiFetch(`/api/projects/${id}/members/${uid}`, { method: 'DELETE' }),
  getDashboard:  (id)      => apiFetch(`/api/projects/${id}/dashboard`),
  deleteProject: (id)      => apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks:    (projId)       => apiFetch(`/api/projects/${projId}/tasks`),
  createTask:  (projId, body) => apiFetch(`/api/projects/${projId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateTask:  (taskId, body) => apiFetch(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTask:  (taskId)       => apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' }),

  // Users
  updateUser:  (id, body)     => apiFetch(`/api/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
