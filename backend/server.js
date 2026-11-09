
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

// =====================================
// CORS CONFIGURATION
// =====================================

const allowedOrigins = [
  'https://quiz-app-admin-liart.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow server-to-server requests and health checks
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
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
  ],

  optionsSuccessStatus: 204
};

// Apply CORS before all routes
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
// ROOT API
// =====================================

app.get('/', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(200).json({
    message: 'Quiz App API is running',
    version: '2.1',
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
  console.error('Unhandled API error:', err);

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quiz API listening on port ${PORT}`);
  });
})
.catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});
