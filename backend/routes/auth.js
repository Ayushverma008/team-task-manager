const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// @route POST /api/auth/signup
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
    body('role').optional().isIn(['member', 'admin']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role } = req.body;
    try {
      const exists = await User.findOne({ email });
      if (exists) return res.status(409).json({ message: 'Email already registered' });

      const user = await User.create({ name, email, passwordHash: password, role: role || 'member' });
      res.status(201).json({
        token: generateToken(user._id),
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// @route POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      res.json({
        token: generateToken(user._id),
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// @route GET /api/auth/me
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  res.json({ user: req.user });
});

// @route PATCH /api/auth/users/:id
router.patch('/users/:id', require('../middleware/auth').protect, async (req, res) => {
  const { name, role } = req.body;
  const isSelf = req.user._id.toString() === req.params.id;
  const isAdmin = req.user.role === 'admin';

  if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (name) user.name = name;
    if (role && isAdmin) user.role = role;
    await user.save();
    res.json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
