// ── Auth guard ───────────────────────────────────────────────────────────────
const token = localStorage.getItem('kkss_token');
if (!token) {
  window.location.replace('login.html');
}

// Show logged-in username
document.getElementById('whoami').textContent =
  localStorage.getItem('kkss_user') || 'Admin';

// Logout
document.getElementById('logoutLink').addEventListener('click', function(e) {
  e.preventDefault();
  localStorage.removeItem('kkss_token');
  localStorage.removeItem('kkss_user');
  window.location.replace('login.html');
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  };
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: authHeaders() });
  if (res.status === 401) {
    // Token expired — redirect to login
    localStorage.removeItem('kkss_token');
    localStorage.removeItem('kkss_user');
    window.location.replace('login.html');
    return null;
  }
  return res;
}

// ── Section selector ─────────────────────────────────────────────────────────
const SECTIONS = "ABCDEFGHIJK".split("");
const sectionSel = document.getElementById('section');
SECTIONS.forEach(s => {
  const o = document.createElement('option');
  o.value = s;
  o.textContent = "Section " + s;
  sectionSel.appendChild(o);
});

// ── State ─────────────────────────────────────────────────────────────────────
let students    = [];   // loaded from server
let idCounter   = 1;    // will be recalculated after load
let activeFilter = 'ALL';

const form       = document.getElementById('regForm');
const receiptArea = document.getElementById('receiptArea');
const slipTag    = document.getElementById('slipTag');

// ── ID generation ─────────────────────────────────────────────────────────────
function genId() {
  const n = String(idCounter).padStart(4, '0');
  idCounter++;
  return 'KKSS-2026-' + n;
}

function recalcCounter() {
  // Find the highest existing numeric suffix and resume from there
  let max = 0;
  students.forEach(s => {
    const m = s.studentId.match(/KKSS-2026-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  idCounter = max + 1;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function renderStats() {
  document.getElementById('statTotal').textContent = students.length;
  document.getElementById('statPaid').textContent  = students.filter(s => s.paid).length;
}

// ── Slip ──────────────────────────────────────────────────────────────────────
function renderSlip(st) {
  slipTag.textContent = st.studentId;
  receiptArea.innerHTML = `
    <div class="slip">
      <div class="slip-head">
        <div class="school">Kiltu Kara Secondary School
          <small>OFFICIAL REGISTRATION SLIP</small>
        </div>
        <div class="slip-id">${st.studentId}<br>${st.date}</div>
      </div>
      <div class="slip-row"><span>Student Name</span><span>${st.name}</span></div>
      <div class="slip-row"><span>Gender</span><span>${st.gender}</span></div>
      <div class="slip-row"><span>Class</span><span>${st.klass}</span></div>
      <div class="slip-row"><span>Section</span><span>Section ${st.section}</span></div>
      <div class="slip-row"><span>Guardian Phone</span><span>${st.phone}</span></div>
      <div class="slip-row"><span>Registration Fee</span><span>400 Birr</span></div>
      <div class="stamp ${st.paid ? '' : 'unpaid'}">${st.paid ? 'PAID<br>400 ETB' : 'PAYMENT<br>PENDING'}</div>
      <div class="slip-actions">
        <button onclick="window.print()">Print Slip</button>
        <button onclick="document.getElementById('searchBox').focus()">Find in Roster</button>
      </div>
    </div>
  `;
}

// ── Section strip ─────────────────────────────────────────────────────────────
function renderSectionsStrip() {
  const strip = document.getElementById('sectionsStrip');
  const counts = {};
  students.forEach(s => counts[s.section] = (counts[s.section] || 0) + 1);

  let html = `<span class="sec-chip ${activeFilter === 'ALL' ? 'active' : ''}" onclick="setFilter('ALL')">All (${students.length})</span>`;
  SECTIONS.forEach(sec => {
    const c = counts[sec] || 0;
    html += `<span class="sec-chip ${activeFilter === sec ? 'active' : ''}" onclick="setFilter('${sec}')">Sec ${sec} (${c})</span>`;
  });
  strip.innerHTML = html;
}

window.setFilter = function(f) {
  activeFilter = f;
  renderSectionsStrip();
  renderRoster();
};

// ── Roster ────────────────────────────────────────────────────────────────────
function renderRoster() {
  const holder = document.getElementById('rosterHolder');
  const q = document.getElementById('searchBox').value.trim().toLowerCase();

  let list = students;
  if (activeFilter !== 'ALL') list = list.filter(s => s.section === activeFilter);
  if (q) list = list.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.studentId.toLowerCase().includes(q)
  );

  if (list.length === 0) {
    holder.innerHTML = `<div class="roster-empty">No matching students.</div>`;
    return;
  }

  const rows = list.map(s => `
    <tr>
      <td><span class="badge">${s.studentId}</span></td>
      <td>${s.name}</td>
      <td>${s.klass}</td>
      <td>Section ${s.section}</td>
      <td>${s.phone}</td>
      <td><span class="badge ${s.paid ? 'paid' : 'unpaid'}">${s.paid ? 'Paid · 400 ETB' : 'Unpaid'}</span></td>
      <td>
        <button class="del-btn" data-id="${s._id}" title="Delete student">✕</button>
      </td>
    </tr>
  `).join('');

  holder.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Student ID</th><th>Name</th><th>Class</th>
          <th>Section</th><th>Guardian Phone</th><th>Fee Status</th><th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Attach delete handlers
  holder.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteStudent(btn.dataset.id));
  });
}

