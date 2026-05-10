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
    drawWaveChart(perUser);
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
        <div class="card task-item" style="margin-bottom:12px;padding:16px" data-task-id="${t._id}">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="flex:1">
              <div style="font-weight:600;margin-bottom:4px">${esc(t.title)}</div>
              <div style="font-size:0.8rem;color:var(--text-muted)">${esc(t.projectTitle)}</div>
            </div>
            <span class="badge badge-${t.status.toLowerCase()}">${t.status}</span>
            <span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span>
            ${t.dueDate ? `<span style="font-size:0.78rem;color:${overdue ? '#f87171' : 'var(--text-muted)'}"><i class="fa fa-calendar${overdue?' fa-beat':''}" style="margin-right:4px"></i>${formatDate(t.dueDate)}</span>` : ''}
          </div>
          <div class="task-status-actions">
            <button class="status-btn todo ${t.status==='Todo'?'active':''}" onclick="updateTaskStatus('${t._id}', 'Todo')">Todo</button>
            <button class="status-btn inprogress ${t.status==='InProgress'?'active':''}" onclick="updateTaskStatus('${t._id}', 'InProgress')">In Progress</button>
            <button class="status-btn done ${t.status==='Done'?'active':''}" onclick="updateTaskStatus('${t._id}', 'Done')">Done</button>
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      container.innerHTML = `<p class="text-muted">${err.message}</p>`;
    }
  }

  window.updateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      showToast(`Task status updated to ${newStatus}`, 'success');
      await loadProjects(); // Refresh stats and charts
      if (currentView === 'allTasks') await loadAllTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  let statusChartInstance = null;
  let waveChartInstance = null;

  // ---- Chart: Status Distribution (Chart.js) ----
  function drawStatusChart(todo, inProgress, done) {
    const ctx = document.getElementById('status-chart').getContext('2d');
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['To Do', 'In Progress', 'Done'],
        datasets: [{
          data: [todo, inProgress, done],
          backgroundColor: ['#64748b', '#3b82f6', '#10b981'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6, font: { family: 'Inter', size: 10 } } }
        },
        cutout: '65%'
      }
    });
  }

  // ---- Chart: Team Progress Wave (Chart.js Area Chart) ----
  function drawWaveChart(perUser) {
    const ctx = document.getElementById('wave-chart').getContext('2d');
    if (waveChartInstance) waveChartInstance.destroy();

    const entries = Object.entries(perUser).filter(e => e[1] > 0); // Only show active contributors
    const labels = entries.map(e => e[0].split(' ')[0]);
    const values = entries.map(e => e[1]);

    const gradient = ctx.createLinearGradient(0, 0, 0, 140);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    waveChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['No Activity'],
        datasets: [{
          label: 'In Progress Tasks',
          data: values.length ? values : [0],
          borderColor: '#3b82f6',
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(255,255,255,0.05)' }, 
            ticks: { stepSize: 1, font: { family: 'Inter', size: 10 } } 
          },
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: 'Inter' },
            bodyFont: { family: 'Inter' },
            padding: 10,
            cornerRadius: 8
          }
        }
      }
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
