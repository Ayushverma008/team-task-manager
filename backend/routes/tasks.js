const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams for :id from projects
const { protect } = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');

const isAdmin = (project, user) =>
  user.role === 'admin' || project.admin.toString() === user._id.toString();

const isMember = (project, user) => {
  if (isAdmin(project, user)) return true;
  return project.members.some((m) => m.user.toString() === user._id.toString());
};

// @route GET /api/projects/:id/tasks
router.get('/', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isMember(project, req.user))
      return res.status(403).json({ message: 'Access denied' });

    const tasks = await Task.find({ project: req.params.id })
      .populate('assignee', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/projects/:id/tasks  (admin only)
router.post('/', protect, async (req, res) => {
  const { title, description, dueDate, priority, assigneeId } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isAdmin(project, req.user))
      return res.status(403).json({ message: 'Only admin can create tasks' });

    const task = await Task.create({
      title,
      description,
      dueDate: dueDate || null,
      priority: priority || 'Medium',
      status: 'Todo',
      assignee: assigneeId || null,
      project: req.params.id,
    });
    await task.populate('assignee', 'name email');
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PATCH /api/tasks/:taskId
router.patch('/:taskId', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = task.project;
    if (!isMember(project, req.user))
      return res.status(403).json({ message: 'Access denied' });

    const adminUser = isAdmin(project, req.user);

    // Members can only update status
    if (!adminUser) {
      if (Object.keys(req.body).some((k) => k !== 'status')) {
        return res.status(403).json({ message: 'Members can only update status' });
      }
    }

    const allowed = adminUser
      ? ['title', 'description', 'dueDate', 'priority', 'status', 'assignee']
      : ['status'];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    // Allow assigneeId for admins
    if (adminUser && req.body.assigneeId !== undefined) {
      task.assignee = req.body.assigneeId || null;
    }

    await task.save();
    await task.populate('assignee', 'name email');
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route DELETE /api/tasks/:taskId  (admin only)
router.delete('/:taskId', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (!isAdmin(task.project, req.user))
      return res.status(403).json({ message: 'Only admin can delete tasks' });

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
