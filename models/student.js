const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  gender: { type: String, required: true },
  guardianPhone: { type: String, required: true },
  klass: { type: String, required: true },
  section: { type: String, required: true },
  stream: { type: String, default: 'None' }, // 'Natural Science', 'Social Science', or 'None'
  isPaid: { type: Boolean, required: true },
  status: { type: String, enum: ['Passed', 'Failed'], default: 'Passed' },
  averageScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema);