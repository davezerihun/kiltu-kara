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

// ── DUPLICATE DETECTION API ──────────────────────────────────────────────────

// Helper: normalize text for comparison
function normalizeText(text) {
  if (!text) return '';
  return text.toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

// Helper: normalize phone number
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.toString().replace(/[\s\-\(\)]/g, '');
}

// Helper: calculate Levenshtein distance for fuzzy string matching
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[len1][len2];
}

// Helper: calculate similarity score (0-1) where 1 is identical
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);
  if (norm1 === norm2) return 1;
  
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 0;
  
  const distance = levenshteinDistance(norm1, norm2);
  return 1 - (distance / maxLen);
}

// Main duplicate detection endpoint
app.get('/api/admin/duplicate-candidates', async (_req, res) => {
  try {
    console.log('[DUPLICATE DETECTION] Starting analysis...');
    
    // Fetch all non-trashed students from both collections
    const standardStudents = await StandardStudent.find({ isTrashed: { $ne: true } })
      .select('_id fullName firstName lastName gender age grade section stream academicAverage average nationalId guardianName guardianPhone phone woreda kebele')
      .lean();
    
    const officialStudents = await OfficialStudent.find({ isTrashed: { $ne: true } })
      .select('_id firstName fathersName grandfathersName sex gradeLevel section educationStream average parentGuardianFullName parentGuardianPhone woreda kebele')
      .lean();

    console.log(`[DUPLICATE DETECTION] Analyzing ${standardStudents.length} standard + ${officialStudents.length} official students`);

    const candidates = [];
    const processedPairs = new Set();

    // Helper to create comparison record
    function createRecord(student, collection) {
      if (collection === 'standard') {
        return {
          _id: student._id,
          collection: 'standard',
          fullName: student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          firstName: student.firstName,
          lastName: student.lastName,
          gender: student.gender,
          grade: student.grade,
          section: student.section,
          stream: student.stream,
          average: student.academicAverage || student.average,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone || student.phone,
          kebele: student.kebele,
          woreda: student.woreda,
          nationalId: student.nationalId
        };
      } else {
        return {
          _id: student._id,
          collection: 'official',
          fullName: `${student.firstName || ''} ${student.fathersName || ''} ${student.grandfathersName || ''}`.trim(),
          firstName: student.firstName,
          fathersName: student.fathersName,
          grandfathersName: student.grandfathersName,
          gender: student.sex,
          grade: student.gradeLevel,
          section: student.section,
          stream: student.educationStream,
          average: student.average,
          guardianName: student.parentGuardianFullName,
          guardianPhone: student.parentGuardianPhone,
          kebele: student.kebele,
          woreda: student.woreda
        };
      }
    }

    // Combine all students for comparison
    const allStudents = [
      ...standardStudents.map(s => createRecord(s, 'standard')),
      ...officialStudents.map(s => createRecord(s, 'official'))
    ];

    // Compare each pair
    for (let i = 0; i < allStudents.length; i++) {
      for (let j = i + 1; j < allStudents.length; j++) {
        const s1 = allStudents[i];
        const s2 = allStudents[j];

        // Create unique pair ID
        const pairId = [s1._id, s2._id].sort().join('-');
        if (processedPairs.has(pairId)) continue;
        processedPairs.add(pairId);

        // Calculate similarity scores
        const nameScore = calculateSimilarity(s1.fullName, s2.fullName);
        const guardianNameScore = calculateSimilarity(s1.guardianName, s2.guardianName);
        
        // Phone comparison
        const phone1 = normalizePhone(s1.guardianPhone);
        const phone2 = normalizePhone(s2.guardianPhone);
        const phoneMatch = phone1 && phone2 && phone1 === phone2;
        
        // Grade/section match
        const gradeMatch = normalizeText(s1.grade) === normalizeText(s2.grade);
        const sectionMatch = normalizeText(s1.section) === normalizeText(s2.section);
        
        // Kebele match
        const kebeleScore = calculateSimilarity(s1.kebele, s2.kebele);
        
        // Average comparison
        const avg1 = typeof s1.average === 'number' ? s1.average : null;
        const avg2 = typeof s2.average === 'number' ? s2.average : null;
        let avgDiff = null;
        let avgDiffPercent = null;
        if (avg1 !== null && avg2 !== null) {
          avgDiff = Math.abs(avg1 - avg2);
          avgDiffPercent = avgDiff;
        }

        // Scoring logic - consider multiple factors
        let matchScore = 0;
        const reasons = [];
        const differences = [];

        // Name similarity (most important)
        if (nameScore >= 0.85) {
          matchScore += 40;
          reasons.push(`Very similar names (${(nameScore * 100).toFixed(0)}% match)`);
        } else if (nameScore >= 0.70) {
          matchScore += 25;
          reasons.push(`Similar names (${(nameScore * 100).toFixed(0)}% match)`);
        } else if (nameScore >= 0.55) {
          matchScore += 10;
          reasons.push(`Somewhat similar names (${(nameScore * 100).toFixed(0)}% match)`);
        }

        // Guardian name
        if (guardianNameScore >= 0.80) {
          matchScore += 20;
          reasons.push(`Similar guardian names (${(guardianNameScore * 100).toFixed(0)}% match)`);
        }

        // Phone match (strong indicator)
        if (phoneMatch) {
          matchScore += 25;
          reasons.push(`Same guardian phone: ${s1.guardianPhone}`);
        } else if (s1.guardianPhone && s2.guardianPhone) {
          differences.push(`Different phones: ${s1.guardianPhone} vs ${s2.guardianPhone}`);
        }

        // Grade and section
        if (gradeMatch) {
          matchScore += 10;
          reasons.push(`Same grade: ${s1.grade}`);
        } else {
          differences.push(`Different grades: ${s1.grade || 'N/A'} vs ${s2.grade || 'N/A'}`);
        }

        if (sectionMatch && s1.section) {
          matchScore += 5;
          reasons.push(`Same section: ${s1.section}`);
        }

        // Kebele
        if (kebeleScore >= 0.80) {
          matchScore += 8;
          reasons.push(`Same/similar kebele`);
        }

        // Average score analysis (important distinguishing factor)
        if (avg1 !== null && avg2 !== null) {
          if (avgDiff <= 2) {
            matchScore += 10;
            reasons.push(`Very similar averages: ${avg1.toFixed(1)}% vs ${avg2.toFixed(1)}%`);
          } else if (avgDiff <= 5) {
            matchScore += 5;
            reasons.push(`Close averages: ${avg1.toFixed(1)}% vs ${avg2.toFixed(1)}% (diff: ${avgDiff.toFixed(1)}%)`);
          } else if (avgDiff <= 10) {
            // Small penalty for moderate difference
            matchScore -= 5;
            differences.push(`Moderate average difference: ${avg1.toFixed(1)}% vs ${avg2.toFixed(1)}% (diff: ${avgDiff.toFixed(1)}%)`);
          } else {
            // Significant penalty for large difference
            matchScore -= 15;
            differences.push(`Large average difference: ${avg1.toFixed(1)}% vs ${avg2.toFixed(1)}% (diff: ${avgDiff.toFixed(1)}%)`);
          }
        } else if (avg1 !== null || avg2 !== null) {
          differences.push(`Only one record has average: ${avg1 !== null ? avg1.toFixed(1) : 'N/A'}% vs ${avg2 !== null ? avg2.toFixed(1) : 'N/A'}%`);
        }

        // Determine category based on score
        let category = 'insufficient';
        if (matchScore >= 70) {
          category = 'strong';
        } else if (matchScore >= 45) {
          category = 'possible';
        } else if (matchScore < 30) {
          // Too low - skip this pair
          continue;
        }

        // Only include if we have meaningful evidence
        if (reasons.length >= 2 || matchScore >= 45) {
          candidates.push({
            student1: s1,
            student2: s2,
            matchScore: Math.round(matchScore),
            category,
            reasons,
            differences,
            metrics: {
              nameScore: Math.round(nameScore * 100),
              guardianNameScore: Math.round(guardianNameScore * 100),
              phoneMatch,
              gradeMatch,
              sectionMatch,
              avgDiff: avgDiff !== null ? avgDiff.toFixed(1) : null,
              avg1: avg1 !== null ? avg1.toFixed(1) : null,
              avg2: avg2 !== null ? avg2.toFixed(1) : null
            }
          });
        }
      }
    }

    // Sort by match score (highest first)
    candidates.sort((a, b) => b.matchScore - a.matchScore);

    console.log(`[DUPLICATE DETECTION] Found ${candidates.length} candidate pairs`);
    res.json({
      total: candidates.length,
      candidates: candidates.slice(0, 200), // Limit to first 200 for performance
      summary: {
        strong: candidates.filter(c => c.category === 'strong').length,
        possible: candidates.filter(c => c.category === 'possible').length,
        insufficient: candidates.filter(c => c.category === 'insufficient').length
      }
    });

  } catch (error) {
    console.error('[DUPLICATE DETECTION] Error:', error.message);
    res.status(500).json({ error: 'Failed to analyze duplicate candidates' });
  }
});

