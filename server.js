const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── DATABASE ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kiltu_kara_db')
  .then(() => {
    console.log('Connected to MongoDB successfully');
    seedAdminIfNone(); // ensure at least one admin exists on first boot
  })
  .catch(err => console.error('MongoDB connection error:', err));

// ── ADMIN SCHEMA (stored in MongoDB — survives restarts & works on all devices) ─
const adminSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  createdAt:    { type: Date, default: Date.now }
});
const Admin = mongoose.model('Admin', adminSchema);

// ── SCHEMAS ───────────────────────────────────────────────────────────────────

const standardStudentSchema = new mongoose.Schema({
  fullName:        { type: String, default: 'Unnamed Student' },
  firstName:       String,
  lastName:        String,
  gender:          String,
  age:             Number,
  grade:           String,
  section:         String,
  stream:          String,
  academicAverage: Number,
  average:         Number,
  nationalId:      String,
  receiptNo:       String,
  previousSchool:  String,
  woreda:          String,
  kebele:          String,
  guardianName:    String,
  phone:           String,
  guardianPhone:   String,
  address:         String,
  isTrashed:       { type: Boolean, default: false },
  createdAt:       { type: Date,    default: Date.now }
});

const officialStudentSchema = new mongoose.Schema({
  photo:                    String,
  hasStudentId:             String,
  studentId:                String,
  firstName:                String,
  fathersName:              String,
  grandfathersName:         String,
  admissionType:            String,
  sex:                      String,
  disability:               String,
  disabilityType:           String,
  dateOfBirth:              String,
  countryOfBirth:           String,
  regionOfBirth:            String,
  zoneOfBirth:              String,
  woredaOfBirth:            String,
  nationality:              String,
  region:                   String,
  zone:                     String,
  woreda:                   String,
  kebele:                   String,
  locationType:             String,
  studentEconomicStatus:    String,
  parentStatus:             String,
  fatherEducationLevel:     String,
  motherEducationLevel:     String,
  parentGuardianFullName:   String,
  parentGuardianEmail:      String,
  parentGuardianPhone:      String,
  familyHeadGender:         String,
  nationalId:               String,
  admissionCategory:        String,
  admissionModality:        String,
  gradeLevel:               String,
  section:                  String,
  educationStream:          String,
  careerTechnical1stField:  String,
  careerTechnical2ndField:  String,
  numberOfTextbooks:        Number,
  mainInstructionalLanguage:String,
  schoolFeedingParticipation:String,
  foodRationHomeTaking:     String,
  numberOfMealsPerWeek:     Number,
  average:                  Number,
  isTrashed:                { type: Boolean, default: false },
  createdAt:                { type: Date,    default: Date.now }
});

const StandardStudent = mongoose.model('StandardStudent', standardStudentSchema);
const OfficialStudent = mongoose.model('OfficialStudent', officialStudentSchema);

// ── HELPER ────────────────────────────────────────────────────────────────────
// Converts a value to Number; returns undefined for empty / non-numeric values
// so Mongoose does not throw a CastError on optional numeric fields.
function toNum(v) {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

// ── SEED: create default admin on first boot if no admin exists ───────────────
async function seedAdminIfNone() {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      const defaultUser = process.env.ADMIN_USER || 'admin';
      const defaultPass = process.env.ADMIN_PASS || 'admin123';
      const hash = await bcrypt.hash(defaultPass, 10);
      await Admin.create({ username: defaultUser, passwordHash: hash });
      console.log(`[SEED] Default admin "${defaultUser}" created in MongoDB.`);
    }
  } catch (err) {
    console.error('[SEED] Failed to seed admin:', err.message);
  }
}

// ── PUBLIC SUBMISSION ROUTES ──────────────────────────────────────────────────

