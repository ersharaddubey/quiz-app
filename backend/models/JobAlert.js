const mongoose = require('mongoose');

const jobAlertSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  organization: { type: String, required: true, trim: true },
  examCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  description: { type: String, default: '' },
  vacancies: { type: Number, default: null, min: 0 },
  applicationStart: { type: Date, default: null },
  applicationEnd: { type: Date, default: null, index: true },
  examDate: { type: Date, default: null },
  admitCardUrl: { type: String, default: '' },
  resultUrl: { type: String, default: '' },
  officialUrl: { type: String, required: true },
  sourceVerifiedAt: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
jobAlertSchema.pre('save', function(next) {
  if (this.applicationStart && this.applicationEnd && this.applicationEnd < this.applicationStart) {
    return next(new Error('applicationEnd cannot be before applicationStart'));
  }
  this.updatedAt = new Date();
  next();
});
jobAlertSchema.index({ status: 1, applicationEnd: 1 });
module.exports = mongoose.model('JobAlert', jobAlertSchema);
