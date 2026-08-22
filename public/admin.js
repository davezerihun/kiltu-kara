let allStudents = [];
let currentView = 'active'; // 'active' or 'trash'

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

function logout() {
  sessionStorage.removeItem('isAdminLoggedIn');
  location.reload();
}

function switchView(view) {
  currentView = view;
  document.getElementById('activeTab').classList.toggle('active', view === 'active');
  document.getElementById('trashTab').classList.toggle('active', view === 'trash');
  applyFilters();
}

async function loadStudents() {
  try {
    const res = await fetch('/api/students');
    allStudents = await res.json();
    applyFilters();
  } catch (err) {
    console.error('Error fetching students:', err);
  }
}

function renderTable(students) {
  const tbody = document.getElementById('studentTableBody');
  tbody.innerHTML = '';
  document.getElementById('recordCount').innerText = `Showing ${students.length} record(s) [${currentView.toUpperCase()}]`;

  students.forEach((student, index) => {
    let actionButtons = '';
    
    if (currentView === 'active') {
      actionButtons = `
        <button onclick="openEditModal('${student._id}')" class="btn-edit">Edit</button>
        <button onclick="moveToTrash('${student._id}')" class="btn-delete">Trash</button>
      `;
    } else {
      actionButtons = `
        <button onclick="restoreStudent('${student._id}')" class="btn-restore">Restore</button>
        <button onclick="permanentDelete('${student._id}')" class="btn-delete">Delete Forever</button>
      `;
    }

    const row = `
      <tr>
        <td>${index + 1}</td>
        <td><b>${student.fullName || ''}</b></td>
        <td>${student.receiptNo || 'N/A'}</td>
        <td>${student.age || 'N/A'}</td>
        <td>${student.gender || 'N/A'}</td>
        <td>${student.grade || 'N/A'}</td>
        <td>${student.stream || 'N/A'}</td>
        <td>${student.average !== undefined ? student.average + '%' : 'N/A'}</td>
        <td>${student.woreda || 'N/A'}</td>
        <td>${student.kebele || 'N/A'}</td>
        <td>${student.previousSchool || 'N/A'}</td>
        <td>${student.guardianName || 'N/A'}</td>
        <td>${student.guardianPhone || 'N/A'}</td>
        <td style="white-space: nowrap;">${actionButtons}</td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const selectedGrade = document.getElementById('gradeFilter').value;
  const selectedStream = document.getElementById('streamFilter').value;

  const filtered = allStudents.filter(s => {
    const isTrash = s.isDeleted === true;
    const matchesTab = currentView === 'trash' ? isTrash : !isTrash;

    const matchesQuery = (s.fullName && s.fullName.toLowerCase().includes(query)) || 
                         (s.receiptNo && s.receiptNo.toLowerCase().includes(query));
    
    const matchesGrade = selectedGrade === 'ALL' || s.grade === selectedGrade;
    const matchesStream = selectedStream === 'ALL' || s.stream === selectedStream;

    return matchesTab && matchesQuery && matchesGrade && matchesStream;
  });

  renderTable(filtered);
}

// MOVE TO TRASH
async function moveToTrash(id) {
  if (confirm('Move this student to Trash Bin?')) {
    await fetch(`/api/students/${id}/trash`, { method: 'PUT' });
    loadStudents();
  }
}

// RESTORE FROM TRASH
async function restoreStudent(id) {
  await fetch(`/api/students/${id}/restore`, { method: 'PUT' });
  loadStudents();
}

// PERMANENT DELETE
async function permanentDelete(id) {
  if (confirm('Permanently delete this record? This action CANNOT be undone!')) {
    await fetch(`/api/students/${id}/permanent`, { method: 'DELETE' });
    loadStudents();
  }
}

// EDIT MODAL ACTIONS
function openEditModal(id) {
  const student = allStudents.find(s => s._id === id);
  if (!student) return;

  document.getElementById('editId').value = student._id;
  document.getElementById('editFullName').value = student.fullName || '';
  document.getElementById('editReceiptNo').value = student.receiptNo || '';
  document.getElementById('editAge').value = student.age || '';
  document.getElementById('editGender').value = student.gender || 'M';
  document.getElementById('editGrade').value = student.grade || 'Grade 9';
  document.getElementById('editStream').value = student.stream || 'General';
  document.getElementById('editAverage').value = student.average || '';
  document.getElementById('editWoreda').value = student.woreda || '';
  document.getElementById('editKebele').value = student.kebele || '';
  document.getElementById('editPreviousSchool').value = student.previousSchool || '';
  document.getElementById('editGuardianName').value = student.guardianName || '';
  document.getElementById('editGuardianPhone').value = student.guardianPhone || '';

  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

async function saveEdit(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;

  const payload = {
    fullName: document.getElementById('editFullName').value,
    receiptNo: document.getElementById('editReceiptNo').value,
    age: document.getElementById('editAge').value,
    gender: document.getElementById('editGender').value,
    grade: document.getElementById('editGrade').value,
    stream: document.getElementById('editStream').value,
    average: document.getElementById('editAverage').value,
    woreda: document.getElementById('editWoreda').value,
    kebele: document.getElementById('editKebele').value,
    previousSchool: document.getElementById('editPreviousSchool').value,
    guardianName: document.getElementById('editGuardianName').value,
    guardianPhone: document.getElementById('editGuardianPhone').value
  };

  const res = await fetch(`/api/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    closeEditModal();
    loadStudents();
  } else {
    alert('Failed to update record.');
  }
}

// EVENT LISTENERS
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('gradeFilter').addEventListener('change', applyFilters);
document.getElementById('streamFilter').addEventListener('change', applyFilters);

function togglePasswordModal(show) {
  document.getElementById('passwordModal').style.display = show ? 'flex' : 'none';
  document.getElementById('passMsg').innerText = '';
}

async function changePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('currPass').value;
  const newPassword = document.getElementById('newPass').value;

  const res = await fetch('/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });

  const data = await res.json();
  if (res.ok) {
    alert('Password updated!');
    togglePasswordModal(false);
  } else {
    document.getElementById('passMsg').innerText = data.message || 'Error.';
  }
}

// EXPORT TO CSV
document.getElementById('exportBtn').addEventListener('click', () => {
  const activeStudents = allStudents.filter(s => !s.isDeleted);
  if (activeStudents.length === 0) {
    alert('No active data to export.');
    return;
  }

  const headers = ['Full Name', 'Receipt No', 'Age', 'Gender', 'Grade', 'Stream', 'Average (%)', 'Woreda', 'Kebele', 'Previous School', 'Guardian Name', 'Guardian Phone'];
  const csvRows = [headers.join(',')];

  activeStudents.forEach(s => {
    const row = [
      `"${s.fullName || ''}"`,
      `"${s.receiptNo || ''}"`,
      s.age || '',
      s.gender || '',
      `"${s.grade || ''}"`,
      s.stream || '',
      s.average || '',
      `"${s.woreda || ''}"`,
      `"${s.kebele || ''}"`,
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