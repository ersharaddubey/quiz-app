const mongoose = require('mongoose');
const studentTopicProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  syllabus: { type: mongoose.Schema.Types.ObjectId, ref: 'Syllabus', required: true },
  topic: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now }
});
studentTopicProgressSchema.index({ student: 1, syllabus: 1, topic: 1 }, { unique: true });
module.exports = mongoose.model('StudentTopicProgress', studentTopicProgressSchema);
