/* ============ STORAGE ============ */
const DB_KEY = 'meridian_hms_data_v1';

function loadDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(raw){
    try{ return JSON.parse(raw); }catch(e){ /* fall through to seed */ }
  }
  return seedData();
}

function saveDB(){
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function seedData(){
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0,10);
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate()+n); return fmt(d); };

  return {
    patients: [
      { id:'PT-1001', name:'Ravi Kulkarni', age:54, gender:'Male', blood:'B+', condition:'Hypertension follow-up', contact:'9822011234', status:'Outpatient', admitted: addDays(-3) },
      { id:'PT-1002', name:'Meera Iyer', age:29, gender:'Female', blood:'O+', condition:'Post-surgical recovery', contact:'9822022345', status:'Admitted', admitted: addDays(-1) },
      { id:'PT-1003', name:'Arjun Deshmukh', age:8, gender:'Male', blood:'A+', condition:'Fever & viral infection', contact:'9822033456', status:'Discharged', admitted: addDays(-6) }
    ],
    doctors: [
      { id:'DR-501', name:'Dr. Sunita Rao', specialty:'Cardiology', experience:14, days:'Mon, Wed, Fri', contact:'9900011111' },
      { id:'DR-502', name:'Dr. Farhan Shaikh', specialty:'Pediatrics', experience:9, days:'Tue, Thu, Sat', contact:'9900022222' },
      { id:'DR-503', name:'Dr. Neha Kapoor', specialty:'Orthopedics', experience:11, days:'Mon–Fri', contact:'9900033333' }
    ],
    appointments: [
      { id:'AP-9001', patientId:'PT-1001', doctorId:'DR-501', date: addDays(0), time:'10:30', reason:'Blood pressure check', status:'Confirmed' },
      { id:'AP-9002', patientId:'PT-1002', doctorId:'DR-503', date: addDays(0), time:'14:00', reason:'Post-op review', status:'Pending' },
      { id:'AP-9003', patientId:'PT-1003', doctorId:'DR-502', date: addDays(2), time:'09:15', reason:'General checkup', status:'Pending' }
    ],
    bills: [
      { id:'INV-3001', patientId:'PT-1001', service:'Consultation', amount:80, date: addDays(-3), status:'Paid' },
      { id:'INV-3002', patientId:'PT-1002', service:'Surgery & ward stay', amount:2400, date: addDays(-1), status:'Unpaid' }
    ],
    counters:{ patient:1004, doctor:504, appointment:9004, bill:3003 }
  };
}

let db = loadDB();

/* ============ HELPERS ============ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function nextId(prefix, kind){
  const n = db.counters[kind]++;
  saveDB();
  return `${prefix}-${n}`;
}

function findPatient(id){ return db.patients.find(p => p.id === id); }
function findDoctor(id){ return db.doctors.find(d => d.id === id); }

function fmtDate(iso){
  if(!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
}

function fmtTime(t){
  if(!t) return '';
  const [h,m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2,'0')} ${period}`;
}

function toast(msg){
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function statusBadgeClass(status){
  const map = {
    'Confirmed':'badge-teal', 'Completed':'badge-sage', 'Pending':'badge-amber', 'Cancelled':'badge-red',
    'Admitted':'badge-teal', 'Outpatient':'badge-amber', 'Discharged':'badge-slate',
    'Paid':'badge-sage', 'Unpaid':'badge-amber', 'Overdue':'badge-red'
  };
  return map[status] || 'badge-slate';
}

/* ============ LOGIN ============ */
$('#loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#loginName').value.trim();
  const role = $('#loginRole').value;
  if(!name) return;
  sessionStorage.setItem('meridian_user', JSON.stringify({ name, role }));
  enterApp(name, role);
});

function enterApp(name, role){
  $('#loginScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#userName').textContent = name;
  $('#userRole').textContent = role;
  $('#userInitial').textContent = name.trim()[0]?.toUpperCase() || '?';
  renderAll();
}

