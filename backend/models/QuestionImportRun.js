const mongoose = require('mongoose');

const questionImportRunSchema = new mongoose.Schema({
  trigger: { type: String, enum: ['github-actions', 'manual'], default: 'github-actions' },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  status: { type: String, enum: ['running', 'success', 'partial', 'failed'], default: 'running' },
  fetched: { type: Number, default: 0 },
  inserted: { type: Number, default: 0 },
  duplicates: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  errors: [{ type: String }],
  sources: [{ type: String }]
});

module.exports = mongoose.model('QuestionImportRun', questionImportRunSchema);
