const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // zero-based option index
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  syllabus: { type: mongoose.Schema.Types.ObjectId, ref: 'Syllabus' },
  categoryName: { type: String, default: '' },
  subjectName: { type: String, default: '' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  explanation: { type: String, default: '' },
  // Import metadata is optional so all existing/manual question records remain valid.
  source: { type: String, default: 'admin' },
  sourceId: { type: String, default: '' },
  questionHash: { type: String, default: '' },
  autoValidated: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  importedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Unique only for populated hashes; legacy documents with an empty hash are unaffected.
questionSchema.index({ questionHash:  1 }, {
  unique: true,
  partialFilterExpression: { questionHash: { $type: 'string', $gt: '' } }
});

module.exports = mongoose.model('Question', questionSchema);