$('#logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('meridian_user');
  $('#app').classList.add('hidden');
  $('#loginScreen').classList.remove('hidden');
  $('#loginForm').reset();
});

/* auto-login if session exists */
(function initSession(){
  const raw = sessionStorage.getItem('meridian_user');
  if(raw){
    const { name, role } = JSON.parse(raw);
    enterApp(name, role);
  }
})();

/* ============ NAVIGATION ============ */
$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    // colorful "touched" pulse feedback on the tapped item
    btn.classList.remove('touched');
    void btn.offsetWidth; // restart animation if tapped again quickly
    btn.classList.add('touched');
    setTimeout(() => btn.classList.remove('touched'), 500);

    // bring the tapped nav item into view (matters on the mobile horizontal nav)
    btn.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });

    $$('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const view = btn.dataset.view;
    $$('.view').forEach(v => v.classList.remove('active'));
    const target = $(`#view-${view}`);
    target.classList.add('active');

    // jump straight to that section's name/heading
    const heading = target.querySelector('.page-header');
    if(heading){
      heading.scrollIntoView({ behavior:'smooth', block:'start' });
    } else {
      window.scrollTo({ top:0, behavior:'smooth' });
    }
  });
});

/* ============ MODALS ============ */
$$('[data-open-modal]').forEach(btn => {
  btn.addEventListener('click', () => openModal(btn.dataset.openModal));
});
$$('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay')));
});
$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(overlay); });
});

function openModal(id, mode='add'){
  const overlay = document.getElementById(id);
  overlay.classList.add('open');
  if(id === 'appointmentModal') populateApptSelects();
  if(id === 'billModal') populateBillSelects();
}
function closeModal(overlay){
  overlay.classList.remove('open');
  overlay.querySelector('form')?.reset();
  overlay.querySelector('input[type=hidden]').value = '';
  resetModalTitles(overlay);
}
function resetModalTitles(overlay){
  const titles = {
    patientModal: ['patientModalTitle','Add patient'],
    doctorModal: ['doctorModalTitle','Add doctor'],
    appointmentModal: ['appointmentModalTitle','Schedule appointment'],
    billModal: ['billModalTitle','New invoice']
  };
  const t = titles[overlay.id];
  if(t) $(`#${t[0]}`).textContent = t[1];
}

/* ============ RENDER: DASHBOARD ============ */
function renderDashboard(){
  $('#todayDate').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  $('#statPatients').textContent = db.patients.length;
  $('#statDoctors').textContent = db.doctors.length;

  const todayIso = new Date().toISOString().slice(0,10);
  const todaysAppts = db.appointments.filter(a => a.date === todayIso);
  $('#statApptsToday').textContent = todaysAppts.length;

  const outstanding = db.bills.filter(b => b.status !== 'Paid').reduce((sum,b) => sum + Number(b.amount), 0);
  $('#statOutstanding').textContent = `$${outstanding.toLocaleString()}`;

  const upcoming = [...db.appointments]
    .filter(a => a.status !== 'Cancelled' && a.status !== 'Completed')
    .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time))
    .slice(0,5);
  const upcomingList = $('#upcomingList');
  upcomingList.innerHTML = upcoming.length ? upcoming.map(a => {
    const p = findPatient(a.patientId), d = findDoctor(a.doctorId);
    return `<div class="list-item">
      <div>
        <div class="list-item-main">${p ? p.name : 'Unknown patient'}</div>
        <div class="list-item-sub">${d ? d.name : 'Unknown doctor'} &middot; ${fmtDate(a.date)}, ${fmtTime(a.time)}</div>
      </div>
      <span class="badge ${statusBadgeClass(a.status)}">${a.status}</span>
    </div>`;
  }).join('') : `<p class="empty-state">Nothing scheduled.</p>`;

  const recent = [...db.patients].sort((a,b) => b.admitted.localeCompare(a.admitted)).slice(0,5);
  $('#recentPatients').innerHTML = recent.length ? recent.map(p => `
    <div class="list-item">
      <div>
        <div class="list-item-main">${p.name}</div>
        <div class="list-item-sub">${p.condition}</div>
      </div>
      <span class="badge ${statusBadgeClass(p.status)}">${p.status}</span>
    </div>`).join('') : `<p class="empty-state">No patients yet.</p>`;
}

