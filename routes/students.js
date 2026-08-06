const express = require('express');
const router = express.Router();
const Student = require('../models/student');
const requireAuth = require('../middleware/auth');

// All student routes require a valid JWT
router.use(requireAuth);

// GET /api/students  — return all students, newest first
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students  — register a new student
router.post('/', async (req, res) => {
  try {
    const { studentId, name, gender, klass, section, phone, paid, date } = req.body;

    if (!studentId || !name || !gender || !klass || !section || !phone || !date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Reject duplicate IDs
    const exists = await Student.findOne({ studentId });
    if (exists) {
      return res.status(409).json({ error: 'Student ID already exists.' });
    }

    const student = await Student.create({ studentId, name, gender, klass, section, phone, paid, date });
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id  — remove a student by MongoDB _id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Student not found.' });
    res.json({ message: 'Student deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
