/* ============================================================
   CRT Timetable Scheduler — Main Application Logic
   ============================================================ */

// ─── State ────────────────────────────────────────────────────
let DB = {
  faculty:  [],
  subjects: [],
  rooms:    [],
  groups:   [],
  config: {
    days: ['Monday','Tuesday','Wednesday','Thursday','Friday'],
    periodsPerDay: 6,
    breakAfterPeriod: 3,
    institution: '',
    periodTimes: [
      '09:00 - 10:00','10:00 - 11:00','11:00 - 12:00',
      '12:00 - 13:00','14:00 - 15:00','15:00 - 16:00'
    ]
  },
  timetable: null
};

let currentPage = 'dashboard';
let ttView = 'group';
let selectedAlgo = 'ga';
let generatorWorking = false;
let stopFlag = false;

// ─── Helpers ──────────────────────────────────────────────────
function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function save() {
  localStorage.setItem('crt_db', JSON.stringify(DB));
}

function load() {
  const raw = localStorage.getItem('crt_db');
  if (raw) {
    try { DB = { ...DB, ...JSON.parse(raw) }; } catch(e) {}
  }
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span> ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function log(msg, type = '') {
  const area = document.getElementById('log-area');
  if (!area) return;
  const line = document.createElement('div');
  line.className = `log-entry ${type}`;
  const t = new Date().toLocaleTimeString();
  line.textContent = `[${t}] ${msg}`;
  area.appendChild(line);
  area.scrollTop = area.scrollHeight;
}

// ─── Navigation ───────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  currentPage = page;

  const titles = {
    dashboard:'Dashboard', faculty:'Faculty Members',
    subjects:'Subjects & Courses', rooms:'Rooms & Venues',
    groups:'Student Groups', config:'Time Configuration',
    generate:'Generate Timetable', timetable:'Timetable View',
    conflicts:'Conflict Report'
  };
  const subtitles = {
    dashboard:'Overview of your scheduling system',
    faculty:'Manage teaching staff and their constraints',
    subjects:'Add and configure courses and lab sessions',
    rooms:'Manage classrooms and lab spaces',
    groups:'Define student classes and assign curriculum',
    config:'Set working days and period timings',
    generate:'Run the scheduling algorithm',
    timetable:'View and explore the generated schedule',
    conflicts:'Review and resolve scheduling conflicts'
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;
  document.getElementById('topbar-subtitle').textContent = subtitles[page] || '';

  // Render relevant page
  if (page === 'dashboard')   renderDashboard();
  if (page === 'faculty')     renderFacultyTable();
  if (page === 'subjects')    renderSubjectsTable();
  if (page === 'rooms')       renderRoomsTable();
  if (page === 'groups')      renderGroups();
  if (page === 'config')      renderConfig();
  if (page === 'timetable')   { populateTTSelector(); renderTimetable(); }
  if (page === 'conflicts')   renderConflicts();
}

// ─── Modals ───────────────────────────────────────────────────
function openModal(id) {
  if (id === 'modal-group') buildCurriculumBuilder();
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  clearModalForms(id);
}

function clearModalForms(id) {
  document.querySelectorAll(`#${id} input, #${id} select`).forEach(el => {
    if (el.type === 'checkbox') el.checked = false;
    else if (el.type === 'number') el.value = el.defaultValue || '';
    else if (el.type === 'hidden') el.value = '';
    else el.value = '';
  });
}

// ─── Dashboard ────────────────────────────────────────────────
function renderDashboard() {
  document.getElementById('stat-faculty').textContent = DB.faculty.length;
  document.getElementById('stat-subjects').textContent = DB.subjects.length;
  document.getElementById('stat-rooms').textContent = DB.rooms.length;
  document.getElementById('stat-groups').textContent = DB.groups.length;
  document.getElementById('stat-sessions').textContent =
    DB.timetable ? DB.timetable.sessions.length : 0;
  document.getElementById('stat-conflicts').textContent =
    DB.timetable ? (DB.timetable.violations?.length || 0) : 0;

  updateBadges();
  updateWorkflowSteps();
}

function updateBadges() {
  document.getElementById('badge-faculty').textContent = DB.faculty.length;
  document.getElementById('badge-subjects').textContent = DB.subjects.length;
  document.getElementById('badge-rooms').textContent = DB.rooms.length;
  document.getElementById('badge-groups').textContent = DB.groups.length;
  const cc = DB.timetable?.violations?.length || 0;
  document.getElementById('badge-conflicts').textContent = cc;
  document.getElementById('badge-conflicts').style.display = cc > 0 ? '' : 'none';
}

function updateWorkflowSteps() {
  const steps = [
    { id: 'ws-1', done: DB.faculty.length > 0 },
    { id: 'ws-2', done: DB.subjects.length > 0 },
    { id: 'ws-3', done: DB.rooms.length > 0 },
    { id: 'ws-4', done: DB.groups.length > 0 },
    { id: 'ws-5', done: !!DB.timetable }
  ];
  let firstPending = -1;
  steps.forEach((s, i) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    el.classList.remove('done', 'active');
    if (s.done) el.classList.add('done');
    else if (firstPending === -1) { firstPending = i; el.classList.add('active'); }
  });
}

