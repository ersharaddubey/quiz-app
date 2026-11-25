const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const studentAuth = require('../middleware/studentAuth');
const router = express.Router();

function tokenFor(student) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ id: student._id, role: 'student' }, secret, { expiresIn: '30d' });
}

router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Name must be 2–80 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Valid email is required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (await Student.exists({ email })) return res.status(409).json({ message: 'Email is already registered' });
    const student = await Student.create({ name, email, password });
    res.status(201).json({ token: tokenFor(student), student: { id: student._id, name: student.name, email: student.email } });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const student = await Student.findOne({ email }).select('+password');
    if (!student || !(await student.comparePassword(password))) return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: tokenFor(student), student: { id: student._id, name: student.name, email: student.email } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/me', studentAuth, (req, res) => {
  res.json({ student: { id: req.student._id, name: req.student.name, email: req.student.email } });
});

module.exports = router;
