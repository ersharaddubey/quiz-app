const mongoose = require('mongoose');

const mockTestAttemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'MockTest', required: true, index: true },
  answers: { type: mongoose.Schema.Types.Mixed, default: {} },
  correct: { type: Number, required: true, min: 0 },
  wrong: { type: Number, required: true, min: 0 },
  unanswered: { type: Number, required: true, min: 0 },
  score: { type: Number, required: true },
  maxMarks: { type: Number, required: true, min: 0 },
  accuracy: { type: Number, required: true, min: 0, max: 100 },
  wrongQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  submittedAt: { type: Date, default: Date.now, index: true }
});

mockTestAttemptSchema.index({ student: 1, submittedAt: -1 });
module.exports = mongoose.model('MockTestAttempt', mockTestAttemptSchema);
