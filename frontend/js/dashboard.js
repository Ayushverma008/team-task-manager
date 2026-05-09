// ============================================================
// dashboard.js – Dashboard page logic
// ============================================================

(async () => {
  const user = requireAuth();
  if (!user) return;
  setNavUser(user);

  let allProjects = [];
  let currentView = 'overview';

  // ---- Sidebar project nav ----
  function showView(view) {
    currentView = view;
    document.getElementById('view-overview').classList.toggle('hidden', view !== 'overview');
    document.getElementById('view-allTasks').classList.toggle('hidden', view !== 'allTasks');
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    if (view === 'overview') document.querySelectorAll('.sidebar-item')[0].classList.add('active');
    if (view === 'allTasks') document.querySelectorAll('.sidebar-item')[1].classList.add('active');
    if (view === 'allTasks') loadAllTasks();
  }
  window.showView = showView;

  // ---- Load Projects ----
  async function loadProjects() {
    try {
      allProjects = await api.getProjects();
      renderSidebarProjects();
      renderProjectsGrid();
      loadAggregateStats();
    } catch (err) {
      showToast(err.message, 'error');
      document.getElementById('projects-grid').innerHTML = `<p class="text-muted">Failed to load projects.</p>`;
    }
  }

  function renderSidebarProjects() {
    const container = document.getElementById('sidebar-projects');
    if (!allProjects.length) {
      container.innerHTML = `<p style="font-size:0.8rem;color:var(--text-muted);padding:0 12px">No projects yet</p>`;
      return;
    }
    container.innerHTML = allProjects.map(p => `
      <button class="sidebar-item" onclick="window.location.href='project.html?id=${p._id}'">
        <span class="item-icon"><i class="fa fa-folder"></i></span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.title)}</span>
      </button>
    `).join('');
  }

  function renderProjectsGrid() {
    const grid = document.getElementById('projects-grid');
    if (!allProjects.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">📁</div>
          <div style="font-weight:700">No projects yet</div>
          <div class="empty-text">Create your first project to get started managing tasks with your team.</div>
          <button class="btn btn-primary" onclick="openCreateProjectModal()"><i class="fa fa-plus"></i> New Project</button>
        </div>`;
      return;
    }
    grid.innerHTML = allProjects.map(p => {
      const pAdminId = p.admin?._id || p.admin;
      const isProjAdmin = pAdminId === user?._id;
      const isGlobalAdmin = user?.role === 'admin';
      const canManage = isProjAdmin || isGlobalAdmin;
      const members = p.members || [];
      const avatarHtml = members.slice(0, 4).map(m =>
        `<div class="member-avatar" title="${esc(m.user?.name || '')}">${getInitials(m.user?.name || '?')}</div>`
      ).join('') + (members.length > 4 ? `<div class="member-avatar" title="More">+${members.length - 4}</div>` : '');
      return `
      <div class="project-card" onclick="window.location.href='project.html?id=${p._id}'">
        <div class="flex justify-between items-center" style="margin-bottom:8px">
          <div class="project-card-title" style="margin-bottom:0">${esc(p.title)}</div>
          ${canManage ? `
            <button class="task-btn delete-btn" onclick="deleteProject(event, '${p._id}', '${esc(p.title)}')" title="Delete Project">
              <i class="fa fa-trash-can"></i>
            </button>
          ` : ''}
        </div>
        <div class="project-card-desc">${esc(p.description) || '<em style="opacity:.4">No description</em>'}</div>
        <div class="project-card-meta">
          <div class="member-avatars">${avatarHtml}</div>
          <span class="project-role-badge ${isProjAdmin ? 'admin' : 'member'}">${isProjAdmin ? 'Admin' : 'Member'}</span>
        </div>
      </div>`;
    }).join('');
  }

  async function deleteProject(e, id, title) {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete project "${title}"? This will also delete all its tasks.`)) return;
    try {
      await api.deleteProject(id);
      showToast('Project deleted successfully', 'success');
      await loadProjects();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
  window.deleteProject = deleteProject;

  // ---- Aggregate stats across all projects ----
  async function loadAggregateStats() {
    let total = 0, todo = 0, inProgress = 0, done = 0, overdue = 0;
    const perUser = {};

    for (const proj of allProjects) {
      try {
        const data = await api.getDashboard(proj._id);
        total      += data.stats.total;
        todo       += data.stats.todo;
        inProgress += data.stats.inProgress;
        done       += data.stats.done;
        overdue    += data.stats.overdue;
        for (const u of (data.perUser || [])) {
          if (!perUser[u.name]) perUser[u.name] = 0;
          perUser[u.name] += u.count;
        }
      } catch (_) {}
    }

    document.getElementById('stat-total').textContent     = total;
    document.getElementById('stat-todo').textContent      = todo;
    document.getElementById('stat-inprogress').textContent = inProgress;
    document.getElementById('stat-done').textContent      = done;
    document.getElementById('stat-overdue').textContent   = overdue;

    drawStatusChart(todo, inProgress, done);
    drawUserChart(perUser);
  }

  // ---- All Tasks View ----
  async function loadAllTasks() {
    const container = document.getElementById('all-tasks-list');
    container.innerHTML = '<div class="spinner"></div>';
    try {
      let tasks = [];
      for (const proj of allProjects) {
        const t = await api.getTasks(proj._id);
        tasks = tasks.concat(t.map(task => ({ ...task, projectTitle: proj.title })));
      }
      const mine = tasks.filter(t => t.assignee?._id === user._id || t.assignee === user._id);
      if (!mine.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><div>No tasks assigned to you yet.</div></div>`;
        return;
      }
      container.innerHTML = mine.map(t => {
        const overdue = isOverdue(t.dueDate) && t.status !== 'Done';
        return `
        <div class="card" style="margin-bottom:12px;padding:16px">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="flex:1">
              <div style="font-weight:600;margin-bottom:4px">${esc(t.title)}</div>
              <div style="font-size:0.8rem;color:var(--text-muted)">${esc(t.projectTitle)}</div>
            </div>
            <span class="badge badge-${t.status === 'Todo' ? 'todo' : t.status === 'InProgress' ? 'inprogress' : 'done'}">${t.status}</span>
            <span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span>
            ${t.dueDate ? `<span style="font-size:0.78rem;color:${overdue ? '#f87171' : 'var(--text-muted)'}"><i class="fa fa-calendar${overdue?' fa-beat':''}" style="margin-right:4px"></i>${formatDate(t.dueDate)}</span>` : ''}
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      container.innerHTML = `<p class="text-muted">${err.message}</p>`;
    }
  }

  // ---- Chart: Status Distribution ----
  function drawStatusChart(todo, inProgress, done) {
    const canvas = document.getElementById('status-chart');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 140;
    const total = todo + inProgress + done || 1;
    const data = [
      { label: 'To Do',       value: todo,       color: '#64748b' },
      { label: 'In Progress', value: inProgress, color: '#3b82f6' },
      { label: 'Done',        value: done,        color: '#10b981' },
    ];
    // Bar chart
    const barW = 48; const gap = 24;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const chartH = 90; const startY = 10;
    const totalW = data.length * (barW + gap) - gap;
    let x = (canvas.width - totalW) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    data.forEach(d => {
      const bh = (d.value / maxVal) * chartH;
      const y = startY + chartH - bh;
      const gradient = ctx.createLinearGradient(0, y, 0, y + bh);
      gradient.addColorStop(0, d.color);
      gradient.addColorStop(1, d.color + '55');
      ctx.beginPath();
      ctx.roundRect(x, y, barW, bh, [4, 4, 0, 0]);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.value, x + barW / 2, y - 6);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(d.label, x + barW / 2, startY + chartH + 16);
      x += barW + gap;
    });
  }

  // ---- Chart: Tasks per User ----
  function drawUserChart(perUser) {
    const canvas = document.getElementById('user-chart');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 140;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const entries = Object.entries(perUser);
    if (!entries.length) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No assigned tasks yet', canvas.width / 2, 70);
      return;
    }
    const maxVal = Math.max(...entries.map(e => e[1]), 1);
    const rowH = 28; const barMaxW = canvas.width - 120; const startX = 80;
    entries.slice(0, 4).forEach(([name, count], i) => {
      const y = 16 + i * rowH;
      const bw = (count / maxVal) * barMaxW;
      const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b'];
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(name.split(' ')[0], startX - 8, y + 14);
      const gradient = ctx.createLinearGradient(startX, 0, startX + bw, 0);
      gradient.addColorStop(0, colors[i % colors.length]);
      gradient.addColorStop(1, colors[i % colors.length] + '66');
      ctx.beginPath();
      ctx.roundRect(startX, y, bw, 18, 4);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(count, startX + bw + 6, y + 13);
    });
  }

  // ---- Create Project ----
  window.openCreateProjectModal = () => openModal('create-project-modal');
  window.handleCreateProject = async (e) => {
    e.preventDefault();
    const title = document.getElementById('proj-title').value.trim();
    const description = document.getElementById('proj-desc').value.trim();
    setLoading('create-proj-btn', true, '<i class="fa fa-plus"></i> Create Project');
    try {
      await api.createProject({ title, description });
      closeModal('create-project-modal');
      document.getElementById('proj-title').value = '';
      document.getElementById('proj-desc').value = '';
      showToast('Project created!', 'success');
      await loadProjects();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading('create-proj-btn', false, '<i class="fa fa-plus"></i> Create Project');
    }
  };

  await loadProjects();
})();