/* ============ PATIENTS ============ */
function renderPatients(filter=''){
  const tbody = $('#patientsTableBody');
  const q = filter.trim().toLowerCase();
  const rows = db.patients.filter(p =>
    !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.condition.toLowerCase().includes(q)
  );
  $('#patientsEmpty').classList.toggle('hidden', rows.length !== 0);
  tbody.innerHTML = rows.map(p => `
    <tr>
      <td class="mono">${p.id}</td>
      <td>${p.name}</td>
      <td>${p.age}</td>
      <td>${p.gender}</td>
      <td>${p.condition}</td>
      <td>${fmtDate(p.admitted)}</td>
      <td><span class="badge ${statusBadgeClass(p.status)}">${p.status}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" title="Edit" onclick="editPatient('${p.id}')">${iconEdit}</button>
          <button class="icon-btn" title="Delete" onclick="deletePatient('${p.id}')">${iconTrash}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

$('#patientSearch').addEventListener('input', (e) => renderPatients(e.target.value));

$('#patientForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = $('#patientId').value;
  const data = {
    name: $('#patientName').value.trim(),
    age: Number($('#patientAge').value),
    gender: $('#patientGender').value,
    blood: $('#patientBlood').value,
    condition: $('#patientCondition').value.trim(),
    contact: $('#patientContact').value.trim(),
    status: $('#patientStatus').value
  };
  if(id){
    Object.assign(findPatient(id), data);
    toast('Patient updated');
  } else {
    data.id = nextId('PT','patient');
    data.admitted = new Date().toISOString().slice(0,10);
    db.patients.push(data);
    toast('Patient added');
  }
  saveDB();
  closeModal($('#patientModal'));
  renderPatients($('#patientSearch').value);
  renderDashboard();
  populateApptSelects();
  populateBillSelects();
});

function editPatient(id){
  const p = findPatient(id);
  if(!p) return;
  $('#patientModalTitle').textContent = 'Edit patient';
  $('#patientId').value = p.id;
  $('#patientName').value = p.name;
  $('#patientAge').value = p.age;
  $('#patientGender').value = p.gender;
  $('#patientBlood').value = p.blood;
  $('#patientCondition').value = p.condition;
  $('#patientContact').value = p.contact;
  $('#patientStatus').value = p.status;
  openModal('patientModal');
}

function deletePatient(id){
  if(!confirm('Remove this patient record? This also removes their appointments and invoices.')) return;
  db.patients = db.patients.filter(p => p.id !== id);
  db.appointments = db.appointments.filter(a => a.patientId !== id);
  db.bills = db.bills.filter(b => b.patientId !== id);
  saveDB();
  renderAll();
  toast('Patient removed');
}

/* ============ DOCTORS ============ */
const DOCTOR_COLORS = ['teal','amber','sage','violet','rose'];

function renderDoctors(){
  const grid = $('#doctorsGrid');
  $('#doctorsEmpty').classList.toggle('hidden', db.doctors.length !== 0);
  grid.innerHTML = db.doctors.map((d,i) => `
    <div class="doctor-card" data-color="${DOCTOR_COLORS[i % DOCTOR_COLORS.length]}">
      <div class="doctor-card-top">
        <div class="doctor-avatar">${d.name.replace('Dr. ','').split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
        <div class="row-actions">
          <button class="icon-btn" title="Edit" onclick="editDoctor('${d.id}')">${iconEdit}</button>
          <button class="icon-btn" title="Delete" onclick="deleteDoctor('${d.id}')">${iconTrash}</button>
        </div>
      </div>
      <div>
        <div class="doctor-name">${d.name}</div>
        <div class="doctor-specialty">${d.specialty}</div>
      </div>
      <div class="doctor-meta">
        <span>${d.experience || 0} yrs experience</span>
        <span>Available: ${d.days || '—'}</span>
        <span class="mono">${d.contact || '—'}</span>
      </div>
    </div>
  `).join('');
}

$('#doctorForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = $('#doctorId').value;
  const data = {
    name: $('#doctorName').value.trim(),
    specialty: $('#doctorSpecialty').value.trim(),
    experience: Number($('#doctorExperience').value) || 0,
    days: $('#doctorDays').value.trim(),
    contact: $('#doctorContact').value.trim()
  };
  if(id){
    Object.assign(findDoctor(id), data);
    toast('Doctor updated');
  } else {
    data.id = nextId('DR','doctor');
    db.doctors.push(data);
    toast('Doctor added');
  }
  saveDB();
  closeModal($('#doctorModal'));
  renderDoctors();
  renderDashboard();
  populateApptSelects();
});

function editDoctor(id){
  const d = findDoctor(id);
  if(!d) return;
  $('#doctorModalTitle').textContent = 'Edit doctor';
  $('#doctorId').value = d.id;
  $('#doctorName').value = d.name;
  $('#doctorSpecialty').value = d.specialty;
  $('#doctorExperience').value = d.experience;
  $('#doctorDays').value = d.days;
  $('#doctorContact').value = d.contact;
  openModal('doctorModal');
}

function deleteDoctor(id){
  if(!confirm('Remove this doctor? Their appointments will remain but show as unassigned.')) return;
  db.doctors = db.doctors.filter(d => d.id !== id);
  saveDB();
  renderAll();
  toast('Doctor removed');
}

/* ============ APPOINTMENTS ============ */
let apptFilter = 'all';

function populateApptSelects(){
  $('#appointmentPatient').innerHTML = db.patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('') || '<option disabled>No patients yet</option>';
  $('#appointmentDoctor').innerHTML = db.doctors.map(d => `<option value="${d.id}">${d.name} — ${d.specialty}</option>`).join('') || '<option disabled>No doctors yet</option>';
}

function renderAppointments(){
  const tbody = $('#appointmentsTableBody');
  const rows = db.appointments.filter(a => apptFilter === 'all' || a.status === apptFilter)
    .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  $('#appointmentsEmpty').classList.toggle('hidden', rows.length !== 0);
  tbody.innerHTML = rows.map(a => {
    const p = findPatient(a.patientId), d = findDoctor(a.doctorId);
    return `<tr>
      <td>${p ? p.name : '<em>Removed patient</em>'}</td>
      <td>${d ? d.name : '<em>Unassigned</em>'}</td>
      <td>${fmtDate(a.date)}</td>
      <td>${fmtTime(a.time)}</td>
      <td>${a.reason}</td>
      <td><span class="badge ${statusBadgeClass(a.status)}">${a.status}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" title="Edit" onclick="editAppointment('${a.id}')">${iconEdit}</button>
          <button class="icon-btn" title="Delete" onclick="deleteAppointment('${a.id}')">${iconTrash}</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

$('#apptFilterPills').addEventListener('click', (e) => {
  const btn = e.target.closest('.pill');
  if(!btn) return;
  $$('#apptFilterPills .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  apptFilter = btn.dataset.filter;
  renderAppointments();
});

$('#appointmentForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = $('#appointmentId').value;
  const data = {
    patientId: $('#appointmentPatient').value,
    doctorId: $('#appointmentDoctor').value,
    date: $('#appointmentDate').value,
    time: $('#appointmentTime').value,
    reason: $('#appointmentReason').value.trim(),
    status: $('#appointmentStatus').value
  };
  if(id){
    Object.assign(db.appointments.find(a => a.id === id), data);
    toast('Appointment updated');
  } else {
    data.id = nextId('AP','appointment');
    db.appointments.push(data);
    toast('Appointment scheduled');
  }
  saveDB();
  closeModal($('#appointmentModal'));
  renderAppointments();
  renderDashboard();
});

function editAppointment(id){
  const a = db.appointments.find(x => x.id === id);
  if(!a) return;
  populateApptSelects();
  $('#appointmentModalTitle').textContent = 'Edit appointment';
  $('#appointmentId').value = a.id;
  $('#appointmentPatient').value = a.patientId;
  $('#appointmentDoctor').value = a.doctorId;
  $('#appointmentDate').value = a.date;
  $('#appointmentTime').value = a.time;
  $('#appointmentReason').value = a.reason;
  $('#appointmentStatus').value = a.status;
  openModal('appointmentModal');
}

function deleteAppointment(id){
  if(!confirm('Cancel and remove this appointment?')) return;
  db.appointments = db.appointments.filter(a => a.id !== id);
  saveDB();
  renderAppointments();
  renderDashboard();
  toast('Appointment removed');
}

/* ============ BILLING ============ */
function populateBillSelects(){
  $('#billPatient').innerHTML = db.patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('') || '<option disabled>No patients yet</option>';
}

function renderBilling(){
  const tbody = $('#billingTableBody');
  const rows = [...db.bills].sort((a,b) => b.date.localeCompare(a.date));
  $('#billingEmpty').classList.toggle('hidden', rows.length !== 0);
  tbody.innerHTML = rows.map(b => {
    const p = findPatient(b.patientId);
    return `<tr>
      <td class="mono">${b.id}</td>
      <td>${p ? p.name : '<em>Removed patient</em>'}</td>
      <td>${b.service}</td>
      <td>$${Number(b.amount).toLocaleString()}</td>
      <td>${fmtDate(b.date)}</td>
      <td><span class="badge ${statusBadgeClass(b.status)}">${b.status}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" title="Edit" onclick="editBill('${b.id}')">${iconEdit}</button>
          <button class="icon-btn" title="Delete" onclick="deleteBill('${b.id}')">${iconTrash}</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

$('#billForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = $('#billId').value;
  const data = {
    patientId: $('#billPatient').value,
    service: $('#billService').value.trim(),
    amount: Number($('#billAmount').value),
    date: $('#billDate').value,
    status: $('#billStatus').value
  };
  if(id){
    Object.assign(db.bills.find(b => b.id === id), data);
    toast('Invoice updated');
  } else {
    data.id = nextId('INV','bill');
    db.bills.push(data);
    toast('Invoice created');
  }
  saveDB();
  closeModal($('#billModal'));
  renderBilling();
  renderDashboard();
});

function editBill(id){
  const b = db.bills.find(x => x.id === id);
  if(!b) return;
  populateBillSelects();
  $('#billModalTitle').textContent = 'Edit invoice';
  $('#billId').value = b.id;
  $('#billPatient').value = b.patientId;
  $('#billService').value = b.service;
  $('#billAmount').value = b.amount;
  $('#billDate').value = b.date;
  $('#billStatus').value = b.status;
  openModal('billModal');
}

function deleteBill(id){
  if(!confirm('Delete this invoice?')) return;
  db.bills = db.bills.filter(b => b.id !== id);
  saveDB();
  renderBilling();
  renderDashboard();
  toast('Invoice removed');
}

/* ============ ICONS ============ */
const iconEdit = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>`;
const iconTrash = `<svg viewBox="0 0 24 24"><path d="M6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Zm3-3h6l1 2h4v2H4V6h4l1-2Z"/></svg>`;

/* ============ INIT ============ */
function renderAll(){
  renderDashboard();
  renderPatients();
  renderDoctors();
  populateApptSelects();
  renderAppointments();
  populateBillSelects();
  renderBilling();
}