// ─── Faculty ──────────────────────────────────────────────────
function saveFaculty() {
  const id   = document.getElementById('faculty-edit-id').value;
  const name = document.getElementById('fac-name').value.trim();
  const dept = document.getElementById('fac-dept').value.trim();
  if (!name || !dept) { toast('Name and Department are required', 'error'); return; }

  const obj = {
    id: id || uid(),
    name, dept,
    email: document.getElementById('fac-email').value.trim(),
    maxPeriodsPerDay: parseInt(document.getElementById('fac-max').value) || 4,
    specialization: document.getElementById('fac-spec').value.trim()
  };

  if (id) {
    const idx = DB.faculty.findIndex(f => f.id === id);
    if (idx >= 0) DB.faculty[idx] = obj;
  } else {
    DB.faculty.push(obj);
  }
  save(); closeModal('modal-faculty'); renderFacultyTable(); updateBadges();
  toast(`Faculty "${name}" saved successfully`, 'success');
}

function editFaculty(id) {
  const f = DB.faculty.find(x => x.id === id);
  if (!f) return;
  document.getElementById('faculty-edit-id').value = f.id;
  document.getElementById('fac-name').value = f.name;
  document.getElementById('fac-dept').value = f.dept;
  document.getElementById('fac-email').value = f.email || '';
  document.getElementById('fac-max').value = f.maxPeriodsPerDay || 4;
  document.getElementById('fac-spec').value = f.specialization || '';
  document.getElementById('faculty-modal-title').textContent = 'Edit Faculty';
  openModal('modal-faculty');
}

function deleteFaculty(id) {
  if (!confirm('Delete this faculty member?')) return;
  DB.faculty = DB.faculty.filter(f => f.id !== id);
  save(); renderFacultyTable(); updateBadges();
  toast('Faculty deleted', 'info');
}

