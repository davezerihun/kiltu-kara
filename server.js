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
app.use(express.static(path.join(__dirname, 'public')));
 
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
 
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
 
app.listen(PORT, () => {
  console.log(`Kiltu Kara Secondary School server running on port ${PORT}`);
});