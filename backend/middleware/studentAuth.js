const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

module.exports = async function studentAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'Student login required' });
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(503).json({ message: 'JWT_SECRET is not configured' });
    const payload = jwt.verify(token, secret);
    if (payload.role !== 'student' || !payload.id) return res.status(401).json({ message: 'Invalid student session' });
    const student = await Student.findById(payload.id).select('_id name email');
    if (!student) return res.status(401).json({ message: 'Student account not found' });
    req.student = student;
    next();
  } catch (_) {
    return res.status(401).json({ message: 'Invalid or expired student session' });
  }
};
