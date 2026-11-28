const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

// Reuse one MongoDB connection across warm serverless invocations.
async function connectToMongo() {
  if (mongoose.connection.readyState === 1) return;

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing.');
  }

  if (!global.__quizMongoConnectPromise) {
    global.__quizMongoConnectPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000
    }).catch((error) => {
      global.__quizMongoConnectPromise = null;
      throw error;
    });
  }

  await global.__quizMongoConnectPromise;
}

// =====================================
// PROJECT URLS
// =====================================

const BACKEND_URL = 'https://backend-six-eta-71.vercel.app';
const ADMIN_URL = 'https://quiz-app-admin-liart.vercel.app';

// =====================================
// CORS CONFIGURATION
// =====================================

const allowedOrigins = [
  ADMIN_URL,
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);

    console.error('Blocked CORS origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-question-import-secret', 'x-current-affairs-secret', 'x-job-alert-import-secret'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Ensure the database is connected before any route accesses models.
app.use((req, res, next) => {
  connectToMongo().then(() => next()).catch(next);
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Quiz App API is running',
    version: '2.1',
    backend: BACKEND_URL,
    admin: ADMIN_URL,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/syllabus', require('./routes/syllabus'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/automation', require('./routes/automation'));
app.use('/api/students', require('./routes/students'));
app.use('/api/student-learning', require('./routes/studentLearning'));
app.use('/api/student-tools', require('./routes/studentTools'));
app.use('/api/current-affairs', require('./routes/currentAffairs'));
app.use('/api/job-alerts', require('./routes/jobAlerts'));
app.use('/api/mock-tests', require('./routes/mockTests'));

app.use((req, res) => {
  res.status(404).json({
    message: 'API route not found',
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  console.error('API Error:', err.message);
  const isCorsError = err.message === 'Not allowed by CORS';
  res.status(isCorsError ? 403 : (err.status || 500)).json({
    message: isCorsError ? 'Origin not allowed by CORS' : (err.message || 'Internal server error')
  });
});

// Local development only. Vercel imports the Express app through api/[...path].js.
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  connectToMongo()
    .then(() => {
      console.log('MongoDB connected successfully');
      console.log('Backend:', BACKEND_URL);
      console.log('Admin:', ADMIN_URL);
      console.log('Allowed Origins:', allowedOrigins);
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Quiz API listening on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('MongoDB connection failed:', error.message);
      process.exit(1);
    });
}

module.exports = app;
