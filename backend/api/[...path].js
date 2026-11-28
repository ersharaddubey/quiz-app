// Vercel serverless entrypoint for all /api/* routes.
// The Express app handles the original request URL and manages a reusable MongoDB connection.
const app = require('../server');

module.exports = app;
