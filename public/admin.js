let allStudents = [];

// Fetch and display students
async function loadStudents() {
  const res = await fetch('/api/students');
  allStudents = await res.json();
  renderTable(allStudents);
}

function renderTable(students) {
  const tbody = document.getElementById('studentTableBody');
  tbody.innerHTML = '';
  document.getElementById('recordCount').innerText = `Showing ${students.length} student record(s)`;

  students.forEach((student, index) => {
    let badgeClass = 'status-passed';
    if (student.academicStatus === 'FAILED') badgeClass = 'status-failed';
    if (student.academicStatus === 'WARNING') badgeClass = 'status-warning';

    const row = `
      <tr>
        <td>${index + 1}</td>
        <td><b>${student.fullName}</b></td>
        <td>${student.nationalId || 'N/A'}</td>
        <td>${student.age}</td>
        <td>${student.gender}</td>
        <td>${student.grade}</td>
        <td>${student.stream}</td>
        <td>${student.average}%</td>
        <td><span class="${badgeClass}">${student.academicStatus}</span></td>
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
    s.fullName.toLowerCase().includes(query) || 
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
    const row = [
      `"${s.fullName}"`,
      `"${s.nationalId || ''}"`,
      s.age,
      s.gender,
      `"${s.grade}"`,
      s.stream,
      s.average,
      s.academicStatus,
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

// Load table on page start
loadStudents();