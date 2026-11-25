const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'quiz-app-dev-secret-change-in-production';
    const decoded = jwt.verify(token, secret);
    // Student sessions must never authorize admin endpoints.
    if (decoded.role === 'student') return res.status(403).json({ message: 'Admin access required' });
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
