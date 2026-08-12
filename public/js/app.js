
const API = '/api';
let TOKEN = localStorage.getItem('sx_token') || null;
let ME = null;

function authHeaders() {
  return TOKEN ? { 'Authorization': 'Bearer ' + TOKEN } : {};
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function toast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}


function setAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    onAuthSuccess(data);
  } catch (err) { toast(err.message, true); }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const bio = document.getElementById('reg-bio').value;
  try {
    const data = await api('/auth/register', { method: 'POST', body: { name, email, password, bio } });
    onAuthSuccess(data);
    toast('Account created! Welcome to SkillXchange.');
  } catch (err) { toast(err.message, true); }
}

function onAuthSuccess(data) {
  TOKEN = data.token;
  ME = data.user;
  localStorage.setItem('sx_token', TOKEN);
  showApp();
}

function handleLogout() {
  TOKEN = null; ME = null;
  localStorage.removeItem('sx_token');
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}


async function showApp() {
  try {
    const data = await api('/auth/me');
    ME = data.user;
  } catch (err) {
    handleLogout(); return;
  }
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  document.getElementById('user-name-label').textContent = ME.name;
  document.getElementById('credit-balance').textContent = ME.credits.toFixed(1);
  document.getElementById('nav-admin').classList.toggle('hidden', ME.role !== 'admin');
  navigate('dashboard');
}

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + view).classList.remove('hidden');
  document.querySelectorAll('#main-nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'dashboard') loadDashboard();
  if (view === 'browse') loadBrowse(true);
  if (view === 'requests') loadRequests();
  if (view === 'sessions') loadSessions();
  if (view === 'wallet') loadWallet();
  if (view === 'admin') loadAdmin();
}


async function loadDashboard() {
  document.getElementById('dash-welcome').textContent = `Welcome back, ${ME.name.split(' ')[0]}`;
  try {
    const [wallet, exchanges, sessions] = await Promise.all([
      api('/wallet'), api('/exchanges'), api('/sessions')
    ]);
    const pending = exchanges.exchanges.filter(e => e.status === 'pending' && e.provider_id === ME.id).length;
    const upcoming = sessions.sessions.filter(s => s.status === 'scheduled').length;
    document.getElementById('dash-stats').innerHTML = `
      <div class="stat-tile"><div class="num">${wallet.balance.toFixed(1)}</div><div class="label">Time-credits</div></div>
      <div class="stat-tile"><div class="num">${pending}</div><div class="label">Requests to review</div></div>
      <div class="stat-tile"><div class="num">${upcoming}</div><div class="label">Upcoming sessions</div></div>
    `;
  } catch (err) { toast(err.message, true); }
  loadMySkills();
}

function openAddSkillForm() { document.getElementById('add-skill-panel').classList.remove('hidden'); }
function closeAddSkillForm() { document.getElementById('add-skill-panel').classList.add('hidden'); }

async function handleAddSkill(e) {
  e.preventDefault();
  const skill_name = document.getElementById('skill-name').value;
  const category = document.getElementById('skill-category').value;
  const type = document.getElementById('skill-type').value;
  const description = document.getElementById('skill-description').value;
  try {
    await api('/skills', { method: 'POST', body: { skill_name, category, type, description } });
    toast('Skill added to your profile.');
    e.target.reset();
    closeAddSkillForm();
    loadMySkills();
  } catch (err) { toast(err.message, true); }
}

async function loadMySkills() {
  try {
    const data = await api('/skills/mine');
    const el = document.getElementById('my-skills-list');
    if (!data.skills.length) {
      el.innerHTML = `<div class="empty-state">No skills yet. Add a skill you can teach or want to learn to get started.</div>`;
      return;
    }
    el.innerHTML = data.skills.map(s => `
      <div class="card">
        <div class="flex-between">
          <span class="badge badge-${s.type}">${s.type === 'teach' ? 'Teaching' : 'Wants to learn'}</span>
          <button class="btn btn-sm btn-outline" onclick="deleteSkill(${s.id})">Remove</button>
        </div>
        <h3 style="margin-top:10px; font-size:1.05rem;">${escapeHtml(s.skill_name)}</h3>
        <div class="muted">${escapeHtml(s.category)}</div>
        <p class="muted">${escapeHtml(s.description)}</p>
      </div>
    `).join('');
  } catch (err) { toast(err.message, true); }
}

