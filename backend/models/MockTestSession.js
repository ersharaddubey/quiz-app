const mongoose = require('mongoose');
const mockTestSessionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'MockTest', required: true, index: true },
  startedAt: { type: Date, default: Date.now, required: true },
  expiresAt: { type: Date, required: true, index: true },
  submittedAt: { type: Date, default: null },
  status: { type: String, enum: ['active', 'submitted', 'expired'], default: 'active', index: true }
}, { timestamps: true });
mockTestSessionSchema.index({ student: 1, test: 1, status: 1 });
module.exports = mongoose.model('MockTestSession', mockTestSessionSchema);