// Standard registration
app.post('/api/register', async (req, res) => {
  try {
    const data = req.body;

    // Build fullName from parts if not supplied directly
    if (!data.fullName && (data.firstName || data.lastName)) {
      data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
    if (!data.fullName) {
      data.fullName = data.studentName || 'Unnamed Student';
    }

    // Coerce numeric fields
    data.age             = toNum(data.age);
    data.academicAverage = toNum(data.academicAverage);
    data.average         = toNum(data.average);

    const student = new StandardStudent(data);
    await student.save();
    res.status(201).json({ message: 'Standard registration successful!' });
  } catch (error) {
    console.error('STANDARD SUBMISSION ERROR:', error);
    res.status(500).json({ error: error.message || 'Failed standard submission' });
  }
});

// Official census registration
app.post('/api/official-register', async (req, res) => {
  try {
    const body = req.body;

    // Coerce numeric fields
    body.numberOfTextbooks    = toNum(body.numberOfTextbooks);
    body.numberOfMealsPerWeek = toNum(body.numberOfMealsPerWeek);
    body.average              = toNum(body.average);

    const officialStudent = new OfficialStudent(body);
    await officialStudent.save();
    res.status(201).json({ message: 'Official registration successful!' });
  } catch (error) {
    console.error('OFFICIAL SUBMISSION ERROR:', error);
    res.status(500).json({ error: error.message || 'Failed official submission' });
  }
});

// ── ADMIN AUTH ────────────────────────────────────────────────────────────────

// LOGIN — checks MongoDB, works across all devices and deployments
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    console.log(`[AUTH] Admin "${admin.username}" logged in.`);
    res.json({ success: true, token: 'authenticated-admin-session' });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// CHANGE PASSWORD — verifies master key + current password, saves bcrypt hash to MongoDB
app.post('/api/admin/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword, masterKey } = req.body;

    // 1. Verify master permission key
    const MASTER_KEY = process.env.MASTER_SECRET_KEY || 'kiltu-master-2024';
    if (masterKey !== MASTER_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid master permission key.' });
    }

    // 2. Basic strength check
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    // 3. Find the admin in MongoDB
    const adminName = (username || process.env.ADMIN_USER || 'admin').toLowerCase().trim();
    const admin = await Admin.findOne({ username: adminName });
    if (!admin) {
      return res.status(404).json({ success: false, message: `Admin "${adminName}" not found.` });
    }

    // 4. Verify current password against stored hash
    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    // 5. Hash new password and save to MongoDB — persists across restarts and all devices
    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();

    console.log(`[AUTH] Password changed for admin "${adminName}".`);
    res.json({ success: true, message: 'Password updated successfully. New password is active on all devices.' });
  } catch (err) {
    console.error('[AUTH] Change password error:', err.message);
    res.status(500).json({ success: false, message: 'Server error while changing password.' });
  }
});

// ── STANDARD STUDENT ROUTES ───────────────────────────────────────────────────

app.get('/api/admin/standard-students', async (_req, res) => {
  try {
    const students = await StandardStudent.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch standard records' });
  }
});

app.put('/api/admin/standard-students/:id', async (req, res) => {
  try {
    const updated = await StandardStudent.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update record' });
  }
});

app.patch('/api/admin/standard-students/:id/trash', async (req, res) => {
  try {
    const { isTrashed } = req.body;
    const updated = await StandardStudent.findByIdAndUpdate(
      req.params.id, { isTrashed }, { new: true }
    );
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

// ── OFFICIAL STUDENT ROUTES ───────────────────────────────────────────────────

app.get('/api/admin/official-students', async (_req, res) => {
  try {
    const students = await OfficialStudent.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch official records' });
  }
});

app.put('/api/admin/official-students/:id', async (req, res) => {
  try {
    const updated = await OfficialStudent.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update official record' });
  }
});

app.patch('/api/admin/official-students/:id/trash', async (req, res) => {
  try {
    const { isTrashed } = req.body;
    const updated = await OfficialStudent.findByIdAndUpdate(
      req.params.id, { isTrashed }, { new: true }
    );
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

// ── ROOT REDIRECT ─────────────────────────────────────────────────────────────
// Visiting http://localhost:3000/ serves the registration hub (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── NAMED PAGE ROUTES (safety fallback if static middleware misses) ────────────
app.get('/online_reg.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'online_reg.html'));
});
app.get('/off_reg.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'off_reg.html'));
});
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ── 404 CATCH-ALL ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`  → Home:         http://localhost:${PORT}/`);
  console.log(`  → Standard reg: http://localhost:${PORT}/online_reg.html`);
  console.log(`  → Official reg: http://localhost:${PORT}/off_reg.html`);
  console.log(`  → Admin:        http://localhost:${PORT}/admin.html`);
});
