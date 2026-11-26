const mongoose = require('mongoose');

const mockTestSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  instructions: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true }],
  sections: [{ title: { type: String, required: true, trim: true }, questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }] }],
  durationMinutes: { type: Number, required: true, min: 1, max: 600, default: 60 },
  marksPerQuestion: { type: Number, min: 0, default: 1 },
  negativeMarksPerWrong: { type: Number, min: 0, default: 0 },
  isPublished: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
mockTestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});
mockTestSchema.index({ isPublished: 1, category: 1 });
module.exports = mongoose.model('MockTest', mockTestSchema);
