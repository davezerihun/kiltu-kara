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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kiltu_kara_db')
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema Definitions (Strict false ensures any payload fields save cleanly)
const StudentSchema = new mongoose.Schema({}, { strict: false });
const StandardStudent = mongoose.model('StandardStudent', StudentSchema);
const OfficialStudent = mongoose.model('OfficialStudent', StudentSchema);

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

// GET ALL STUDENTS FOR ADMIN DASHBOARD
app.get('/api/students', async (req, res) => {
  try {
    const standard = await StandardStudent.find();
    const official = await OfficialStudent.find();
    res.json({ standard, official });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
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