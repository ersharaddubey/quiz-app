// Explicit Vercel function route for nested automation endpoints.
// Keep these requests on the same Express router and shared MongoDB connection.
const app = require('../../server');

module.exports = app;
