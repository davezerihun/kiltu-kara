require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// 1. Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 2. Student Schema & Model
const studentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    grade: { type: String, required: true },
    stream: { type: String, required: true },
    average: { type: Number, required: true },
    failedSubjects: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'Completed' },
    paymentReference: { type: String, default: 'TEST-PAYMENT-BYPASS' }
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

// 3. Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kiltukarareg';
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB successfully');
        await Student.collection.dropIndex('studentId_1').catch(() => {});
    })
    .catch((err) => console.error('MongoDB Connection Error:', err));

// 4. Registration Endpoint (POST)
app.post('/api/register', async (req, res) => {
    try {
        const { 
            fullName, 
            age, 
            gender, 
            grade, 
            stream, 
            average, 
            failedSubjects, 
            paymentStatus, 
            paymentReference 
        } = req.body;

        const avgScore = parseFloat(average);
        const failedCount = parseInt(failedSubjects, 10) || 0;

        // Block registration if student violates pass-fail rules
        if (failedCount >= 4 || (failedCount === 3 && avgScore < 54)) {
            return res.status(400).json({ 
                error: 'Registration rejected: Student does not meet academic criteria to advance to the next class.' 
            });
        }

        const newStudent = await Student.create({
            fullName,
            age,
            gender,
            grade,
            stream,
            average: avgScore,
            failedSubjects: failedCount,
            paymentStatus: paymentStatus || 'Completed',
            paymentReference: paymentReference || 'TEST-PAYMENT-BYPASS'
        });

        res.status(201).json({ message: 'Student registered successfully!', student: newStudent });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to register student' });
    }
});

// 5. Fetch Students Endpoint (GET)
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find().sort({ createdAt: -1 });
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve students' });
    }
});

// 6. Delete Student Endpoint (DELETE)
app.delete('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedStudent = await Student.findByIdAndDelete(id);
        if (!deletedStudent) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.status(200).json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

// 7. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});