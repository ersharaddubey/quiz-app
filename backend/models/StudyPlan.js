const mongoose = require('mongoose');
const studyPlanSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  tasks: [{
    title: { type: String, required: true, trim: true, maxlength: 120 },
    subject: { type: String, default: '', maxlength: 80 },
    targetMinutes: { type: Number, default: 30, min: 5, max: 600 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null }
  }],
  updatedAt: { type: Date, default: Date.now }
});
studyPlanSchema.index({ student: 1, dateKey: 1 }, { unique: true });
module.exports = mongoose.model('StudyPlan', studyPlanSchema);
