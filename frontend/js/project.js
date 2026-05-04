// ============================================================
// project.js – Project page: Kanban board, members, tasks
// ============================================================

(async () => {
  const user = requireAuth();
  if (!user) return;
  setNavUser(user);

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');
  if (!projectId) { window.location.href = 'dashboard.html'; return; }

  let project = null;
  let tasks = [];
  let isAdminUser = false;

  // ─────────────────────────────────────────────
  // LOAD PROJECT
  // ─────────────────────────────────────────────
  async function loadProject() {
    try {
      project = await api.getProject(projectId);
      isAdminUser = project.admin._id === user._id || project.admin === user._id;

      document.getElementById('project-title-heading').textContent = project.title;
      document.getElementById('project-desc-heading').textContent  = project.description || '';
      document.getElementById('nav-project-title').textContent = `/ ${project.title}`;

      const roleBadge = document.getElementById('nav-role-badge');
      roleBadge.textContent = isAdminUser ? 'Admin' : 'Member';
      roleBadge.className = `project-role-badge ${isAdminUser ? 'admin' : 'member'}`;

      // Show/hide admin-only controls
      document.getElementById('admin-actions').classList.toggle('hidden', !isAdminUser);
      document.getElementById('add-member-btn').classList.toggle('hidden', !isAdminUser);

      renderMembers();
      populateAssigneeSelect();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ─────────────────────────────────────────────
  // LOAD + RENDER TASKS
  // ─────────────────────────────────────────────
  async function loadTasks() {
    try {
      tasks = await api.getTasks(projectId);
      renderKanban();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  const STATUS_MAP = {
    'Todo': 'Todo', 'InProgress': 'InProgress', 'Done': 'Done'
  };

  function renderKanban() {
    ['Todo', 'InProgress', 'Done'].forEach(status => {
      const col = document.getElementById(`tasks-${status}`);
      const count = document.getElementById(`count-${status}`);
      const colTasks = tasks.filter(t => t.status === status);
      count.textContent = colTasks.length;

      if (!colTasks.length) {
        col.innerHTML = `<div class="empty-state" style="padding:24px 16px">
          <div class="empty-icon" style="font-size:1.5rem">📋</div>
          <div class="empty-text">No tasks here</div>
        </div>`;
        return;
      }

      col.innerHTML = colTasks.map(t => {
        const overdue = isOverdue(t.dueDate) && t.status !== 'Done';
        const assigneeName = t.assignee?.name || '';
        return `
        <div class="task-card" draggable="true"
          data-id="${t._id}"
          ondragstart="onDragStart(event, '${t._id}')"
          ondragend="onDragEnd(event)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
            <div class="task-title">${esc(t.title)}</div>
            <div class="task-actions">
              ${isAdminUser ? `
                <button class="task-btn" onclick="openEditTask('${t._id}')" title="Edit">
                  <i class="fa fa-pencil"></i>
                </button>
                <button class="task-btn delete-btn" onclick="handleDeleteTask('${t._id}')" title="Delete">
                  <i class="fa fa-trash"></i>
                </button>` : ''}
            </div>
          </div>
          <div class="task-meta" style="margin-top:8px;">
            <span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span>
            ${t.dueDate ? `<span class="task-due ${overdue ? 'overdue' : ''}">
              <i class="fa fa-calendar${overdue ? ' fa-beat' : ''}"></i> ${formatDate(t.dueDate)}
            </span>` : ''}
            ${assigneeName ? `<span class="task-assignee-chip"><i class="fa fa-user"></i> ${esc(assigneeName)}</span>` : ''}
          </div>
        </div>`;
      }).join('');
    });
  }

  // ─────────────────────────────────────────────
  // DRAG & DROP
  // ─────────────────────────────────────────────
  let draggedTaskId = null;

  window.onDragStart = (e, taskId) => {
    draggedTaskId = taskId;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  };
  window.onDragEnd = (e) => e.target.classList.remove('dragging');
  window.onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  window.onDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    const task = tasks.find(t => t._id === draggedTaskId);
    if (!task || task.status === newStatus) { draggedTaskId = null; return; }
    try {
      await api.updateTask(draggedTaskId, { status: newStatus });
      task.status = newStatus;
      renderKanban();
      showToast(`Task moved to ${newStatus === 'InProgress' ? 'In Progress' : newStatus}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    draggedTaskId = null;
  };

  // ─────────────────────────────────────────────
  // TASK MODAL (Create / Edit)
  // ─────────────────────────────────────────────
  window.openCreateTaskModal = () => {
    document.getElementById('task-edit-id').value = '';
    document.getElementById('task-title').value   = '';
    document.getElementById('task-desc').value    = '';
    document.getElementById('task-priority').value = 'Medium';
    document.getElementById('task-due').value     = '';
    document.getElementById('task-assignee').value = '';
    document.getElementById('task-modal-title').innerHTML =
      '<i class="fa fa-square-plus" style="color:var(--accent-light)"></i> New Task';
    document.getElementById('save-task-btn').innerHTML = '<i class="fa fa-floppy-disk"></i> Save Task';
    openModal('create-task-modal');
  };

  window.openEditTask = (taskId) => {
    const t = tasks.find(t => t._id === taskId);
    if (!t) return;
    document.getElementById('task-edit-id').value  = t._id;
    document.getElementById('task-title').value    = t.title;
    document.getElementById('task-desc').value     = t.description || '';
    document.getElementById('task-priority').value = t.priority;
    document.getElementById('task-due').value      = t.dueDate ? t.dueDate.split('T')[0] : '';
    document.getElementById('task-assignee').value = t.assignee?._id || t.assignee || '';
    document.getElementById('task-modal-title').innerHTML =
      '<i class="fa fa-pencil" style="color:var(--accent-light)"></i> Edit Task';
    document.getElementById('save-task-btn').innerHTML = '<i class="fa fa-floppy-disk"></i> Update Task';
    openModal('create-task-modal');
  };

  window.handleSaveTask = async (e) => {
    e.preventDefault();
    const editId   = document.getElementById('task-edit-id').value;
    const title    = document.getElementById('task-title').value.trim();
    const desc     = document.getElementById('task-desc').value.trim();
    const priority = document.getElementById('task-priority').value;
    const due      = document.getElementById('task-due').value;
    const assignee = document.getElementById('task-assignee').value;

    setLoading('save-task-btn', true, '<i class="fa fa-floppy-disk"></i> Saving...');
    try {
      if (editId) {
        await api.updateTask(editId, {
          title, description: desc, priority,
          dueDate: due || null,
          assigneeId: assignee || null,
        });
        showToast('Task updated!', 'success');
      } else {
        await api.createTask(projectId, {
          title, description: desc, priority,
          dueDate: due || null,
          assigneeId: assignee || null,
        });
        showToast('Task created!', 'success');
      }
      closeModal('create-task-modal');
      await loadTasks();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading('save-task-btn', false, '<i class="fa fa-floppy-disk"></i> Save Task');
    }
  };

  window.handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await api.deleteTask(taskId);
      showToast('Task deleted', 'info');
      await loadTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ─────────────────────────────────────────────
  // MEMBERS
  // ─────────────────────────────────────────────
  function renderMembers() {
    const container = document.getElementById('members-list');
    const members = project.members || [];
    if (!members.length) {
      container.innerHTML = `<p style="font-size:0.8rem;color:var(--text-muted)">No members yet.</p>`;
      return;
    }
    container.innerHTML = members.map(m => {
      const mu = m.user || {};
      const canRemove = isAdminUser && mu._id !== (project.admin._id || project.admin);
      return `
      <div class="member-row">
        <div class="avatar" style="width:30px;height:30px;font-size:0.7rem;flex-shrink:0">${getInitials(mu.name || '?')}</div>
        <div class="member-info">
          <div class="member-name">${esc(mu.name || 'Unknown')}</div>
          <div class="member-email">${esc(mu.email || '')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="member-role-pill ${m.role}">${m.role}</span>
          ${canRemove ? `<button class="task-btn delete-btn" onclick="handleRemoveMember('${mu._id}')" title="Remove"><i class="fa fa-xmark"></i></button>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function populateAssigneeSelect() {
    const sel = document.getElementById('task-assignee');
    const members = project.members || [];
    sel.innerHTML = '<option value="">Unassigned</option>' +
      members.map(m => `<option value="${m.user._id || m.user}">${esc(m.user.name || '')}</option>`).join('');
  }

  window.openAddMemberModal = () => {
    document.getElementById('member-email').value = '';
    openModal('add-member-modal');
  };

  window.handleAddMember = async (e) => {
    e.preventDefault();
    const email = document.getElementById('member-email').value.trim();
    const role  = document.getElementById('member-role').value;
    setLoading('add-member-btn-submit', true, '<i class="fa fa-plus"></i> Adding...');
    try {
      await api.addMember(projectId, { email, role });
      closeModal('add-member-modal');
      showToast('Member added!', 'success');
      await loadProject();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading('add-member-btn-submit', false, '<i class="fa fa-plus"></i> Add Member');
    }
  };

  window.handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await api.removeMember(projectId, memberId);
      showToast('Member removed', 'info');
      await loadProject();
      await loadTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────
  await loadProject();
  await loadTasks();
})();
