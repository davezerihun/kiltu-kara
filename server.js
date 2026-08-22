const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kiltu_kara_db')
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Flexible Schemas (strict: false prevents form submission validation errors)
const StandardStudent = mongoose.model('StandardStudent', new mongoose.Schema({}, { strict: false }));
const OfficialStudent = mongoose.model('OfficialStudent', new mongoose.Schema({}, { strict: false }));

// Admin Login API Route
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  if (password === ADMIN_PASSWORD) {
    return res.status(200).json({ success: true, message: 'Login successful' });
  } else {
    return res.status(401).json({ success: false, message: 'Incorrect password!' });
  }
});

// API Endpoint: Standard Registration
app.post('/api/register', async (req, res) => {
  try {
    const student = new StandardStudent(req.body);
    await student.save();
    res.status(201).json({ message: 'Standard registration successful!' });
  } catch (error) {
    console.error('Registration Error:', error);
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
    console.error('Official Registration Error:', error);
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