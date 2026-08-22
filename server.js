const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// 1. MONGODB CONNECTION
const mongoURI = process.env.MONGO_URI || 'YOUR_MONGODB_URI_HERE';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// 2. SCHEMAS & MODELS
const studentSchema = new mongoose.Schema({
  fullName: String,
  nationalId: String,
  age: Number,
  gender: String,
  grade: String,
  stream: String,
  average: Number,
  academicStatus: String,
  previousSchool: String,
  woreda: String,      
  kebele: String,      
  receiptNo: String,   
  guardianName: String,
  guardianPhone: String,
  isDeleted: { type: Boolean, default: false } // TRASH SYSTEM
});
const Student = mongoose.model('Student', studentSchema);

const adminSchema = new mongoose.Schema({
  password: { type: String, default: 'admin123' }
});
const Admin = mongoose.model('Admin', adminSchema);

async function initAdmin() {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      await Admin.create({ password: 'admin123' });
    }
  } catch (err) {
    console.error('Admin initialization error:', err);
  }
}
initAdmin();

// 3. PAGE ROUTES
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'), (err) => {
    if (err) res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  });
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'admin.html'), (err) => {
    if (err) res.sendFile(path.resolve(__dirname, 'public', 'admin.html'));
  });
});

// 4. STUDENT API ROUTES
app.post('/api/register', async (req, res) => {
  try {
    const avg = Number(req.body.average) || 0;
    let status = 'PASSED';
    if (avg < 50) status = 'FAILED';
    else if (avg < 60) status = 'WARNING';

    const newStudent = new Student({
      ...req.body,
      academicStatus: status
    });
    await newStudent.save();
    res.status(201).json({ message: 'Registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE / EDIT STUDENT
app.put('/api/students/:id', async (req, res) => {
  try {
    const avg = Number(req.body.average) || 0;
    let status = 'PASSED';
    if (avg < 50) status = 'FAILED';
    else if (avg < 60) status = 'WARNING';

    const updated = await Student.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, academicStatus: status }, 
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// MOVE TO TRASH (SOFT DELETE)
app.put('/api/students/:id/trash', async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ message: 'Moved to trash' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// RESTORE FROM TRASH
app.put('/api/students/:id/restore', async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isDeleted: false });
    res.json({ message: 'Restored from trash' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PERMANENT DELETE FROM TRASH
app.delete('/api/students/:id/permanent', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. ADMIN AUTHENTICATION
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    const admin = await Admin.findOne();
    if (admin && admin.password === password) {
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ success: false, message: 'Invalid password' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findOne();

    if (!admin || admin.password !== currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();
    return res.status(200).json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));