const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kiltu_kara_db')
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// SCHEMAS (FLEXIBLE VALIDATION TO PREVENT FORM SUBMISSION ERRORS)
const standardStudentSchema = new mongoose.Schema({
  fullName: { type: String, required: false },
  firstName: String,
  lastName: String,
  gender: String,
  age: Number,
  grade: String,
  stream: String,
  academicAverage: Number,
  previousSchool: String,
  woreda: String,
  kebele: String,
  guardianName: String,
  phone: String,
  address: String,
  isTrashed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

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
  isTrashed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const StandardStudent = mongoose.model('StandardStudent', standardStudentSchema);
const OfficialStudent = mongoose.model('OfficialStudent', officialStudentSchema);

// PUBLIC SUBMISSIONS
app.post('/api/register', async (req, res) => {
  try {
    const data = req.body;

    // Build fullName if submitted as separate fields
    if (!data.fullName && (data.firstName || data.lastName)) {
      data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }

    // Fallback if fullName is still empty
    if (!data.fullName) {
      data.fullName = data.studentName || 'Unnamed Student';
    }

    const student = new StandardStudent(data);
    await student.save();
    res.status(201).json({ message: 'Standard registration successful!' });
  } catch (error) {
    console.error('STANDARD SUBMISSION ERROR:', error);
    res.status(500).json({ error: error.message || 'Failed standard submission' });
  }
});

app.post('/api/official-register', async (req, res) => {
  try {
    const officialStudent = new OfficialStudent(req.body);
    await officialStudent.save();
    res.status(201).json({ message: 'Official registration successful!' });
  } catch (error) {
    console.error('OFFICIAL SUBMISSION ERROR:', error);
    res.status(500).json({ error: error.message || 'Failed official submission' });
  }
});

// ADMIN LOGIN
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

// STANDARD API ROUTES
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

app.patch('/api/admin/standard-students/:id/trash', async (req, res) => {
  try {
    const { isTrashed } = req.body;
    const updated = await StandardStudent.findByIdAndUpdate(req.params.id, { isTrashed }, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update trash status' });
  }
});

app.delete('/api/admin/standard-students/:id', async (req, res) => {
  try {
    await StandardStudent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Permanently deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// OFFICIAL API ROUTES
app.get('/api/admin/official-students', async (req, res) => {
  try {
    const students = await OfficialStudent.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch official records' });
  }
});

app.put('/api/admin/official-students/:id', async (req, res) => {
  try {
    const updated = await OfficialStudent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update official record' });
  }
});

app.patch('/api/admin/official-students/:id/trash', async (req, res) => {
  try {
    const { isTrashed } = req.body;
    const updated = await OfficialStudent.findByIdAndUpdate(req.params.id, { isTrashed }, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update trash status' });
  }
});

app.delete('/api/admin/official-students/:id', async (req, res) => {
  try {
    await OfficialStudent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Permanently deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete official record' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));