const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET || 'quiz-app-dev-secret-change-in-production';
    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      admin: { id: admin._id, email: admin.email, name: admin.name }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create default admin (run once)
// Falls back to README defaults so local setup works without env vars
router.post('/setup', async (req, res) => {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@quiz.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.json({ message: 'Admin already exists', email });
    }

    const admin = new Admin({
      email,
      password,
      name: 'Super Admin'
    });

    await admin.save();
    res.json({ message: 'Admin created successfully', email: admin.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