// ── ROOT REDIRECT ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── NATIONAL ID TRANSFER API ──────────────────────────────────────────────────

// GET /api/admin/nid-transfer-analysis
// Analyzes Standard students without NIDs and finds matching Official students with NIDs
app.get('/api/admin/nid-transfer-analysis', async (_req, res) => {
  try {
    console.log('[NID TRANSFER] Starting analysis...');
    
    // Get Standard students WITHOUT national IDs
    const standardStudents = await StandardStudent.find({ 
      isTrashed: { $ne: true },
      $or: [
        { nationalId: { $exists: false } },
        { nationalId: null },
        { nationalId: '' }
      ]
    }).lean();
    
    // Get Official students WITH national IDs
    const officialStudents = await OfficialStudent.find({ 
      isTrashed: { $ne: true },
      nationalId: { $exists: true, $ne: null, $ne: '' }
    }).lean();

    console.log(`[NID TRANSFER] Found ${standardStudents.length} Standard students without NIDs`);
    console.log(`[NID TRANSFER] Found ${officialStudents.length} Official students with NIDs`);

    const transferCandidates = [];
    
    // For each Standard student without NID, find best Official match
    for (const stdStudent of standardStudents) {
      const matches = [];
      
      // Build Standard student info
      const stdFullName = stdStudent.fullName || `${stdStudent.firstName || ''} ${stdStudent.lastName || ''}`.trim();
      const stdGuardian = stdStudent.guardianName || '';
      const stdPhone = stdStudent.guardianPhone || stdStudent.phone || '';
      const stdGrade = stdStudent.grade || '';
      const stdSection = stdStudent.section || '';
      const stdKebele = stdStudent.kebele || '';
      const stdWoreda = stdStudent.woreda || '';
      const stdAvg = stdStudent.academicAverage || stdStudent.average;
      const stdGender = (stdStudent.gender || '').toLowerCase();
      
      // Compare with each Official student
      for (const offStudent of officialStudents) {
        const offFullName = `${offStudent.firstName || ''} ${offStudent.fathersName || ''} ${offStudent.grandfathersName || ''}`.trim();
        const offGuardian = offStudent.parentGuardianFullName || '';
        const offPhone = offStudent.parentGuardianPhone || '';
        const offGrade = offStudent.gradeLevel || '';
        const offSection = offStudent.section || '';
        const offKebele = offStudent.kebele || '';
        const offWoreda = offStudent.woreda || '';
        const offAvg = offStudent.average;
        const offGender = (offStudent.sex || '').toLowerCase();
        
        // Calculate similarity scores
        const nameScore = calculateSimilarity(stdFullName, offFullName);
        const guardianScore = calculateSimilarity(stdGuardian, offGuardian);
        
        // Phone comparison
        const phone1 = normalizePhone(stdPhone);
        const phone2 = normalizePhone(offPhone);
        const phoneMatch = phone1 && phone2 && phone1 === phone2;
        
        // Grade/section/location matching
        const gradeMatch = normalizeText(stdGrade) === normalizeText(offGrade);
        const sectionMatch = normalizeText(stdSection) === normalizeText(offSection);
        const kebeleScore = calculateSimilarity(stdKebele, offKebele);
        const woredaMatch = normalizeText(stdWoreda) === normalizeText(offWoreda);
        const genderMatch = stdGender && offGender && stdGender === offGender;
        
        // Average comparison
        let avgDiff = null;
        let avgScore = 0;
        if (stdAvg !== null && stdAvg !== undefined && offAvg !== null && offAvg !== undefined) {
          avgDiff = Math.abs(stdAvg - offAvg);
          if (avgDiff <= 2) avgScore = 15;
          else if (avgDiff <= 5) avgScore = 10;
          else if (avgDiff <= 10) avgScore = 5;
          else avgScore = -5;
        }
        
        // Calculate confidence score (0-100)
        let confidence = 0;
        const reasons = [];
        const differences = [];
        
        // Name is most important (0-40 points)
        if (nameScore >= 0.9) {
          confidence += 40;
          reasons.push(`Very strong name match (${(nameScore * 100).toFixed(0)}%)`);
        } else if (nameScore >= 0.8) {
          confidence += 30;
          reasons.push(`Strong name match (${(nameScore * 100).toFixed(0)}%)`);
        } else if (nameScore >= 0.7) {
          confidence += 20;
          reasons.push(`Good name match (${(nameScore * 100).toFixed(0)}%)`);
        } else if (nameScore >= 0.6) {
          confidence += 10;
          reasons.push(`Moderate name match (${(nameScore * 100).toFixed(0)}%)`);
        } else {
          differences.push(`Weak name match (${(nameScore * 100).toFixed(0)}%)`);
        }
        
        // Guardian name (0-15 points)
        if (guardianScore >= 0.8) {
          confidence += 15;
          reasons.push(`Guardian name matches (${(guardianScore * 100).toFixed(0)}%)`);
        } else if (guardianScore >= 0.6) {
          confidence += 8;
          reasons.push(`Guardian name similar (${(guardianScore * 100).toFixed(0)}%)`);
        }
        
        // Phone match (0-20 points)
        if (phoneMatch) {
          confidence += 20;
          reasons.push(`Same guardian phone: ${stdPhone}`);
        } else if (stdPhone && offPhone) {
          differences.push(`Different phones: ${stdPhone} vs ${offPhone}`);
        }
        
        // Grade match (0-10 points)
        if (gradeMatch) {
          confidence += 10;
          reasons.push(`Same grade: ${stdGrade}`);
        } else {
          differences.push(`Different grades: ${stdGrade} vs ${offGrade}`);
        }
        
        // Section match (0-5 points)
        if (sectionMatch && stdSection) {
          confidence += 5;
          reasons.push(`Same section: ${stdSection}`);
        }
        
        // Kebele match (0-5 points)
        if (kebeleScore >= 0.8) {
          confidence += 5;
          reasons.push(`Same kebele: ${stdKebele}`);
        }
        
        // Woreda match (0-3 points)
        if (woredaMatch && stdWoreda) {
          confidence += 3;
          reasons.push(`Same woreda: ${stdWoreda}`);
        }
        
        // Gender match (0-2 points)
        if (genderMatch) {
          confidence += 2;
          reasons.push(`Same gender: ${stdGender}`);
        }
        
        // Average score (can add or subtract points)
        confidence += avgScore;
        if (avgDiff !== null) {
          if (avgDiff <= 5) {
            reasons.push(`Similar averages: ${stdAvg.toFixed(1)}% vs ${offAvg.toFixed(1)}%`);
          } else {
            differences.push(`Different averages: ${stdAvg.toFixed(1)}% vs ${offAvg.toFixed(1)}% (diff: ${avgDiff.toFixed(1)}%)`);
          }
        }
        
        // Only consider if minimum threshold met
        if (confidence >= 50 || (nameScore >= 0.7 && reasons.length >= 3)) {
          matches.push({
            officialStudent: {
              _id: offStudent._id,
              firstName: offStudent.firstName,
              fathersName: offStudent.fathersName,
              grandfathersName: offStudent.grandfathersName,
              fullName: offFullName,
              nationalId: offStudent.nationalId,
              sex: offStudent.sex,
              gradeLevel: offStudent.gradeLevel,
              section: offStudent.section,
              educationStream: offStudent.educationStream,
              average: offStudent.average,
              parentGuardianFullName: offStudent.parentGuardianFullName,
              parentGuardianPhone: offStudent.parentGuardianPhone,
              kebele: offStudent.kebele,
              woreda: offStudent.woreda
            },
            confidence: Math.round(confidence),
            reasons,
            differences,
            metrics: {
              nameScore: Math.round(nameScore * 100),
              guardianScore: Math.round(guardianScore * 100),
              phoneMatch,
              gradeMatch,
              sectionMatch,
              avgDiff: avgDiff !== null ? avgDiff.toFixed(1) : null
            }
          });
        }
      }
      
      // Sort matches by confidence (highest first)
      matches.sort((a, b) => b.confidence - a.confidence);
      
      // Determine recommendation
      let recommendation = 'no_match';
      let bestMatch = null;
      
      if (matches.length > 0) {
        bestMatch = matches[0];
        
        // Strong confidence and clear winner
        if (bestMatch.confidence >= 85) {
          // Check if second best is significantly lower
          if (matches.length === 1 || matches[1].confidence < bestMatch.confidence - 15) {
            recommendation = 'auto_transfer';
          } else {
            recommendation = 'review_required';
          }
        } else if (bestMatch.confidence >= 60) {
          recommendation = 'review_required';
        } else {
          recommendation = 'weak_match';
        }
      }
      
      transferCandidates.push({
        standardStudent: {
          _id: stdStudent._id,
          fullName: stdFullName,
          firstName: stdStudent.firstName,
          lastName: stdStudent.lastName,
          gender: stdStudent.gender,
          age: stdStudent.age,
          grade: stdStudent.grade,
          section: stdStudent.section,
          stream: stdStudent.stream,
          average: stdAvg,
          guardianName: stdStudent.guardianName,
          guardianPhone: stdPhone,
          kebele: stdStudent.kebele,
          woreda: stdStudent.woreda,
          currentNationalId: stdStudent.nationalId || null
        },
        matches: matches.slice(0, 3), // Top 3 matches
        bestMatch,
        recommendation
      });
    }
    
    // Count by recommendation
    const summary = {
      total: transferCandidates.length,
      autoTransfer: transferCandidates.filter(c => c.recommendation === 'auto_transfer').length,
      reviewRequired: transferCandidates.filter(c => c.recommendation === 'review_required').length,
      weakMatch: transferCandidates.filter(c => c.recommendation === 'weak_match').length,
      noMatch: transferCandidates.filter(c => c.recommendation === 'no_match').length
    };
    
    console.log(`[NID TRANSFER] Analysis complete:`, summary);
    
    res.json({
      success: true,
      candidates: transferCandidates,
      summary
    });
    
  } catch (error) {
    console.error('[NID TRANSFER] Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to analyze NID transfers' });
  }
});

