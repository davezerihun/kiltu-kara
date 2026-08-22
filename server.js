const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased payload limit to support photo uploads
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kiltu_kara_db')
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// 1. Schema for Standard Online Registration Form
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

// 2. Schema for Official Registration Form 2019
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

// API Endpoint: Standard Registration
app.post('/api/register', async (req, res) => {
  try {
    const student = new StandardStudent(req.body);
    await student.save();
    res.status(201).json({ message: 'Standard registration successful!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit standard registration' });
  }
});

// API Endpoint: Official Census Registration
app.post('/api/official-register', async (req, res) => {
  try {
    const officialStudent = new OfficialStudent(req.body);
    await officialStudent.save();
    res.status(201).json({ message: 'Official registration successful!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit official registration' });
  }
});

// Serve Main Landing Page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});