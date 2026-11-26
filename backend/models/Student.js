const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, minlength: 8, select: false },
  createdAt: { type: Date, default: Date.now }
});

studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try { this.password = await bcrypt.hash(this.password, 12); next(); }
  catch (error) { next(error); }
});

studentSchema.methods.comparePassword = function(value) {
  return bcrypt.compare(value, this.password);
};

module.exports = mongoose.model('Student', studentSchema);
