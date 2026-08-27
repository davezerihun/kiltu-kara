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
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kiltu_kara_db';

mongoose.connect(MONGO_URI, {
  // Connection pool — handles parallel requests on Render without queuing
  maxPoolSize:        20,   // up to 20 simultaneous DB connections
  minPoolSize:        2,    // keep 2 warm connections ready
  serverSelectionTimeoutMS: 8000,  // fail fast if MongoDB Atlas is unreachable
  socketTimeoutMS:    45000,       // drop idle sockets after 45 s
  connectTimeoutMS:   10000,       // initial connection timeout
  heartbeatFrequencyMS: 10000,     // check connection health every 10 s
  retryWrites:        true,
})
  .then(() => {
    console.log('Connected to MongoDB successfully');
    seedAdminIfNone();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Reconnect on unexpected disconnect (important for Render free-tier sleep)
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] Mongoose disconnected — will auto-reconnect.');
});
mongoose.connection.on('error', (err) => {
  console.error('[DB] Mongoose error:', err.message);
});

// ── ADMIN SCHEMA (stored in MongoDB — survives restarts & works on all devices) ─
const adminSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  createdAt:    { type: Date, default: Date.now }
});
const Admin = mongoose.model('Admin', adminSchema);

// ── SCHEMAS ───────────────────────────────────────────────────────────────────

const standardStudentSchema = new mongoose.Schema({
  fullName:        { type: String,  default: 'Unnamed Student' },
  firstName:       String,
  lastName:        String,
  gender:          String,
  age:             { type: Number, min: 0,   max: 100  },
  grade:           String,
  section:         String,
  stream:          String,
  academicAverage: { type: Number, min: 0,   max: 100  },
  average:         { type: Number, min: 0,   max: 100  },
  nationalId:      String,
  receiptNo:       String,
  previousSchool:  String,
  woreda:          String,
  kebele:          String,
  guardianName:    String,
  admissionType:   { type: String, trim: true },
  phone:           String,
  guardianPhone:   String,
  address:         String,
  // ── STUDENT PORTAL CREDENTIALS ──────────────────────────────────────
  portalUsername:        { type: String, default: 'Dawed za', trim: true },
  portalPasswordHash:    { type: String, default: null },
  isCredentialsChanged:  { type: Boolean, default: false },
  // ────────────────────────────────────────────────────────────────────
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
  numberOfTextbooks:        { type: Number, min: 0 },
  mainInstructionalLanguage:String,
  schoolFeedingParticipation:String,
  foodRationHomeTaking:     String,
  numberOfMealsPerWeek:     { type: Number, min: 0 },
  // Float — accepts decimal averages like 87.5
  average:                  { type: Number, min: 0, max: 100 },
  // ── STUDENT PORTAL CREDENTIALS ──────────────────────────────────────
  portalUsername:        { type: String, default: 'Dawed za', trim: true },
  portalPasswordHash:    { type: String, default: null },
  isCredentialsChanged:  { type: Boolean, default: false },
  // ────────────────────────────────────────────────────────────────────
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
  // Always run student seed alongside admin seed
  await seedDefaultStudentIfNone();
}

// ── SEED: create default student portal account on first boot ─────────────────
async function seedDefaultStudentIfNone() {
  try {
    const DEFAULT_USERNAME = 'Daved Zarihun';
    // Check both collections
    const existsStd = await StandardStudent.findOne({ portalUsername: DEFAULT_USERNAME });
    const existsOff = await OfficialStudent.findOne({ portalUsername: DEFAULT_USERNAME });

    if (!existsStd && !existsOff) {
      await StandardStudent.create({
        fullName:             'Daved Zarihun',
        firstName:            'Daved',
        lastName:             'Zarihun',
        grade:                'Grade 10',   // displayed as "Grade 10" to match app filters
        portalUsername:       DEFAULT_USERNAME,
        portalPasswordHash:   null,          // null = still using default plain password 090128
        isCredentialsChanged: false,
        isTrashed:            false
      });
      console.log('[SEED] Default student "Daved Zarihun" created in MongoDB.');
    }
  } catch (err) {
    console.error('[SEED] Failed to seed default student:', err.message);
  }
}

// ── PUBLIC SUBMISSION ROUTES ──────────────────────────────────────────────────

// Standard registration
// Accepts concurrent requests safely — async/await + connection pool handles parallelism
app.post('/api/register', async (req, res) => {
  try {
    const data = { ...req.body }; // clone so we don't mutate req.body

    // Require at least a name
    if (!data.fullName && !data.firstName) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    // Build fullName from parts if not supplied directly
    if (!data.fullName && (data.firstName || data.lastName)) {
      data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
    if (!data.fullName) {
      data.fullName = data.studentName || 'Unnamed Student';
    }

    // Coerce numeric fields — float-safe: Number('87.5') === 87.5
    data.age             = toNum(data.age);
    data.academicAverage = toNum(data.academicAverage);
    data.average         = toNum(data.average);

    // Range guard (schema min/max only warns — this returns a clean 400)
    if (data.average !== undefined && (data.average < 0 || data.average > 100)) {
      return res.status(400).json({ error: 'Average must be between 0 and 100.' });
    }

    const student = new StandardStudent(data);
    await student.save();
    res.status(201).json({ message: 'Standard registration successful!' });
  } catch (error) {
    console.error('[/api/register] Error:', error.message);
    // Return 400 for validation errors, 500 for unexpected failures
    const status = error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ error: error.message || 'Registration failed.' });
  }
});

