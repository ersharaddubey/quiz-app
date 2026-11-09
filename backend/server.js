
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

// =====================================
// PROJECT URLS
// =====================================

const BACKEND_URL =
  'https://backend-six-eta-71.vercel.app';

const ADMIN_URL =
  'https://quiz-app-admin-liart.vercel.app';

// =====================================
// CORS CONFIGURATION
// =====================================

const allowedOrigins = [
  ADMIN_URL,

  // Additional frontend URLs can be added
  // when the User App URL is available.
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.error('Blocked CORS origin:', origin);

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
  ],

  optionsSuccessStatus: 204
};

// CORS must run before API routes
app.use(cors(corsOptions));

// =====================================
// BODY PARSER
// =====================================

app.use(express.json({ limit: '2mb' }));

app.use(express.urlencoded({
  extended: true,
  limit: '2mb'
}));

// =====================================
// REQUEST LOGGER
// =====================================

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// =====================================
// ROOT ROUTE
// =====================================

app.get('/', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(200).json({
    message: 'Quiz App API is running',
    version: '2.1',
    backend: BACKEND_URL,
    admin: ADMIN_URL,
    database: connected ? 'connected' : 'disconnected'
  });
});

// =====================================
// HEALTH CHECK
// =====================================

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    ok: connected,
    service: 'quiz-api',
    database: connected ? 'connected' : 'disconnected'
  });
});

// =====================================
// AUTH ROUTES
// =====================================

app.use('/api/auth', require('./routes/auth'));

// =====================================
// QUESTIONS ROUTES
// =====================================

app.use('/api/questions', require('./routes/questions'));

// =====================================
// CATEGORIES ROUTES
// =====================================

app.use('/api/categories', require('./routes/categories'));

// =====================================
// SUBJECTS ROUTES
// =====================================

app.use('/api/subjects', require('./routes/subjects'));

// =====================================
// SYLLABUS ROUTES
// =====================================

app.use('/api/syllabus', require('./routes/syllabus'));

// =====================================
// BANNERS ROUTES
// =====================================

app.use('/api/banners', require('./routes/banners'));

// =====================================
// UPLOAD ROUTES
// =====================================

app.use('/api/upload', require('./routes/upload'));

// =====================================
// 404 HANDLER
// =====================================

app.use((req, res) => {
  res.status(404).json({
    message: 'API route not found',
    path: req.originalUrl
  });
});

// =====================================
// GLOBAL ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
  console.error('API Error:', err.message);

  const isCorsError = err.message === 'Not allowed by CORS';

  res.status(isCorsError ? 403 : (err.status || 500)).json({
    message: isCorsError
      ? 'Origin not allowed by CORS'
      : (err.message || 'Internal server error')
  });
});

// =====================================
// MONGODB CONNECTION
// =====================================

const PORT = process.env.PORT || 5001;

if (!process.env.MONGO_URI) {
  console.error('ERROR: MONGO_URI is missing.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 15000
})
.then(() => {
  console.log('MongoDB connected successfully');

  console.log('Backend:', BACKEND_URL);
  console.log('Admin:', ADMIN_URL);
  console.log('Allowed Origins:', allowedOrigins);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quiz API listening on port ${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});