async function deleteSkill(id) {
  try { await api('/skills/' + id, { method: 'DELETE' }); toast('Skill removed.'); loadMySkills(); }
  catch (err) { toast(err.message, true); }
}


let browseTimer = null;
function debouncedBrowse() { clearTimeout(browseTimer); browseTimer = setTimeout(loadBrowse, 350); }

async function loadBrowse(loadCats = false) {
  try {
    if (loadCats) {
      const cats = await api('/skills/categories');
      const sel = document.getElementById('browse-category');
      sel.innerHTML = '<option value="">All categories</option>' + cats.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }
    const q = document.getElementById('browse-search').value;
    const category = document.getElementById('browse-category').value;
    const type = document.getElementById('browse-type').value;
    const params = new URLSearchParams({ q, category, type });
    const data = await api('/skills?' + params.toString());
    const el = document.getElementById('browse-list');
    const mine = data.skills.filter(s => s.owner_id !== ME.id);
    if (!mine.length) { el.innerHTML = `<div class="empty-state">No matching skills found. Try a different search.</div>`; return; }
    el.innerHTML = mine.map(s => `
      <div class="card">
        <div class="flex-between">
          <span class="badge badge-${s.type}">${s.type === 'teach' ? 'Teaching' : 'Seeking'}</span>
          <span class="stars">${s.owner_rating ? '★ ' + Number(s.owner_rating).toFixed(1) : 'No ratings yet'}</span>
        </div>
        <h3 style="margin-top:10px; font-size:1.05rem;">${escapeHtml(s.skill_name)}</h3>
        <div class="muted">${escapeHtml(s.category)} · by ${escapeHtml(s.teacher_name)}</div>
        <p class="muted">${escapeHtml(s.description)}</p>
        ${s.type === 'teach' ? `<button class="btn btn-primary btn-sm" onclick="requestExchange(${s.id}, '${escapeHtml(s.skill_name).replace(/'/g, "\\'")}')">Request exchange</button>` : ''}
      </div>
    `).join('');
  } catch (err) { toast(err.message, true); }
}

async function requestExchange(skillId, skillName) {
  const message = prompt(`Send a message to request "${skillName}" (optional):`, `Hi! I'd love to learn ${skillName} from you.`);
  if (message === null) return;
  try {
    await api('/exchanges', { method: 'POST', body: { skill_id: skillId, message } });
    toast('Exchange request sent!');
  } catch (err) { toast(err.message, true); }
}


async function loadRequests() {
  try {
    const data = await api('/exchanges');
    const el = document.getElementById('requests-list');
    if (!data.exchanges.length) { el.innerHTML = `<div class="empty-state">No exchange requests yet. Browse skills to send one.</div>`; return; }
    el.innerHTML = data.exchanges.map(ex => {
      const iAmProvider = ex.provider_id === ME.id;
      const otherName = iAmProvider ? ex.requester_name : ex.provider_name;
      const roleLabel = iAmProvider ? 'wants to learn from you' : 'you requested from';
      let actions = '';
      if (ex.status === 'pending' && iAmProvider) {
        actions = `<button class="btn btn-sm btn-primary" onclick="updateExchange(${ex.id}, 'accepted')">Accept</button>
                   <button class="btn btn-sm btn-outline" onclick="updateExchange(${ex.id}, 'rejected')">Decline</button>`;
      } else if (ex.status === 'pending' && !iAmProvider) {
        actions = `<button class="btn btn-sm btn-outline" onclick="updateExchange(${ex.id}, 'cancelled')">Cancel request</button>`;
      } else if (ex.status === 'accepted') {
        actions = `<button class="btn btn-sm btn-amber" onclick="openScheduleForm(${ex.id})">Schedule session</button>`;
      }
      return `
      <div class="card" style="margin-bottom:14px;">
        <div class="flex-between">
          <div><strong>${escapeHtml(ex.skill_name)}</strong> <span class="muted">(${escapeHtml(ex.category)})</span>
            <div class="muted">${roleLabel === 'wants to learn from you' ? escapeHtml(otherName) + ' wants to learn from you' : 'You requested from ' + escapeHtml(otherName)}</div>
          </div>
          <span class="badge badge-${ex.status}">${ex.status}</span>
        </div>
        ${ex.message ? `<p class="muted">"${escapeHtml(ex.message)}"</p>` : ''}
        <div id="schedule-form-${ex.id}" class="hidden" style="margin-top:10px;">
          <label>Session date & time</label>
          <input type="datetime-local" id="sched-time-${ex.id}" />
          <label>Duration (hours)</label>
          <input type="number" id="sched-dur-${ex.id}" value="1" min="0.5" step="0.5" />
          <button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="scheduleSession(${ex.id})">Confirm schedule</button>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px;">${actions}</div>
      </div>`;
    }).join('');
  } catch (err) { toast(err.message, true); }
}

async function updateExchange(id, status) {
  try { await api('/exchanges/' + id, { method: 'PUT', body: { status } }); toast('Request updated: ' + status); loadRequests(); }
  catch (err) { toast(err.message, true); }
}

function openScheduleForm(exId) { document.getElementById('schedule-form-' + exId).classList.remove('hidden'); }


async function scheduleSession(exId) {
  const time = document.getElementById('sched-time-' + exId).value;
  const dur = document.getElementById('sched-dur-' + exId).value;
  if (!time) { toast('Pick a date & time first.', true); return; }
  try {
    await api('/sessions', { method: 'POST', body: { exchange_id: exId, scheduled_time: new Date(time).toISOString(), duration_hours: parseFloat(dur) } });
    toast('Session scheduled!');
    loadRequests();
  } catch (err) { toast(err.message, true); }
}


async function loadSessions() {
  try {
    const data = await api('/sessions');
    const el = document.getElementById('sessions-list');
    if (!data.sessions.length) { el.innerHTML = `<div class="empty-state">No sessions scheduled yet. Accept a request first, then schedule it.</div>`; return; }
    el.innerHTML = data.sessions.map(s => {
      const iAmTeacher = s.provider.id === ME.id;
      const myConfirmed = iAmTeacher ? s.teacher_confirmed : s.learner_confirmed;
      const otherName = iAmTeacher ? s.requester.name : s.provider.name;
      let actionHtml = '';
      if (s.status === 'scheduled') {
        actionHtml = myConfirmed
          ? `<span class="muted">Waiting for ${escapeHtml(otherName)} to confirm...</span>`
          : `<button class="btn btn-sm btn-primary" onclick="confirmSession(${s.id})">Mark as completed</button>
             <button class="btn btn-sm btn-outline" onclick="disputeSession(${s.id})">Report an issue</button>`;
      } else if (s.status === 'completed') {
        actionHtml = `<button class="btn btn-sm btn-amber" onclick="openRateForm(${s.id})">Rate ${escapeHtml(otherName)}</button>`;
      } else if (s.status === 'disputed') {
        actionHtml = `<span class="muted">Under admin review.</span>`;
      }
      return `
      <div class="card" style="margin-bottom:14px;">
        <div class="flex-between">
          <div><strong>${escapeHtml(s.skill_name)}</strong> <span class="muted">with ${escapeHtml(otherName)} (${iAmTeacher ? 'you teach' : 'you learn'})</span>
            <div class="muted">${fmtDate(s.scheduled_time)} · ${s.duration_hours}h</div>
          </div>
          <span class="badge badge-${s.status}">${s.status}</span>
        </div>
        <div id="rate-form-${s.id}" class="hidden" style="margin-top:10px;">
          <label>Rating (1-5)</label>
          <select id="rate-score-${s.id}"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select>
          <label>Comment</label>
          <input type="text" id="rate-comment-${s.id}" placeholder="Optional feedback" />
          <button class="btn btn-sm btn-primary" style="margin-top:8px;" onclick="submitRating(${s.id})">Submit rating</button>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px; align-items:center;">${actionHtml}</div>
      </div>`;
    }).join('');
  } catch (err) { toast(err.message, true); }
}

async function confirmSession(id) {
  try {
    const data = await api('/sessions/' + id + '/confirm', { method: 'PUT' });
    toast(data.session.status === 'completed' ? 'Session completed! Credits transferred.' : 'Confirmed — waiting on the other participant.');
    loadSessions();
    const me = await api('/auth/me'); ME = me.user;
    document.getElementById('credit-balance').textContent = ME.credits.toFixed(1);
  } catch (err) { toast(err.message, true); }
}

async function disputeSession(id) {
  const reason = prompt('Briefly describe the issue for the admin:');
  if (!reason) return;
  try { await api('/sessions/' + id + '/dispute', { method: 'POST', body: { reason } }); toast('Dispute submitted to admin.'); loadSessions(); }
  catch (err) { toast(err.message, true); }
}

function openRateForm(sid) { document.getElementById('rate-form-' + sid).classList.remove('hidden'); }

async function submitRating(sid) {
  const score = parseInt(document.getElementById('rate-score-' + sid).value);
  const comment = document.getElementById('rate-comment-' + sid).value;
  try { await api('/ratings', { method: 'POST', body: { session_id: sid, score, comment } }); toast('Thanks for rating!'); loadSessions(); }
  catch (err) { toast(err.message, true); }
}


async function loadWallet() {
  try {
    const data = await api('/wallet');
    document.getElementById('wallet-balance-big').textContent = data.balance.toFixed(1);
    const tbody = document.getElementById('wallet-tbody');
    if (!data.transactions.length) { tbody.innerHTML = `<tr><td colspan="3" class="muted">No transactions yet.</td></tr>`; return; }
    tbody.innerHTML = data.transactions.map(t => `
      <tr>
        <td>${fmtDate(t.created_at)}</td>
        <td>${escapeHtml(t.reason)}</td>
        <td style="color:${t.amount >= 0 ? 'var(--teal)' : 'var(--rust)'}; font-weight:700;">${t.amount >= 0 ? '+' : ''}${t.amount.toFixed(1)}</td>
      </tr>`).join('');
  } catch (err) { toast(err.message, true); }
}


async function loadAdmin() {
  if (ME.role !== 'admin') return;
  try {
    const [stats, disputes, users] = await Promise.all([api('/admin/stats'), api('/admin/disputes'), api('/admin/users')]);
    document.getElementById('admin-stats').innerHTML = `
      <div class="stat-tile"><div class="num">${stats.users}</div><div class="label">Students</div></div>
      <div class="stat-tile"><div class="num">${stats.exchanges}</div><div class="label">Exchange requests</div></div>
      <div class="stat-tile"><div class="num">${stats.sessionsCompleted}</div><div class="label">Sessions completed</div></div>
      <div class="stat-tile"><div class="num">${stats.openDisputes}</div><div class="label">Open disputes</div></div>
    `;
    const dEl = document.getElementById('admin-disputes');
    dEl.innerHTML = disputes.disputes.filter(d => d.status === 'open').length
      ? disputes.disputes.filter(d => d.status === 'open').map(d => `
        <div class="card" style="margin-bottom:12px;">
          <div class="flex-between"><strong>Dispute #${d.id}</strong><span class="badge badge-disputed">open</span></div>
          <p class="muted">Raised by ${escapeHtml(d.raised_by_name)}: "${escapeHtml(d.reason)}"</p>
          <button class="btn btn-sm btn-primary" onclick="resolveDispute(${d.id}, true)">Resolve & restore session</button>
          <button class="btn btn-sm btn-outline" onclick="resolveDispute(${d.id}, false)">Resolve without restoring</button>
        </div>`).join('')
      : `<div class="empty-state">No open disputes 🎉</div>`;

    document.getElementById('admin-users-tbody').innerHTML = users.users.map(u => `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${u.credits.toFixed(1)}</td>
        <td>${u.is_banned ? '<span class="badge badge-rejected">banned</span>' : '<span class="badge badge-accepted">active</span>'}</td>
        <td>${u.role !== 'admin' ? `<button class="btn btn-sm btn-outline" onclick="toggleBan(${u.id}, ${u.is_banned ? 0 : 1})">${u.is_banned ? 'Unban' : 'Ban'}</button>` : ''}</td>
      </tr>`).join('');
  } catch (err) { toast(err.message, true); }
}

async function resolveDispute(id, restore) {
  const resolution = prompt('Resolution note:', 'Reviewed by admin — issue resolved.');
  if (resolution === null) return;
  try { await api(`/admin/disputes/${id}/resolve`, { method: 'PUT', body: { resolution, restore_session: restore } }); toast('Dispute resolved.'); loadAdmin(); }
  catch (err) { toast(err.message, true); }
}

async function toggleBan(id, banned) {
  try { await api(`/admin/users/${id}/ban`, { method: 'PUT', body: { banned } }); toast(banned ? 'User banned.' : 'User unbanned.'); loadAdmin(); }
  catch (err) { toast(err.message, true); }
}


if (TOKEN) { showApp(); }