// Official census registration
// Accepts concurrent requests safely — each save() is independent and non-blocking
app.post('/api/official-register', async (req, res) => {
  try {
    const body = { ...req.body }; // clone

    // Require first name and grade at minimum
    if (!body.firstName) {
      return res.status(400).json({ error: 'First name is required.' });
    }
    if (!body.gradeLevel) {
      return res.status(400).json({ error: 'Grade level is required.' });
    }

    // Coerce numeric fields — float-safe
    body.numberOfTextbooks    = toNum(body.numberOfTextbooks);
    body.numberOfMealsPerWeek = toNum(body.numberOfMealsPerWeek);
    body.average              = toNum(body.average);

    // Range guard
    if (body.average !== undefined && (body.average < 0 || body.average > 100)) {
      return res.status(400).json({ error: 'Average must be between 0 and 100.' });
    }

    const officialStudent = new OfficialStudent(body);
    await officialStudent.save();
    res.status(201).json({ message: 'Official registration successful!' });
  } catch (error) {
    console.error('[/api/official-register] Error:', error.message);
    const status = error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ error: error.message || 'Official registration failed.' });
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
    const students = await StandardStudent.find()
      .select('-portalPasswordHash')
      .sort({ createdAt: -1 });
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
    const students = await OfficialStudent.find()
      .select('-portalPasswordHash')
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch official records' });
  }
});

app.put('/api/admin/official-students/:id', async (req, res) => {
  try {
    // Use $set so every sent field (including empty strings) overwrites the stored value.
    // runValidators: false — allows clearing optional fields without schema min/max errors.
    const updated = await OfficialStudent.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: false }
    );
    if (!updated) return res.status(404).json({ error: 'Record not found.' });
    res.json(updated);
  } catch (error) {
    console.error('[PUT official-student] Error:', error.message);
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
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── NAMED PAGE ROUTES ────────────────────────────────────────────────────────
app.get('/online_reg.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'online_reg.html'));
});
app.get('/off_reg.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'off_reg.html'));
});
app.get('/admin.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/login.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/student_login.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student_login.html'));
});
app.get('/student_dashboard.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student_dashboard.html'));
});

// ── STUDENT PORTAL AUTH ───────────────────────────────────────────────────────

// Default password (plain) used when isCredentialsChanged is false
const STUDENT_DEFAULT_PASSWORD = process.env.STUDENT_DEFAULT_PASS || '090128';