// POST /api/admin/nid-transfer-execute
// Executes approved NID transfers
app.post('/api/admin/nid-transfer-execute', async (req, res) => {
  try {
    const { transfers } = req.body;
    
    if (!Array.isArray(transfers) || transfers.length === 0) {
      return res.status(400).json({ success: false, error: 'No transfers provided' });
    }
    
    console.log(`[NID TRANSFER] Executing ${transfers.length} transfers...`);
    
    const results = {
      success: [],
      failed: [],
      skipped: []
    };
    
    for (const transfer of transfers) {
      const { standardStudentId, officialStudentId, nationalId, overwriteExisting } = transfer;
      
      try {
        // Verify Standard student exists
        const stdStudent = await StandardStudent.findById(standardStudentId);
        if (!stdStudent) {
          results.failed.push({
            standardStudentId,
            error: 'Standard student not found'
          });
          continue;
        }
        
        // Verify Official student exists and has the NID
        const offStudent = await OfficialStudent.findById(officialStudentId);
        if (!offStudent) {
          results.failed.push({
            standardStudentId,
            error: 'Official student not found'
          });
          continue;
        }
        
        if (offStudent.nationalId !== nationalId) {
          results.failed.push({
            standardStudentId,
            error: 'Official student NID mismatch'
          });
          continue;
        }
        
        // Check if Standard student already has a NID
        if (stdStudent.nationalId && !overwriteExisting) {
          results.skipped.push({
            standardStudentId,
            reason: 'Already has NID',
            existingNID: stdStudent.nationalId
          });
          continue;
        }
        
        // Perform the transfer
        stdStudent.nationalId = nationalId;
        await stdStudent.save();
        
        results.success.push({
          standardStudentId,
          officialStudentId,
          nationalId,
          overwritten: !!stdStudent.nationalId
        });
        
        console.log(`[NID TRANSFER] ✓ Transferred NID ${nationalId} to student ${standardStudentId}`);
        
      } catch (error) {
        results.failed.push({
          standardStudentId,
          error: error.message
        });
      }
    }
    
    console.log(`[NID TRANSFER] Complete: ${results.success.length} success, ${results.failed.length} failed, ${results.skipped.length} skipped`);
    
    res.json({
      success: true,
      results
    });
    
  } catch (error) {
    console.error('[NID TRANSFER] Execution error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to execute transfers' });
  }
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`  → Home:         http://localhost:${PORT}/`);
  console.log(`  → Standard reg: http://localhost:${PORT}/online_reg.html`);
  console.log(`  → Official reg: http://localhost:${PORT}/off_reg.html`);
  console.log(`  → Admin:        http://localhost:${PORT}/admin.html`);
});
