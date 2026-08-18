let allStudents = [];
let currentlyFilteredStudents = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchStudents();

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterGrade').addEventListener('change', applyFilters);
    document.getElementById('filterStream').addEventListener('change', applyFilters);
    document.getElementById('filterPayment').addEventListener('change', applyFilters);
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
});

async function fetchStudents() {
    const tableBody = document.getElementById('studentsTableBody');
    try {
        const res = await fetch('/api/students');
        if (!res.ok) throw new Error('Failed to fetch data');

        allStudents = await res.json();
        applyFilters();
    } catch (err) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align:center; color:red; font-weight:bold;">
                    Error loading students. Make sure your server is running.
                </td>
            </tr>`;
    }
}

function applyFilters() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    const gradeFilter = document.getElementById('filterGrade').value;
    const streamFilter = document.getElementById('filterStream').value;
    const paymentFilter = document.getElementById('filterPayment').value;

    currentlyFilteredStudents = allStudents.filter(student => {
        const matchesSearch = (student.fullName && student.fullName.toLowerCase().includes(searchQuery)) ||
                              (student.paymentReference && student.paymentReference.toLowerCase().includes(searchQuery));
        
        const matchesGrade = gradeFilter === 'ALL' || String(student.grade) === gradeFilter;
        const matchesStream = streamFilter === 'ALL' || student.stream === streamFilter;
        const matchesPayment = paymentFilter === 'ALL' || student.paymentStatus === paymentFilter;

        return matchesSearch && matchesGrade && matchesStream && matchesPayment;
    });

    renderTable(currentlyFilteredStudents);
}

function getAcademicStatus(student) {
    if (student.average === undefined || student.average === null) {
        return '<span style="color: #6c757d; font-weight: bold; background: #e9ecef; padding: 4px 8px; border-radius: 4px;">N/A</span>';
    }

    const failed = student.failedSubjects || 0;
    const avg = parseFloat(student.average);

    if (failed >= 4 || (failed === 3 && avg < 54)) {
        return '<span style="color: #d9534f; font-weight: bold; background: #fdf2f2; padding: 4px 8px; border-radius: 4px;">FAILED</span>';
    }

    return '<span style="color: #5cb85c; font-weight: bold; background: #f4fbf7; padding: 4px 8px; border-radius: 4px;">PASSED</span>';
}

function renderTable(students) {
    const tableBody = document.getElementById('studentsTableBody');
    const studentCount = document.getElementById('studentCount');

    studentCount.textContent = students.length;

    if (students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align:center;">No student records found matching the filters.</td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = students.map((s, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(s.fullName)}</strong></td>
            <td>${s.age || 'N/A'}</td>
            <td>${s.gender || 'N/A'}</td>
            <td>${s.grade ? 'Grade ' + s.grade : 'N/A'}</td>
            <td>${s.stream || 'N/A'}</td>
            <td>${s.average != null ? s.average + '%' : 'N/A'}</td>
            <td>${getAcademicStatus(s)}</td>
            <td><span class="badge badge-${(s.paymentStatus || 'completed').toLowerCase()}">${s.paymentStatus || 'Completed'}</span></td>
            <td><code>${escapeHtml(s.paymentReference || 'N/A')}</code></td>
            <td>
                <button class="btn-delete" onclick="deleteStudent('${s._id}', '${escapeHtml(s.fullName)}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteStudent(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
        const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Student deleted successfully!');
            fetchStudents(); // Refresh table
        } else {
            alert('Failed to delete student.');
        }
    } catch (err) {
        alert('Server error while deleting student.');
    }
}

function exportToCSV() {
    if (currentlyFilteredStudents.length === 0) {
        alert('No data available to export.');
        return;
    }

    const headers = ['Full Name', 'Age', 'Gender', 'Grade', 'Stream', 'Average (%)', 'Payment Status', 'Reference Code'];
    
    const rows = currentlyFilteredStudents.map(s => [
        `"${s.fullName || ''}"`,
        s.age || '',
        `"${s.gender || ''}"`,
        `"Grade ${s.grade || ''}"`,
        `"${s.stream || ''}"`,
        s.average != null ? s.average : '',
        `"${s.paymentStatus || 'Completed'}"`,
        `"${s.paymentReference || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'kiltu_kara_students.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[m]);
}