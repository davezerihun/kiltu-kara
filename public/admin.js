let allStudents = [];

// AUTHENTICATION CHECK
function checkAuth() {
  if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    loadStudents();
  } else {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('dashboardSection').style.display = 'none';
  }
}

// LOGIN VIA BACKEND
async function login(e) {
  e.preventDefault();
  const password = document.getElementById('adminPassword').value;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      sessionStorage.setItem('isAdminLoggedIn', 'true');
      document.getElementById('loginError').innerText = '';
      checkAuth();
    } else {
      document.getElementById('loginError').innerText = 'Incorrect password!';
    }
  } catch (err) {
    document.getElementById('loginError').innerText = 'Server connection error.';
  }
}

// LOGOUT
function logout() {
  sessionStorage.removeItem('isAdminLoggedIn');
  location.reload();
}

// CHANGE PASSWORD MODAL CONTROLS
function togglePasswordModal(show) {
  document.getElementById('passwordModal').style.display = show ? 'flex' : 'none';
  document.getElementById('passMsg').innerText = '';
}

// CHANGE PASSWORD API CALL
async function changePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('currPass').value;
  const newPassword = document.getElementById('newPass').value;

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();

    if (res.ok) {
      alert('Password updated successfully!');
      togglePasswordModal(false);
      document.getElementById('currPass').value = '';
      document.getElementById('newPass').value = '';
    } else {
      document.getElementById('passMsg').innerText = data.message || 'Failed to update password.';
    }
  } catch (err) {
    document.getElementById('passMsg').innerText = 'Server error.';
  }
}

// FETCH DATA
async function loadStudents() {
  try {
    const res = await fetch('/api/students');
    allStudents = await res.json();
    applyFilters();
  } catch (err) {
    console.error('Error fetching students:', err);
  }
}

// RENDER TABLE
function renderTable(students) {
  const tbody = document.getElementById('studentTableBody');
  tbody.innerHTML = '';
  document.getElementById('recordCount').innerText = `Showing ${students.length} student record(s)`;

  students.forEach((student, index) => {
    let statusText = student.academicStatus;
    if (!statusText || statusText === 'undefined') {
      const avgNum = Number(student.average) || 0;
      if (avgNum < 50) statusText = 'FAILED';
      else if (avgNum < 60) statusText = 'WARNING';
      else statusText = 'PASSED';
    }

    let badgeClass = 'status-passed';
    if (statusText === 'FAILED') badgeClass = 'status-failed';
    if (statusText === 'WARNING') badgeClass = 'status-warning';

    const row = `
      <tr>
        <td>${index + 1}</td>
        <td><b>${student.fullName || ''}</b></td>
        <td>${student.nationalId || 'N/A'}</td>
        <td>${student.age || 'N/A'}</td>
        <td>${student.gender || 'N/A'}</td>
        <td>${student.grade || 'N/A'}</td>
        <td>${student.stream || 'N/A'}</td>
        <td>${student.average !== undefined ? student.average + '%' : 'N/A'}</td>
        <td><span class="status-badge ${badgeClass}">${statusText}</span></td>
        <td>${student.previousSchool || 'N/A'}</td>
        <td>${student.guardianName || 'N/A'}</td>
        <td>${student.guardianPhone || 'N/A'}</td>
        <td><button onclick="deleteStudent('${student._id}')" class="btn-delete">Delete</button></td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

// MULTI-FILTER LOGIC
function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const selectedGrade = document.getElementById('gradeFilter').value;
  const selectedStream = document.getElementById('streamFilter').value;

  const filtered = allStudents.filter(s => {
    const matchesQuery = (s.fullName && s.fullName.toLowerCase().includes(query)) || 
                         (s.nationalId && s.nationalId.toLowerCase().includes(query));
    
    const matchesGrade = selectedGrade === 'ALL' || s.grade === selectedGrade;
    const matchesStream = selectedStream === 'ALL' || s.stream === selectedStream;

    return matchesQuery && matchesGrade && matchesStream;
  });

  renderTable(filtered);
}

// EVENT LISTENERS
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('gradeFilter').addEventListener('change', applyFilters);
document.getElementById('streamFilter').addEventListener('change', applyFilters);

// DELETE STUDENT
async function deleteStudent(id) {
  if (confirm('Are you sure you want to delete this record?')) {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadStudents();
    } else {
      alert('Failed to delete student record.');
    }
  }
}

// EXPORT TO CSV
document.getElementById('exportBtn').addEventListener('click', () => {
  if (allStudents.length === 0) {
    alert('No data available to export.');
    return;
  }

  const headers = ['Full Name', 'National ID', 'Age', 'Gender', 'Grade', 'Stream', 'Average (%)', 'Academic Status', 'Previous School', 'Guardian Name', 'Guardian Phone'];
  const csvRows = [headers.join(',')];

  allStudents.forEach(s => {
    let statusText = s.academicStatus;
    if (!statusText || statusText === 'undefined') {
      const avgNum = Number(s.average) || 0;
      if (avgNum < 50) statusText = 'FAILED';
      else if (avgNum < 60) statusText = 'WARNING';
      else statusText = 'PASSED';
    }

    const row = [
      `"${s.fullName || ''}"`,
      `"${s.nationalId || ''}"`,
      s.age || '',
      s.gender || '',
      `"${s.grade || ''}"`,
      s.stream || '',
      s.average || '',
      statusText,
      `"${s.previousSchool || ''}"`,
      `"${s.guardianName || ''}"`,
      `"${s.guardianPhone || ''}"`
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'kiltu_kara_students.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

checkAuth();