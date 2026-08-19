const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Student Schema
const studentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  nationalId: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['M', 'F'], required: true },
  grade: { type: String, required: true },
  stream: { type: String, enum: ['NS', 'SS', 'General'], required: true },
  average: { type: Number, required: true },
  academicStatus: String,
  previousSchool: { type: String, required: true },
  guardianName: { type: String, required: true },
  guardianPhone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);

// CREATE: Register Student
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, nationalId, age, gender, grade, stream, average, previousSchool, guardianName, guardianPhone } = req.body;
    
    const avgNum = Number(average);
    let academicStatus = 'PASSED';
    if (avgNum < 50) {
      academicStatus = 'FAILED';
    } else if (avgNum >= 50 && avgNum < 60) {
      academicStatus = 'WARNING';
    }

    const newStudent = new Student({
      fullName,
      nationalId,
      age,
      gender,
      grade,
      stream,
      average: avgNum,
      academicStatus,
      previousSchool,
      guardianName,
      guardianPhone
    });

    await newStudent.save();
    res.status(201).json({ message: 'Student registered successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ: Get All Students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Delete Student Record
app.delete('/api/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));