let allStudents = [];

// Fetch and display students
async function loadStudents() {
  try {
    const res = await fetch('/api/students');
    allStudents = await res.json();
    renderTable(allStudents);
  } catch (err) {
    console.error('Error fetching students:', err);
  }
}

function renderTable(students) {
  const tbody = document.getElementById('studentTableBody');
  tbody.innerHTML = '';
  document.getElementById('recordCount').innerText = `Showing ${students.length} student record(s)`;

  students.forEach((student, index) => {
    // Dynamic status fallback for older database entries
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
        <td><b>${student.fullName}</b></td>
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

// DELETE FUNCTIONALITY
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

// SEARCH FILTER FUNCTIONALITY
document.getElementById('searchInput').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allStudents.filter(s => 
    (s.fullName && s.fullName.toLowerCase().includes(query)) || 
    (s.nationalId && s.nationalId.toLowerCase().includes(query))
  );
  renderTable(filtered);
});

// DOWNLOAD / EXPORT TO CSV FUNCTIONALITY
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

// Load table on startup
loadStudents();