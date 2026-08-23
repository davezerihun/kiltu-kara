const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kiltu_kara_db';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema Definitions with Timestamps
const StudentSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const StandardStudent = mongoose.model('StandardStudent', StudentSchema, 'standard_students');
const OfficialStudent = mongoose.model('OfficialStudent', StudentSchema, 'official_students');

// 1. ADMIN LOGIN API
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  if (password === ADMIN_PASSWORD) {
    return res.status(200).json({ success: true, message: 'Login successful' });
  } else {
    return res.status(401).json({ success: false, message: 'Incorrect password!' });
  }
});

// 2. ONLINE REGISTRATION API
app.post('/api/register', async (req, res) => {
  try {
    const student = new StandardStudent(req.body);
    await student.save();
    return res.status(201).json({ success: true, message: 'Standard registration successful!' });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. OFFICIAL CENSUS REGISTRATION API
app.post('/api/official-register', async (req, res) => {
  try {
    const officialStudent = new OfficialStudent(req.body);
    await officialStudent.save();
    return res.status(201).json({ success: true, message: 'Official registration successful!' });
  } catch (error) {
    console.error('Official Registration Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET SEPARATE LISTS OF STUDENTS (SORTED BY MOST RECENT FIRST)
app.get('/api/students', async (req, res) => {
  try {
    // .sort({ createdAt: -1 }) ensures the most recent registrations show at the top
    const standard = await StandardStudent.find().sort({ createdAt: -1 });
    const official = await OfficialStudent.find().sort({ createdAt: -1 });
    res.json({ standard, official });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student records' });
  }
});

// Fallback Route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});