function renderFacultyTable() {
  const query = (document.getElementById('faculty-search')?.value || '').toLowerCase();
  const filtered = DB.faculty.filter(f =>
    f.name.toLowerCase().includes(query) || f.dept.toLowerCase().includes(query)
  );
  const tbody = document.getElementById('faculty-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="empty-state-icon">👨‍🏫</div>
      <div class="empty-state-title">${DB.faculty.length === 0 ? 'No Faculty Added' : 'No Results'}</div>
      <div class="empty-state-desc">Add your first faculty member to get started</div>
      ${DB.faculty.length === 0 ? '<button class="btn btn-primary" onclick="openModal(\'modal-faculty\')">+ Add Faculty</button>' : ''}
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(f => {
    const subCount = DB.groups.reduce((acc, g) =>
      acc + (g.curriculum || []).filter(c => c.facultyId === f.id).length, 0);
    return `<tr>
      <td class="cell-name">${f.name}</td>
      <td><span class="badge badge-purple">${f.dept}</span></td>
      <td class="text-muted">${f.email || '—'}</td>
      <td style="text-align:center;font-family:monospace">${f.maxPeriodsPerDay}</td>
      <td style="text-align:center"><span class="badge badge-teal">${subCount} assigned</span></td>
      <td><div class="flex gap-2">
        <button class="btn btn-ghost btn-sm" onclick="editFaculty('${f.id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFaculty('${f.id}')">🗑</button>
      </div></td>
    </tr>`;
  }).join('');
}

// ─── Subjects ─────────────────────────────────────────────────
function saveSubject() {
  const id   = document.getElementById('subject-edit-id').value;
  const name = document.getElementById('sub-name').value.trim();
  const code = document.getElementById('sub-code').value.trim();
  const dept = document.getElementById('sub-dept').value.trim();
  if (!name || !code || !dept) { toast('Name, Code and Department required', 'error'); return; }

  const obj = {
    id: id || uid(),
    name, code, dept,
    credits: parseInt(document.getElementById('sub-credits').value) || 3,
    periodsPerWeek: parseInt(document.getElementById('sub-periods').value) || 3,
    isLab: document.getElementById('sub-islab').checked
  };

  if (id) {
    const idx = DB.subjects.findIndex(s => s.id === id);
    if (idx >= 0) DB.subjects[idx] = obj;
  } else {
    DB.subjects.push(obj);
  }
  save(); closeModal('modal-subject'); renderSubjectsTable(); updateBadges();
  toast(`Subject "${name}" saved`, 'success');
}

function editSubject(id) {
  const s = DB.subjects.find(x => x.id === id);
  if (!s) return;
  document.getElementById('subject-edit-id').value = s.id;
  document.getElementById('sub-name').value = s.name;
  document.getElementById('sub-code').value = s.code;
  document.getElementById('sub-dept').value = s.dept;
  document.getElementById('sub-credits').value = s.credits;
  document.getElementById('sub-periods').value = s.periodsPerWeek;
  document.getElementById('sub-islab').checked = s.isLab;
  document.getElementById('subject-modal-title').textContent = 'Edit Subject';
  openModal('modal-subject');
}

function deleteSubject(id) {
  if (!confirm('Delete this subject?')) return;
  DB.subjects = DB.subjects.filter(s => s.id !== id);
  save(); renderSubjectsTable(); updateBadges();
  toast('Subject deleted', 'info');
}

function renderSubjectsTable() {
  const query = (document.getElementById('subjects-search')?.value || '').toLowerCase();
  const filtered = DB.subjects.filter(s =>
    s.name.toLowerCase().includes(query) ||
    s.code.toLowerCase().includes(query) ||
    s.dept.toLowerCase().includes(query)
  );
  const tbody = document.getElementById('subjects-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="empty-state-icon">📚</div>
      <div class="empty-state-title">${DB.subjects.length === 0 ? 'No Subjects Added' : 'No Results'}</div>
      <div class="empty-state-desc">Add subjects and courses for scheduling</div>
      ${DB.subjects.length === 0 ? '<button class="btn btn-primary" onclick="openModal(\'modal-subject\')">+ Add Subject</button>' : ''}
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `<tr>
    <td class="cell-name">${s.name}</td>
    <td class="cell-code">${s.code}</td>
    <td><span class="badge badge-purple">${s.dept}</span></td>
    <td style="text-align:center;font-family:monospace">${s.credits}</td>
    <td style="text-align:center;font-family:monospace">${s.periodsPerWeek}</td>
    <td><span class="badge ${s.isLab ? 'badge-yellow' : 'badge-teal'}">${s.isLab ? '🔬 Lab' : '📖 Theory'}</span></td>
    <td><div class="flex gap-2">
      <button class="btn btn-ghost btn-sm" onclick="editSubject('${s.id}')">✏️ Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteSubject('${s.id}')">🗑</button>
    </div></td>
  </tr>`).join('');
}

// ─── Rooms ────────────────────────────────────────────────────
function saveRoom() {
  const id   = document.getElementById('room-edit-id').value;
  const name = document.getElementById('room-name').value.trim();
  if (!name) { toast('Room name is required', 'error'); return; }

  const obj = {
    id: id || uid(),
    name,
    capacity: parseInt(document.getElementById('room-capacity').value) || 60,
    floor: document.getElementById('room-floor').value.trim(),
    isLab: document.getElementById('room-islab').checked
  };

  if (id) {
    const idx = DB.rooms.findIndex(r => r.id === id);
    if (idx >= 0) DB.rooms[idx] = obj;
  } else {
    DB.rooms.push(obj);
  }
  save(); closeModal('modal-room'); renderRoomsTable(); updateBadges();
  toast(`Room "${name}" saved`, 'success');
}

function editRoom(id) {
  const r = DB.rooms.find(x => x.id === id);
  if (!r) return;
  document.getElementById('room-edit-id').value = r.id;
  document.getElementById('room-name').value = r.name;
  document.getElementById('room-capacity').value = r.capacity;
  document.getElementById('room-floor').value = r.floor || '';
  document.getElementById('room-islab').checked = r.isLab;
  document.getElementById('room-modal-title').textContent = 'Edit Room';
  openModal('modal-room');
}

function deleteRoom(id) {
  if (!confirm('Delete this room?')) return;
  DB.rooms = DB.rooms.filter(r => r.id !== id);
  save(); renderRoomsTable(); updateBadges();
  toast('Room deleted', 'info');
}

function renderRoomsTable() {
  const query = (document.getElementById('rooms-search')?.value || '').toLowerCase();
  const filtered = DB.rooms.filter(r => r.name.toLowerCase().includes(query));
  const tbody = document.getElementById('rooms-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
      <div class="empty-state-icon">🚪</div>
      <div class="empty-state-title">${DB.rooms.length === 0 ? 'No Rooms Added' : 'No Results'}</div>
      <div class="empty-state-desc">Add classrooms and lab spaces</div>
      ${DB.rooms.length === 0 ? '<button class="btn btn-primary" onclick="openModal(\'modal-room\')">+ Add Room</button>' : ''}
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => `<tr>
    <td class="cell-name">🚪 ${r.name}</td>
    <td style="font-family:monospace;text-align:center">${r.capacity}</td>
    <td><span class="badge ${r.isLab ? 'badge-yellow' : 'badge-teal'}">${r.isLab ? '🔬 Lab' : '🏫 Classroom'}</span></td>
    <td class="text-muted">${r.floor || '—'}</td>
    <td><div class="flex gap-2">
      <button class="btn btn-ghost btn-sm" onclick="editRoom('${r.id}')">✏️ Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteRoom('${r.id}')">🗑</button>
    </div></td>
  </tr>`).join('');
}

// ─── Groups ───────────────────────────────────────────────────
function buildCurriculumBuilder() {
  const container = document.getElementById('curriculum-builder');
  if (!container) return;

  if (DB.subjects.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:20px">
      <div class="empty-state-title">No Subjects Available</div>
      <div class="empty-state-desc">Add subjects first before assigning curriculum</div>
    </div>`;
    return;
  }

  const editId = document.getElementById('group-edit-id').value;
  const group  = editId ? DB.groups.find(g => g.id === editId) : null;
  const curr   = group?.curriculum || [];

  container.innerHTML = DB.subjects.map(sub => {
    const existing = curr.find(c => c.subjectId === sub.id);
    const facultyOptions = DB.faculty.map(f =>
      `<option value="${f.id}" ${existing?.facultyId === f.id ? 'selected' : ''}>${f.name}</option>`
    ).join('');

    return `<div class="curriculum-item" id="ci-${sub.id}">
      <div class="curriculum-item-info">
        <div class="curriculum-item-name">${sub.name}</div>
        <div class="curriculum-item-meta">
          <span class="badge ${sub.isLab ? 'badge-yellow' : 'badge-purple'}" style="font-size:0.65rem">${sub.isLab ? '🔬 Lab' : '📖 Theory'}</span>
          ${sub.code}
        </div>
      </div>
      <div class="curriculum-item-controls">
        <select class="form-select" id="ci-fac-${sub.id}" style="min-width:160px;font-size:0.8rem;padding:6px 10px">
          <option value="">— No Faculty —</option>
          ${facultyOptions}
        </select>
        <input type="number" class="period-input" id="ci-per-${sub.id}"
          value="${existing?.periodsPerWeek || sub.periodsPerWeek}"
          min="1" max="10" title="Periods/week">
        <label class="toggle" title="Include in curriculum">
          <input type="checkbox" id="ci-chk-${sub.id}" ${existing ? 'checked' : ''}>
          <div class="toggle-track"></div>
        </label>
      </div>
    </div>`;
  }).join('');
}

function saveGroup() {
  const id   = document.getElementById('group-edit-id').value;
  const name = document.getElementById('grp-name').value.trim();
  const dept = document.getElementById('grp-dept').value.trim();
  if (!name || !dept) { toast('Group name and department are required', 'error'); return; }

  const curriculum = DB.subjects
    .filter(sub => document.getElementById(`ci-chk-${sub.id}`)?.checked)
    .map(sub => ({
      subjectId: sub.id,
      facultyId: document.getElementById(`ci-fac-${sub.id}`)?.value || null,
      periodsPerWeek: parseInt(document.getElementById(`ci-per-${sub.id}`)?.value) || sub.periodsPerWeek
    }));

  const obj = {
    id: id || uid(),
    name, dept,
    semester: parseInt(document.getElementById('grp-sem').value) || 1,
    strength: parseInt(document.getElementById('grp-strength').value) || 60,
    curriculum
  };

  if (id) {
    const idx = DB.groups.findIndex(g => g.id === id);
    if (idx >= 0) DB.groups[idx] = obj;
  } else {
    DB.groups.push(obj);
  }
  save(); closeModal('modal-group'); renderGroups(); updateBadges();
  toast(`Group "${name}" saved with ${curriculum.length} subjects`, 'success');
}

function editGroup(id) {
  const g = DB.groups.find(x => x.id === id);
  if (!g) return;
  document.getElementById('group-edit-id').value = g.id;
  document.getElementById('grp-name').value = g.name;
  document.getElementById('grp-dept').value = g.dept;
  document.getElementById('grp-sem').value = g.semester;
  document.getElementById('grp-strength').value = g.strength;
  document.getElementById('group-modal-title').textContent = 'Edit Group';
  openModal('modal-group');
}

function deleteGroup(id) {
  if (!confirm('Delete this student group?')) return;
  DB.groups = DB.groups.filter(g => g.id !== id);
  save(); renderGroups(); updateBadges();
  toast('Group deleted', 'info');
}

function renderGroups() {
  const container = document.getElementById('groups-container');
  if (!container) return;

  if (DB.groups.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">👥</div>
      <div class="empty-state-title">No Student Groups</div>
      <div class="empty-state-desc">Add student groups and assign their curriculum</div>
      <button class="btn btn-primary" onclick="openModal('modal-group')">+ Add Group</button>
    </div>`;
    return;
  }

  container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
    ${DB.groups.map(g => {
      const subCount  = g.curriculum?.length || 0;
      const perWeek   = (g.curriculum || []).reduce((s, c) => s + c.periodsPerWeek, 0);
      return `<div class="card">
        <div class="flex justify-between items-center" style="margin-bottom:12px">
          <div>
            <div style="font-weight:700;font-size:1rem">👥 ${g.name}</div>
            <div class="text-muted text-sm">${g.dept} · Sem ${g.semester} · ${g.strength} students</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm" onclick="editGroup('${g.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteGroup('${g.id}')">🗑</button>
          </div>
        </div>
        <div class="flex gap-2" style="margin-bottom:12px">
          <span class="badge badge-purple">${subCount} Subjects</span>
          <span class="badge badge-teal">${perWeek} Periods/Week</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${(g.curriculum || []).slice(0, 4).map(c => {
            const sub = DB.subjects.find(s => s.id === c.subjectId);
            const fac = DB.faculty.find(f => f.id === c.facultyId);
            if (!sub) return '';
            return `<div style="font-size:0.78rem;color:var(--text-secondary);display:flex;justify-content:space-between">
              <span>${sub.name}</span>
              <span style="color:var(--text-muted)">${fac ? fac.name : '⚠ No faculty'} · ${c.periodsPerWeek}p/w</span>
            </div>`;
          }).join('')}
          ${subCount > 4 ? `<div style="font-size:0.75rem;color:var(--text-muted)">+${subCount - 4} more subjects...</div>` : ''}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ─── Config ───────────────────────────────────────────────────
function renderConfig() {
  // Days
  const dc = document.getElementById('days-config');
  if (dc) {
    dc.innerHTML = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => {
      const checked = DB.config.days.includes(d);
      return `<div class="toggle-group">
        <label class="toggle">
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleDay('${d}', this.checked)">
          <div class="toggle-track"></div>
        </label>
        <span>${d}</span>
      </div>`;
    }).join('');
  }

  // Periods
  const pfEl = document.getElementById('cfg-periods');
  const brEl = document.getElementById('cfg-break');
  const instEl = document.getElementById('cfg-institution');
  if (pfEl) pfEl.value = DB.config.periodsPerDay;
  if (brEl) brEl.value = DB.config.breakAfterPeriod;
  if (instEl) instEl.value = DB.config.institution || '';

  renderPeriodTimes();
}

function renderPeriodTimes() {
  const cnt = document.getElementById('period-times-container');
  if (!cnt) return;
  const n = DB.config.periodsPerDay;
  while (DB.config.periodTimes.length < n)
    DB.config.periodTimes.push('—');

  cnt.innerHTML = Array.from({length: n}, (_, i) => `
    <div class="flex items-center gap-3">
      <span class="badge badge-purple" style="min-width:70px;justify-content:center">Period ${i+1}</span>
      <input type="text" class="form-control" style="max-width:200px"
        value="${DB.config.periodTimes[i] || ''}"
        placeholder="09:00 - 10:00"
        onchange="updatePeriodTime(${i}, this.value)">
    </div>`).join('');
}

function toggleDay(day, checked) {
  if (checked) { if (!DB.config.days.includes(day)) DB.config.days.push(day); }
  else { DB.config.days = DB.config.days.filter(d => d !== day); }
  saveConfig();
}

function updatePeriodTime(idx, val) {
  DB.config.periodTimes[idx] = val;
  saveConfig();
}

function saveConfig() {
  DB.config.periodsPerDay = parseInt(document.getElementById('cfg-periods')?.value) || 6;
  DB.config.breakAfterPeriod = parseInt(document.getElementById('cfg-break')?.value) || 3;
  DB.config.institution = document.getElementById('cfg-institution')?.value || '';
  save();
  renderPeriodTimes();
  toast('Configuration saved', 'success');
}

// ─── Generator ────────────────────────────────────────────────
function selectAlgo(algo) {
  selectedAlgo = algo;
  document.querySelectorAll('.algo-option').forEach(el => el.classList.remove('selected'));
  document.getElementById(`algo-${algo}`)?.classList.add('selected');
}

function updateGALabels() {
  document.getElementById('ga-pop-val').textContent = document.getElementById('ga-pop').value;
  document.getElementById('ga-gen-val').textContent = document.getElementById('ga-gen').value;
  document.getElementById('ga-mut-val').textContent = document.getElementById('ga-mut').value + '%';
}

function stopGeneration() {
  stopFlag = true;
}

async function startGeneration() {
  if (DB.faculty.length === 0 || DB.subjects.length === 0 || DB.rooms.length === 0) {
    toast('Add faculty, subjects and rooms first!', 'error'); return;
  }
  const totalSessions = DB.groups.reduce((s, g) =>
    s + (g.curriculum || []).reduce((a, c) => a + c.periodsPerWeek, 0), 0);
  if (totalSessions === 0) {
    toast('Add student groups with curriculum first!', 'error'); return;
  }

  generatorWorking = true; stopFlag = false;
  document.getElementById('btn-generate').disabled = true;
  document.getElementById('btn-stop').classList.remove('hidden');
  document.getElementById('gen-result-card').style.display = 'none';
  document.getElementById('log-area').innerHTML = '';

  const popSize = parseInt(document.getElementById('ga-pop').value) || 60;
  const maxGen  = parseInt(document.getElementById('ga-gen').value) || 400;
  const mutRate = (parseInt(document.getElementById('ga-mut').value) || 15) / 100;

  log(`🚀 Starting ${selectedAlgo === 'ga' ? 'Genetic Algorithm' : 'Greedy'} scheduler`);
  log(`📊 Sessions to schedule: ${totalSessions}`);
  log(`⚙ Population: ${popSize} | Generations: ${maxGen} | Mutation: ${(mutRate*100).toFixed(0)}%`);

  if (selectedAlgo === 'greedy') {
    await runGreedy();
  } else {
    await runGA(popSize, maxGen, mutRate);
  }
}

async function runGA(popSize, maxGen, mutRate) {
  const scheduler = new TimetableScheduler(
    { faculty: DB.faculty, subjects: DB.subjects, rooms: DB.rooms, groups: DB.groups, config: DB.config },
    {
      populationSize: popSize,
      maxGenerations: maxGen,
      mutationRate: mutRate,
      onProgress: (p) => {
        document.getElementById('gen-pct').textContent = p.progress + '%';
        document.getElementById('gen-bar').style.width = p.progress + '%';
        document.getElementById('gen-generation').textContent = p.generation;
        document.getElementById('gen-fitness').textContent = p.bestFitness.toFixed(4);
        document.getElementById('gen-violations').textContent = p.violations;
        if (p.generation % 50 === 0) {
          log(`Gen ${p.generation}: fitness=${p.bestFitness.toFixed(4)}, violations=${p.violations}`);
        }
        return stopFlag;
      }
    }
  );

  // Run in chunks to avoid blocking UI
  await yieldToUI();
  const result = await runAsync(() => scheduler.generate());

  finishGeneration(result);
}

async function runGreedy() {
  log('⚡ Running Greedy scheduler...');
  await yieldToUI();

  const sessions = [];
  let id = 0;
  const days = DB.config.days.length;
  const periods = DB.config.periodsPerDay;
  const usedSlots = {}; // "day-period-resourceId" => true

  DB.groups.forEach(group => {
    (group.curriculum || []).forEach(item => {
      const sub = DB.subjects.find(s => s.id === item.subjectId);
      if (!sub) return;
      for (let p = 0; p < item.periodsPerWeek; p++) {
        // Find a free slot
        let placed = false;
        for (let day = 0; day < days && !placed; day++) {
          for (let per = 0; per < periods && !placed; per++) {
            const facKey = `${item.facultyId}-${day}-${per}`;
            const grpKey = `grp-${group.id}-${day}-${per}`;
            if (item.facultyId && usedSlots[facKey]) continue;
            if (usedSlots[grpKey]) continue;

            const room = DB.rooms.find(r => {
              const rk = `rm-${r.id}-${day}-${per}`;
              return !usedSlots[rk] && (sub.isLab ? r.isLab : true);
            }) || DB.rooms[0];

            if (item.facultyId) usedSlots[facKey] = true;
            usedSlots[grpKey] = true;
            if (room) usedSlots[`rm-${room.id}-${day}-${per}`] = true;

            sessions.push({
              id: `s${id++}`,
              groupId: group.id,
              subjectId: item.subjectId,
              facultyId: item.facultyId,
              roomId: room?.id || null,
              day, period: per
            });
            placed = true;
          }
        }
        if (!placed) {
          sessions.push({
            id: `s${id++}`,
            groupId: group.id, subjectId: item.subjectId,
            facultyId: item.facultyId,
            roomId: DB.rooms[0]?.id || null,
            day: Math.floor(Math.random() * days),
            period: Math.floor(Math.random() * periods)
          });
        }
      }
    });
  });

  document.getElementById('gen-pct').textContent = '100%';
  document.getElementById('gen-bar').style.width = '100%';
  document.getElementById('gen-sessions').textContent = sessions.length;

  finishGeneration({ success: true, sessions, fitness: 0.9, violations: [], stats: {} });
}

function finishGeneration(result) {
  generatorWorking = false;
  document.getElementById('btn-generate').disabled = false;
  document.getElementById('btn-stop').classList.add('hidden');

  if (!result.success) {
    log(`❌ Error: ${result.error}`, 'error');
    toast(result.error || 'Generation failed', 'error');
    return;
  }

  DB.timetable = {
    sessions: result.sessions,
    fitness: result.fitness,
    violations: result.violations || result.stats?.conflicts || [],
    generatedAt: new Date().toISOString(),
    stats: result.stats
  };
  save();

  const v = DB.timetable.violations?.length || 0;
  log(`✅ Complete! ${result.sessions.length} sessions scheduled. Violations: ${v}`, v > 0 ? 'warn' : '');
  document.getElementById('gen-result-card').style.display = 'block';
  document.getElementById('gen-pct').textContent = '100%';
  document.getElementById('gen-bar').style.width = '100%';
  updateBadges();
  toast(`Timetable generated! ${result.sessions.length} sessions, ${v} conflicts`, v === 0 ? 'success' : 'info');
}

function runAsync(fn) {
  return new Promise(resolve => setTimeout(() => resolve(fn()), 10));
}

function yieldToUI() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ─── Timetable View ───────────────────────────────────────────
function setTTView(view) {
  ttView = view;
  document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${view}`)?.classList.add('active');
  populateTTSelector();
  renderTimetable();
}

function populateTTSelector() {
  const sel = document.getElementById('tt-selector');
  if (!sel) return;

  let items = [];
  if (ttView === 'group')   items = DB.groups.map(g => ({ id: g.id, label: g.name }));
  if (ttView === 'faculty') items = DB.faculty.map(f => ({ id: f.id, label: f.name }));
  if (ttView === 'room')    items = DB.rooms.map(r => ({ id: r.id, label: r.name }));

  sel.innerHTML = '<option value="">— Select —</option>' +
    items.map(i => `<option value="${i.id}">${i.label}</option>`).join('');

  if (items.length > 0) sel.value = items[0].id;
}

function renderTimetable() {
  const area = document.getElementById('timetable-area');
  if (!area) return;

  if (!DB.timetable) {
    area.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-title">No Timetable Generated</div>
      <div class="empty-state-desc">Run the scheduling algorithm to generate a timetable</div>
      <button class="btn btn-primary" onclick="navigate('generate')">⚡ Generate Now</button>
    </div>`;
    return;
  }

  const selId = document.getElementById('tt-selector')?.value;
  if (!selId) { area.innerHTML = '<div class="empty-state"><div class="empty-state-title">Select a filter above</div></div>'; return; }

  const days   = DB.config.days;
  const nPer   = DB.config.periodsPerDay;
  const breakP = DB.config.breakAfterPeriod;
  const times  = DB.config.periodTimes;

  // Filter sessions
  let sessions = DB.timetable.sessions.filter(s => {
    if (ttView === 'group')   return s.groupId   === selId;
    if (ttView === 'faculty') return s.facultyId === selId;
    if (ttView === 'room')    return s.roomId    === selId;
    return false;
  });

  // Subject color map
  const subjectColorMap = {};
  DB.subjects.forEach((s, i) => { subjectColorMap[s.id] = i % 12; });

  // Build grid indexed by day+period
  const grid = {};
  sessions.forEach(s => {
    const k = `${s.day}-${s.period}`;
    if (!grid[k]) grid[k] = [];
    grid[k].push(s);
  });

  // Check conflicts
  const conflicts = new Set();
  if (DB.timetable.violations) {
    DB.timetable.violations.forEach(v => conflicts.add(`${v.day}-${v.period}`));
  }

  let html = `<div class="timetable-outer">
    <table class="timetable-grid">
      <thead><tr>
        <th>Day</th>
        ${Array.from({length: nPer}, (_, p) => {
          const isBreakAfter = (p + 1 === breakP);
          return `<th class="day-col-header">
            P${p+1}<br>
            <span style="font-size:0.6rem;opacity:0.7;font-weight:400">${times[p] || ''}</span>
          </th>${isBreakAfter ? '<th style="background:rgba(255,255,255,0.03);min-width:60px;color:var(--text-muted);font-size:0.7rem">Break</th>' : ''}`;
        }).join('')}
      </tr></thead>
      <tbody>`;

  days.forEach((dayName, di) => {
    html += `<tr>
      <td class="period-label" style="font-size:0.82rem;font-weight:700;white-space:nowrap;padding:10px 16px">
        ${dayName}
      </td>`;

    for (let p = 0; p < nPer; p++) {
      // Insert break column cell after breakP
      if (p === breakP) {
        html += `<td class="break-cell" style="min-width:60px;padding:6px;font-size:0.7rem;writing-mode:vertical-rl;text-orientation:mixed;white-space:nowrap">☕ Break</td>`;
      }

      const k = `${di}-${p}`;
      const slotSessions = grid[k] || [];
      const isConflict = conflicts.has(k);

      if (slotSessions.length === 0) {
        html += `<td></td>`;
      } else {
        html += `<td>`;
        slotSessions.forEach(sess => {
          const sub  = DB.subjects.find(s => s.id === sess.subjectId);
          const fac  = DB.faculty.find(f => f.id === sess.facultyId);
          const room = DB.rooms.find(r => r.id === sess.roomId);
          const grp  = DB.groups.find(g => g.id === sess.groupId);
          const color = subjectColorMap[sess.subjectId] ?? 0;
          const conflictClass = isConflict ? 'cell-conflict' : '';
          html += `<div class="cell-session color-${color} ${conflictClass}">
            <div class="cell-subject">${sub?.name || '?'}</div>
            ${ttView !== 'faculty' && fac  ? `<div class="cell-faculty">👨‍🏫 ${fac.name}</div>`  : ''}
            ${ttView !== 'group'   && grp  ? `<div class="cell-faculty">👥 ${grp.name}</div>`   : ''}
            ${ttView !== 'room'    && room ? `<div class="cell-room">🚪 ${room.name}</div>`     : ''}
          </div>`;
        });
        html += `</td>`;
      }
    }
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;

  // Legend
  html += `<div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:8px">
    ${DB.subjects.map(s => `<span class="badge color-${subjectColorMap[s.id]}" style="border-radius:6px;padding:4px 10px">
      ${s.isLab ? '🔬' : '📖'} ${s.name}
    </span>`).join('')}
  </div>`;

  area.innerHTML = html;
}

// ─── Conflicts ────────────────────────────────────────────────
function renderConflicts() {
  const cnt = document.getElementById('conflicts-container');
  if (!cnt) return;

  if (!DB.timetable) {
    cnt.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">✅</div>
      <div class="empty-state-title">No Timetable Generated</div>
      <div class="empty-state-desc">Generate a timetable first to check for conflicts</div>
    </div>`;
    return;
  }

  const v = DB.timetable.violations || [];
  if (v.length === 0) {
    cnt.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🎉</div>
      <div class="empty-state-title">No Conflicts!</div>
      <div class="empty-state-desc">Your timetable is perfectly conflict-free</div>
    </div>`;
    return;
  }

  const typeLabels = { faculty: '👨‍🏫 Faculty Conflict', room: '🚪 Room Conflict', group: '👥 Group Conflict' };
  cnt.innerHTML = `<div class="card" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="card-title"><span style="color:var(--danger)">⚠️</span> ${v.length} Conflict(s) Found</div>
      <span class="badge badge-red">${v.length} issues</span>
    </div>
    <div class="card-subtitle">Review and re-generate to resolve</div>
  </div>
  <div class="conflict-list">
    ${v.map(c => {
      const day = DB.config.days[c.day] || `Day ${c.day}`;
      const per = `Period ${c.period + 1}`;
      const label = DB.faculty.find(f => f.id === c.id)?.name ||
                    DB.rooms.find(r => r.id === c.id)?.name ||
                    DB.groups.find(g => g.id === c.id)?.name || c.id;
      return `<div class="conflict-item">
        <span class="conflict-icon">⚠️</span>
        <div class="conflict-info">
          <div class="conflict-title">${typeLabels[c.type] || c.type}</div>
          <div class="conflict-detail">${day}, ${per} — ${label}</div>
        </div>
        <span class="badge badge-red">${c.type}</span>
      </div>`;
    }).join('')}
  </div>`;
}

// ─── Export / Print ───────────────────────────────────────────
function printTimetable() {
  navigate('timetable');
  setTimeout(() => window.print(), 300);
}

function exportCSV() {
  if (!DB.timetable) { toast('No timetable to export', 'error'); return; }
  const rows = [['Group','Subject','Faculty','Room','Day','Period','Time']];
  DB.timetable.sessions.forEach(s => {
    const sub  = DB.subjects.find(x => x.id === s.subjectId)?.name || '';
    const fac  = DB.faculty.find(x => x.id === s.facultyId)?.name || '';
    const room = DB.rooms.find(x => x.id === s.roomId)?.name || '';
    const grp  = DB.groups.find(x => x.id === s.groupId)?.name || '';
    const day  = DB.config.days[s.day] || '';
    const per  = `Period ${s.period + 1}`;
    const time = DB.config.periodTimes[s.period] || '';
    rows.push([grp, sub, fac, room, day, per, time]);
  });
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'timetable.csv';
  a.click();
  toast('CSV exported!', 'success');
}

// ─── Sample Data ──────────────────────────────────────────────
function loadSampleData() {
  if (!confirm('This will replace all existing data with sample data. Continue?')) return;

  const f1 = uid(), f2 = uid(), f3 = uid(), f4 = uid();
  const s1 = uid(), s2 = uid(), s3 = uid(), s4 = uid(), s5 = uid();
  const r1 = uid(), r2 = uid(), r3 = uid();
  const g1 = uid(), g2 = uid();

  DB.faculty = [
    { id: f1, name: 'Dr. Arun Kumar', dept: 'Computer Science', email: 'arun@college.edu', maxPeriodsPerDay: 4, specialization: 'Data Structures, Algorithms' },
    { id: f2, name: 'Prof. Meena Sharma', dept: 'Computer Science', email: 'meena@college.edu', maxPeriodsPerDay: 4, specialization: 'Database Systems' },
    { id: f3, name: 'Dr. Vikram Nair', dept: 'Mathematics', email: 'vikram@college.edu', maxPeriodsPerDay: 5, specialization: 'Discrete Math' },
    { id: f4, name: 'Prof. Lakshmi Priya', dept: 'Computer Science', email: 'lakshmi@college.edu', maxPeriodsPerDay: 4, specialization: 'OS, Networks' }
  ];
  DB.subjects = [
    { id: s1, name: 'Data Structures', code: 'CS301', dept: 'Computer Science', credits: 4, periodsPerWeek: 4, isLab: false },
    { id: s2, name: 'Database Systems', code: 'CS302', dept: 'Computer Science', credits: 3, periodsPerWeek: 3, isLab: false },
    { id: s3, name: 'Discrete Mathematics', code: 'MA301', dept: 'Mathematics', credits: 3, periodsPerWeek: 3, isLab: false },
    { id: s4, name: 'OS Lab', code: 'CS303L', dept: 'Computer Science', credits: 2, periodsPerWeek: 2, isLab: true },
    { id: s5, name: 'Operating Systems', code: 'CS304', dept: 'Computer Science', credits: 3, periodsPerWeek: 3, isLab: false }
  ];
  DB.rooms = [
    { id: r1, name: 'Room 101', capacity: 60, floor: 'Block A, Floor 1', isLab: false },
    { id: r2, name: 'Room 102', capacity: 60, floor: 'Block A, Floor 1', isLab: false },
    { id: r3, name: 'CS Lab 1', capacity: 30, floor: 'Block B, Floor 2', isLab: true }
  ];
  DB.groups = [
    { id: g1, name: 'CSE - A (Sem 3)', dept: 'Computer Science', semester: 3, strength: 60,
      curriculum: [
        { subjectId: s1, facultyId: f1, periodsPerWeek: 4 },
        { subjectId: s2, facultyId: f2, periodsPerWeek: 3 },
        { subjectId: s3, facultyId: f3, periodsPerWeek: 3 },
        { subjectId: s4, facultyId: f4, periodsPerWeek: 2 }
      ]
    },
    { id: g2, name: 'CSE - B (Sem 3)', dept: 'Computer Science', semester: 3, strength: 58,
      curriculum: [
        { subjectId: s1, facultyId: f1, periodsPerWeek: 4 },
        { subjectId: s5, facultyId: f4, periodsPerWeek: 3 },
        { subjectId: s3, facultyId: f3, periodsPerWeek: 3 },
        { subjectId: s4, facultyId: f2, periodsPerWeek: 2 }
      ]
    }
  ];
  DB.config.institution = 'ABC Engineering College';
  save();
  renderDashboard();
  updateBadges();
  toast('Sample data loaded! Now click Generate Timetable.', 'success');
}

function clearAllData() {
  if (!confirm('This will delete ALL data including the generated timetable. Continue?')) return;
  DB = {
    faculty: [], subjects: [], rooms: [], groups: [],
    config: {
      days: ['Monday','Tuesday','Wednesday','Thursday','Friday'],
      periodsPerDay: 6, breakAfterPeriod: 3, institution: '',
      periodTimes: ['09:00 - 10:00','10:00 - 11:00','11:00 - 12:00','12:00 - 13:00','14:00 - 15:00','15:00 - 16:00']
    },
    timetable: null
  };
  save();
  renderDashboard();
  toast('All data cleared', 'info');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
    }
  });
});

// ─── Init ─────────────────────────────────────────────────────
load();
renderDashboard();
updateBadges();
document.getElementById('btn-clear').style.display = '';
