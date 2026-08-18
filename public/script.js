// 1. Dynamic Stream Selection based on Grade Level
function updateStreamOptions() {
    const gradeSelect = document.getElementById('grade');
    const streamSelect = document.getElementById('stream');
    
    if (!gradeSelect || !streamSelect) return;
    
    const selectedGrade = parseInt(gradeSelect.value, 10);
    streamSelect.innerHTML = '';

    if (selectedGrade === 9 || selectedGrade === 10) {
        const opt = document.createElement('option');
        opt.value = 'General';
        opt.textContent = 'General';
        streamSelect.appendChild(opt);
    } else if (selectedGrade === 11 || selectedGrade === 12) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Select Stream';
        streamSelect.appendChild(defaultOpt);

        const natOpt = document.createElement('option');
        natOpt.value = 'Natural Science';
        natOpt.textContent = 'Natural Science';
        streamSelect.appendChild(natOpt);

        const socOpt = document.createElement('option');
        socOpt.value = 'Social Science';
        socOpt.textContent = 'Social Science';
        streamSelect.appendChild(socOpt);
    } else {
        const opt = document.createElement('option');
        opt.value = 'General';
        opt.textContent = 'Select Grade First';
        streamSelect.appendChild(opt);
    }
}

// 2. Attach Event Listeners on Page Load
document.addEventListener('DOMContentLoaded', () => {
    const gradeSelect = document.getElementById('grade');
    if (gradeSelect) {
        gradeSelect.addEventListener('change', updateStreamOptions);
    }
});

// 3. Form Submission Handler
document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const responseMessage = document.getElementById('responseMessage');
    responseMessage.textContent = 'Submitting registration...';

    // Collect all input data including average and failedSubjects
    const formData = {
        fullName: document.getElementById('fullName').value,
        age: parseInt(document.getElementById('age').value, 10),
        gender: document.getElementById('gender').value,
        grade: document.getElementById('grade').value,
        stream: document.getElementById('stream').value,
        average: parseFloat(document.getElementById('average').value),
        failedSubjects: parseInt(document.getElementById('failedSubjects').value, 10) || 0,
        paymentStatus: document.getElementById('paymentStatus').value,
        paymentReference: document.getElementById('paymentReference').value
    };

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (res.ok) {
            responseMessage.style.color = 'green';
            responseMessage.textContent = 'Success: ' + data.message;
            document.getElementById('registrationForm').reset();
            updateStreamOptions(); // Reset stream dropdown options
        } else {
            responseMessage.style.color = 'red';
            responseMessage.textContent = 'Error: ' + (data.error || 'Registration failed.');
        }
    } catch (err) {
        responseMessage.style.color = 'red';
        responseMessage.textContent = 'Server connection error. Make sure your server is running.';
    }
});