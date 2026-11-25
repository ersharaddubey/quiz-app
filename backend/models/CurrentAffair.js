const mongoose = require('mongoose');

const currentAffairSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  summary: { type: String, default: '' },
  question: { type: String, required: true, trim: true },
  options: { type: [String], required: true, validate: v => v.length >= 2 },
  correctAnswer: { type: Number, required: true, min: 0 },
  explanation: { type: String, default: '' },
  topic: { type: String, default: 'General', index: true },
  language: { type: String, enum: ['hi', 'en'], default: 'en', index: true },
  sourceName: { type: String, default: '' },
  sourceUrl: { type: String, default: '' },
  sourceDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
currentAffairSchema.pre('save', function(next) {
  if (this.correctAnswer >= this.options.length) return next(new Error('correctAnswer is outside options range'));
  this.updatedAt = new Date();
  next();
});
currentAffairSchema.index({ status: 1, sourceDate: -1, language: 1 });
module.exports = mongoose.model('CurrentAffair', currentAffairSchema);
