const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kiltu_kara_db')
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

const standardStudentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  gender: String,
  age: Number,
  grade: String,
  stream: String,
  guardianName: String,
  phone: String,
  address: String,
  createdAt: { type: Date, default: Date.now }
});

const StandardStudent = mongoose.model('StandardStudent', standardStudentSchema);

const officialStudentSchema = new mongoose.Schema({
  photo: String,
  hasStudentId: String,
  studentId: String,
  firstName: String,
  fathersName: String,
  grandfathersName: String,
  admissionType: String,
  sex: String,
  disability: String,
  disabilityType: String,
  dateOfBirth: String,
  countryOfBirth: String,
  regionOfBirth: String,
  zoneOfBirth: String,
  woredaOfBirth: String,
  nationality: String,
  region: String,
  zone: String,
  woreda: String,
  kebele: String,
  locationType: String,
  studentEconomicStatus: String,
  parentStatus: String,
  fatherEducationLevel: String,
  motherEducationLevel: String,
  parentGuardianFullName: String,
  parentGuardianEmail: String,
  parentGuardianPhone: String,
  familyHeadGender: String,
  nationalId: String,
  admissionCategory: String,
  admissionModality: String,
  gradeLevel: String,
  section: String,
  educationStream: String,
  careerTechnical1stField: String,
  careerTechnical2ndField: String,
  numberOfTextbooks: Number,
  mainInstructionalLanguage: String,
  schoolFeedingParticipation: String,
  foodRationHomeTaking: String,
  numberOfMealsPerWeek: Number,
  average: Number,
  createdAt: { type: Date, default: Date.now }
});

const OfficialStudent = mongoose.model('OfficialStudent', officialStudentSchema);

// SUBMISSIONS
app.post('/api/register', async (req, res) => {
  try {
    const student = new StandardStudent(req.body);
    await student.save();
    res.status(201).json({ message: 'Standard registration successful!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit standard registration' });
  }
});

app.post('/api/official-register', async (req, res) => {
  try {
    const officialStudent = new OfficialStudent(req.body);
    await officialStudent.save();
    res.status(201).json({ message: 'Official registration successful!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit official registration' });
  }
});

// ADMIN AUTH & DATA API
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true, token: 'authenticated-admin-session' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/api/admin/standard-students', async (req, res) => {
  try {
    const students = await StandardStudent.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch standard records' });
  }
});

app.put('/api/admin/standard-students/:id', async (req, res) => {
  try {
    const updated = await StandardStudent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update record' });
  }
});

app.delete('/api/admin/standard-students/:id', async (req, res) => {
  try {
    await StandardStudent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

app.get('/api/admin/official-students', async (req, res) => {
  try {
    const students = await OfficialStudent.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch official records' });
  }
});

app.delete('/api/admin/official-students/:id', async (req, res) => {
  try {
    await OfficialStudent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));