// ── Load students from server ─────────────────────────────────────────────────
async function loadStudents() {
  const res = await apiFetch('/api/students');
  if (!res) return;

  if (!res.ok) {
    document.getElementById('rosterHolder').innerHTML =
      `<div class="roster-empty">Failed to load students.</div>`;
    return;
  }

  students = await res.json();
  recalcCounter();
  renderStats();
  renderSectionsStrip();
  renderRoster();
}

// ── Register a new student ────────────────────────────────────────────────────
form.addEventListener('submit', async function(e) {
  e.preventDefault();

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  const st = {
    studentId: genId(),
    name:    document.getElementById('fname').value.trim(),
    gender:  document.getElementById('gender').value,
    klass:   document.getElementById('klass').value,
    section: document.getElementById('section').value,
    phone:   document.getElementById('phone').value.trim(),
    paid:    document.getElementById('paidCheck').checked,
    date:    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  try {
    const res = await apiFetch('/api/students', {
      method: 'POST',
      body: JSON.stringify(st)
    });
    if (!res) return;

    if (!res.ok) {
      const err = await res.json();
      alert('Error: ' + (err.error || 'Could not save student.'));
      idCounter--; // roll back the ID we already incremented
      return;
    }

    const saved = await res.json();
    students.unshift(saved); // add to top of local list
    renderSlip(saved);
    renderStats();
    renderSectionsStrip();
    renderRoster();
    form.reset();
    document.getElementById('paidCheck').checked = true;

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register Student & Generate Slip';
  }
});

// ── Delete a student ──────────────────────────────────────────────────────────
async function deleteStudent(id) {
  if (!confirm('Delete this student record? This cannot be undone.')) return;

  const res = await apiFetch('/api/students/' + id, { method: 'DELETE' });
  if (!res) return;

  if (!res.ok) {
    const err = await res.json();
    alert('Error: ' + (err.error || 'Could not delete student.'));
    return;
  }

  students = students.filter(s => s._id !== id);
  renderStats();
  renderSectionsStrip();
  renderRoster();
}

// ── Search ────────────────────────────────────────────────────────────────────
document.getElementById('searchBox').addEventListener('input', renderRoster);

// ── Init ──────────────────────────────────────────────────────────────────────
loadStudents();
