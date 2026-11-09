
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

// ===============================
// CORS CONFIGURATION
// ===============================

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(v => v.trim().replace(/\/$/, ''))
  : ['https://quiz-app-admin-liart.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests without an origin (health checks, server requests)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],
  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ]
}));

// Handle preflight requests
app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ===============================
// HEALTH CHECK
// ===============================

app.get('/', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.json({
    message: 'Quiz App API is running',
    version: '2.1',
    database: connected ? 'connected' : 'disconnected'
  });
});

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    ok: connected,
    service: 'quiz-api',
    database: connected ? 'connected' : 'disconnected'
  });
});

// ===============================
// API ROUTES
// ===============================

app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/syllabus', require('./routes/syllabus'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/upload', require('./routes/upload'));

// ===============================
// ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err);

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

// ===============================
// SERVER START
// ===============================

const PORT = process.env.PORT || 5001;

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 15000
})
.then(() => {
  console.log('MongoDB connected');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quiz API listening on port ${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});
