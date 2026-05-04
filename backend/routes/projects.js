const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');

// Helper: check if user is admin of project
const isAdmin = (project, userId) =>
  project.admin.toString() === userId.toString();

// Helper: check if user is a member (or admin) of project
const isMember = (project, userId) => {
  if (isAdmin(project, userId)) return true;
  return project.members.some((m) => m.user.toString() === userId.toString());
};

// @route POST /api/projects
router.post('/', protect, async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  try {
    const project = await Project.create({
      title,
      description,
      admin: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }],
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/projects
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { admin: req.user._id },
        { 'members.user': req.user._id },
      ],
    })
      .populate('admin', 'name email')
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/projects/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('members.user', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isMember(project, req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/projects/:id/members  (admin only)
router.post('/:id/members', protect, async (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isAdmin(project, req.user._id))
      return res.status(403).json({ message: 'Only admin can add members' });

    const User = require('../models/User');
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ message: 'User not found' });

    const alreadyMember = project.members.some(
      (m) => m.user.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) return res.status(409).json({ message: 'Already a member' });

    project.members.push({ user: userToAdd._id, role: role || 'Member' });
    await project.save();
    await project.populate('members.user', 'name email');
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route DELETE /api/projects/:id/members/:userId  (admin only)
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isAdmin(project, req.user._id))
      return res.status(403).json({ message: 'Only admin can remove members' });
    if (req.params.userId === project.admin.toString())
      return res.status(400).json({ message: 'Cannot remove admin' });

    project.members = project.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await project.save();
    res.json({ message: 'Member removed', project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/projects/:id/dashboard
router.get('/:id/dashboard', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('members.user', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isMember(project, req.user._id))
      return res.status(403).json({ message: 'Access denied' });

    const tasks = await Task.find({ project: req.params.id }).populate('assignee', 'name');
    const now = new Date();

    const stats = {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'Todo').length,
      inProgress: tasks.filter((t) => t.status === 'InProgress').length,
      done: tasks.filter((t) => t.status === 'Done').length,
      overdue: tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done'
      ).length,
    };

    // Tasks per user
    const perUser = {};
    for (const task of tasks) {
      if (task.assignee) {
        const key = task.assignee._id.toString();
        if (!perUser[key]) perUser[key] = { name: task.assignee.name, count: 0 };
        perUser[key].count++;
      }
    }

    res.json({ stats, perUser: Object.values(perUser), tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
