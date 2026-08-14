require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const studentRoutes = require('./routes/students');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kiltukarareg';

app.use(cors());
app.use(express.json());

// Serve static files (CSS, JS, Images, HTML) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);

// Root route: redirect main address to your entry page (login.html or index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
  // Note: If your main page is index.html, change 'login.html' to 'index.html' above
});

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Kiltu Kara Secondary School server running on port ${PORT}`);
});