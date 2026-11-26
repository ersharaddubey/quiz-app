const mongoose = require('mongoose');

const mockTestSessionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'MockTest', required: true, index: true },
  startedAt: { type: Date, default: Date.now, required: true },
  expiresAt: { type: Date, required: true, index: true },
  submittedAt: { type: Date, default: null },
  status: { type: String, enum: ['active', 'submitting', 'submitted', 'expired'], default: 'active', index: true }
}, { timestamps: true });

// At most one in-flight attempt per student/test, including concurrent start requests.
mockTestSessionSchema.index(
  { student: 1, test: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['active', 'submitting'] } } }
);

module.exports = mongoose.model('MockTestSession', mockTestSessionSchema);
