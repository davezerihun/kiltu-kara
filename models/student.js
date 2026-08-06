const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, trim: true },
  name:      { type: String, required: true, trim: true },
  gender:    { type: String, required: true, enum: ['Male', 'Female'] },
  klass:     { type: String, required: true },
  section:   { type: String, required: true, maxlength: 1 },
  phone:     { type: String, required: true, trim: true },
  paid:      { type: Boolean, default: true },
  date:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema);