// Helper — find a student across both collections.
// Searches by portalUsername first, then falls back to fullName and firstName match.
// This allows newly registered students (who haven't set a custom username yet)
// to log in using their full name as the username.
async function findStudentByUsername(username) {
  const trimmed = username.trim();

  // 1. Exact portalUsername match (fastest — used after credentials are set)
  let student = await StandardStudent.findOne({ portalUsername: trimmed });
  if (student) return { student, collection: 'standard' };
  student = await OfficialStudent.findOne({ portalUsername: trimmed });
  if (student) return { student, collection: 'official' };

  // 2. Fallback: match against fullName (case-insensitive) for newly registered students
  const regex = new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  student = await StandardStudent.findOne({ fullName: regex });
  if (student) return { student, collection: 'standard' };

  // 3. Fallback: match official student by firstName + fathersName combined
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const firstRx  = new RegExp(`^${parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const fatherRx = new RegExp(`^${parts.slice(1).join(' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    student = await OfficialStudent.findOne({ firstName: firstRx, fathersName: fatherRx });
    if (student) return { student, collection: 'official' };
  }

  return null;
}

// POST /api/student/login
app.post('/api/student/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const found = await findStudentByUsername(username);
    if (!found) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const { student } = found;

    let match = false;
    if (!student.isCredentialsChanged) {
      // Still using default password — compare plain text
      match = (password === STUDENT_DEFAULT_PASSWORD);
    } else {
      // Custom password set — compare bcrypt hash
      match = await bcrypt.compare(password, student.portalPasswordHash);
    }

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Return only safe profile fields — never send passwordHash
    res.json({
      success: true,
      isCredentialsChanged: student.isCredentialsChanged,
      studentId: student._id,
      collection: found.collection,
      profile: {
        fullName:    student.fullName || `${student.firstName || ''} ${student.fathersName || ''}`.trim(),
        grade:       student.grade    || student.gradeLevel || '',
        section:     student.section  || '',
        stream:      student.stream   || student.educationStream || '',
        average:     student.average  || student.academicAverage || null,
        gender:      student.gender   || student.sex || '',
        woreda:      student.woreda   || '',
        kebele:      student.kebele   || '',
        guardianName:student.guardianName || student.parentGuardianFullName || '',
        guardianPhone:student.guardianPhone || student.phone || student.parentGuardianPhone || '',
        portalUsername: student.portalUsername
      }
    });
  } catch (err) {
    console.error('[STUDENT LOGIN]', err.message);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// POST /api/student/change-credentials
// Body: { studentId, collection, currentPassword, newUsername, newPassword }
app.post('/api/student/change-credentials', async (req, res) => {
  try {
    const { studentId, collection, currentPassword, newUsername, newPassword } = req.body;

    if (!studentId || !collection || !currentPassword || !newUsername || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters.' });
    }

    const Model = collection === 'official' ? OfficialStudent : StandardStudent;
    const student = await Model.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    // Verify current password
    let match = false;
    if (!student.isCredentialsChanged) {
      match = (currentPassword === STUDENT_DEFAULT_PASSWORD);
    } else {
      match = await bcrypt.compare(currentPassword, student.portalPasswordHash);
    }
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    // Check username uniqueness (skip if same student keeps their own name)
    const trimmedUsername = newUsername.trim();
    if (trimmedUsername !== student.portalUsername) {
      const taken = await findStudentByUsername(trimmedUsername);
      if (taken && taken.student._id.toString() !== studentId) {
        return res.status(409).json({ success: false, message: 'That username is already taken.' });
      }
    }

    // Hash new password and save
    const newHash = await bcrypt.hash(newPassword, 10);
    student.portalUsername       = trimmedUsername;
    student.portalPasswordHash   = newHash;
    student.isCredentialsChanged = true;
    await student.save();

    res.json({ success: true, message: 'Credentials updated successfully.', newUsername: trimmedUsername });
  } catch (err) {
    console.error('[STUDENT CHANGE-CREDENTIALS]', err.message);
    res.status(500).json({ success: false, message: 'Server error while updating credentials.' });
  }
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
