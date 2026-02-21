/* =============================================
   HABIT TRACKER — app.js (Cricket + Couple)
   Re-open fix: rollback stored on todayLog itself.
   ============================================= */
'use strict';

// =================== CRICKET CONSTANTS ===================
const LEVEL_CONFIG = [
  { level: 1, name: 'Rookie', minStreak: 0, kit: 'grey' },
  { level: 2, name: 'Club Player', minStreak: 3, kit: 'white' },
  { level: 3, name: 'State Player', minStreak: 7, kit: 'blue' },
  { level: 4, name: 'International', minStreak: 14, kit: 'navy' },
  { level: 5, name: 'Star Batsman', minStreak: 21, kit: 'gold' },
  { level: 6, name: 'Legend', minStreak: 30, kit: 'legend' },
];
const UNLOCK_THRESHOLDS = { helmet: 3, gloves: 7, bat: 14, trophy: 21, star: 30, crown: 50 };
const COUPLE_UNLOCK_THRESHOLDS = { wave: 3, smile: 7, hands: 14, hug: 21, heart: 30, ring: 50 };
const CAT_ICONS = { health: '🏃', mind: '🧠', skill: '⚡', social: '👥', other: '🎯' };

const POS_COMMENTS = [
  '🏏 SIX! Magnificent form — keep going!',
  '🔥 FOUR! Cracking innings today!',
  '⚡ Brilliant! You\'re on fire, champion!',
  '🎯 Perfect discipline! Run machine mode!',
  '🌟 Outstanding! Your batting average soars!',
  '💪 Pure class! What a player!',
];
const NEG_COMMENTS = [
  '💀 OUT! Wicket falls — streak broken!',
  '😔 LBW! Habit missed — form drops!',
  '🎯 Caught behind! Regroup and comeback!',
  '😤 Bowled! Stumps rattled! Stay strong!',
];
const NEUTRAL_COMMENTS = [
  '🏏 Innings submitted! Runs on the board!',
  '📊 Day logged. Stay consistent!',
];
const LOVE_POS = [
  '💗 Getting closer! The bond grows stronger!',
  '🌸 Such dedication! Love is in the air!',
  '💑 Perfect harmony today — beautiful!',
  '✨ Together you\'re unstoppable!',
  '💞 Closer with every step — keep going!',
];
const LOVE_NEG = [
  '💔 Drifting apart... Missing goals pulls you away.',
  '😢 The distance grows. Stay committed!',
  '🌧️ Targets missed — reconnect tomorrow!',
];

// =================== CRICKET STATE ===================
function defaultCricketState() {
  return {
    playerName: 'Your Cricketer',
    streak: 0, bestStreak: 0,
    totalRuns: 0, totalInnings: 0,
    battingAverage: 0, wicketsLost: 0, xp: 0,
    habits: [], history: [], gameDays: [],
    todayLog: null,
  };
}

function defaultCoupleState() {
  return {
    name1: 'Partner 1', name2: 'Partner 2',
    closeness: 0, coupleStreak: 0, bestCoupleStreak: 0,
    totalDays: 0,
    habits1: [], habits2: [],
    todayLog1: null, todayLog2: null,
    history: [],
  };
}

let cState = loadCricketState();
let cpState = loadCoupleState();

function loadCricketState() {
  try { const r = localStorage.getItem('cht_cricket_v3'); if (r) return Object.assign(defaultCricketState(), JSON.parse(r)); } catch (e) { }
  return defaultCricketState();
}
function loadCoupleState() {
  try { const r = localStorage.getItem('cht_couple_v3'); if (r) return Object.assign(defaultCoupleState(), JSON.parse(r)); } catch (e) { }
  return defaultCoupleState();
}
function saveCS() { localStorage.setItem('cht_cricket_v3', JSON.stringify(cState)); }
function saveCPS() { localStorage.setItem('cht_couple_v3', JSON.stringify(cpState)); }

// =================== DATE UTILS ===================
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
function formatDate(s) {
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function uid() { return '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// =================== ENSURE TODAY LOGS ===================
function ensureTodayLog() {
  const t = todayStr();
  if (!cState.todayLog || cState.todayLog.date !== t) {
    cState.todayLog = { date: t, habitResults: {}, submitted: false };
    cState.habits.forEach(h => cState.todayLog.habitResults[h.id] = null);
    saveCS();
  }
}
function ensureTodayLogCouple(which) {
  const t = todayStr();
  const key = which === 1 ? 'todayLog1' : 'todayLog2';
  const habits = which === 1 ? cpState.habits1 : cpState.habits2;
  if (!cpState[key] || cpState[key].date !== t) {
    cpState[key] = { date: t, habitResults: {}, submitted: false };
    habits.forEach(h => cpState[key].habitResults[h.id] = null);
    saveCPS();
  }
}

// =================== PLAYER LEVEL ===================
function getLevel(streak) {
  let c = LEVEL_CONFIG[0];
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (streak >= LEVEL_CONFIG[i].minStreak) { c = LEVEL_CONFIG[i]; break; }
  }
  return c;
}
function getNextLevel(streak) {
  for (let i = 0; i < LEVEL_CONFIG.length; i++) { if (streak < LEVEL_CONFIG[i].minStreak) return LEVEL_CONFIG[i]; }
  return null;
}
function levelProgress(streak) {
  const c = getLevel(streak), n = getNextLevel(streak);
  if (!n) return 100;
  return Math.round(((streak - c.minStreak) / (n.minStreak - c.minStreak)) * 100);
}

// =================== PLAYER SVG ===================
function buildSVG(kit) {
  const kits = {
    grey: { b: '#4b5563', h: '#374151', bk: '#6b7280', sk: '#d1a882' },
    white: { b: '#e2e8f0', h: '#94a3b8', bk: '#c4b068', sk: '#d1a882' },
    blue: { b: '#3b82f6', h: '#1d4ed8', bk: '#c4b068', sk: '#d1a882' },
    navy: { b: '#1e40af', h: '#1e3a8a', bk: '#c4b068', sk: '#d1a882' },
    gold: { b: '#f59e0b', h: '#d97706', bk: '#fbbf24', sk: '#d1a882' },
    legend: { b: '#fbbf24', h: '#f59e0b', bk: '#fbbf24', sk: '#d1a882', glow: true },
  };
  const c = kits[kit] || kits.grey;
  const gf = c.glow ? `<filter id="gg"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '';
  const ga = c.glow ? 'filter="url(#gg)"' : '';
  return `<svg viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg"><defs>${gf}</defs>
    <ellipse cx="50" cy="172" rx="28" ry="6" fill="rgba(0,0,0,0.2)"/>
    <rect x="36" y="115" width="11" height="42" rx="5" fill="${c.b}" ${ga}/>
    <rect x="53" y="115" width="11" height="42" rx="5" fill="${c.b}" ${ga}/>
    <ellipse cx="41" cy="157" rx="9" ry="5" fill="#1f2937"/>
    <ellipse cx="58" cy="157" rx="9" ry="5" fill="#1f2937"/>
    <rect x="34" y="110" width="14" height="28" rx="5" fill="#f8fafc" opacity="0.9"/>
    <rect x="52" y="110" width="14" height="28" rx="5" fill="#f8fafc" opacity="0.9"/>
    <rect x="30" y="70" width="40" height="52" rx="10" fill="${c.b}" ${ga}/>
    <rect x="30" y="82" width="40" height="4" rx="2" fill="rgba(255,255,255,0.15)"/>
    <rect x="12" y="72" width="20" height="10" rx="5" fill="${c.b}" ${ga}/>
    <rect x="68" y="72" width="20" height="10" rx="5" fill="${c.b}" ${ga}/>
    <ellipse cx="14" cy="82" rx="8" ry="7" fill="#92400e"/>
    <ellipse cx="87" cy="82" rx="8" ry="7" fill="#92400e"/>
    <rect x="44" y="58" width="12" height="16" rx="5" fill="${c.sk}"/>
    <ellipse cx="50" cy="50" rx="20" ry="20" fill="${c.sk}" ${ga}/>
    <path d="M30 48 Q30 24 50 24 Q70 24 70 48 Q70 42 50 42 Q30 42 30 48Z" fill="${c.h}" ${ga}/>
    <rect x="32" y="44" width="36" height="8" rx="3" fill="${c.h}" ${ga}/>
    <path d="M36 52 Q50 58 64 52" stroke="${c.bk}" stroke-width="1.5" fill="none"/>
    <line x1="40" y1="50" x2="40" y2="60" stroke="${c.bk}" stroke-width="1" opacity="0.55"/>
    <line x1="50" y1="50" x2="50" y2="62" stroke="${c.bk}" stroke-width="1" opacity="0.55"/>
    <line x1="60" y1="50" x2="60" y2="60" stroke="${c.bk}" stroke-width="1" opacity="0.55"/>
    <circle cx="43" cy="50" r="2.5" fill="#1f2937"/>
    <circle cx="57" cy="50" r="2.5" fill="#1f2937"/>
    <circle cx="44" cy="49" r="1" fill="white"/>
    <circle cx="58" cy="49" r="1" fill="white"/>
    <rect x="70" y="80" width="7" height="55" rx="3.5" fill="${c.bk}" ${ga}/>
    <rect x="68" y="118" width="11" height="18" rx="4" fill="${c.bk}" ${ga} opacity="0.9"/>
    ${c.glow ? '<ellipse cx="74" cy="100" rx="5" ry="28" fill="rgba(251,191,36,0.12)"/>' : ''}
  </svg>`;
}

// =================== COMMENTARY ===================
function showCommentary(msg, type = 'neutral') {
  const b = document.getElementById('commentary-banner');
  const t = document.getElementById('commentary-text');
  b.className = `commentary-banner ${type}`;
  b.classList.remove('hidden');
  t.textContent = msg;
  b.getBoundingClientRect(); // force reflow
  b.classList.add('show');
  clearTimeout(b._timer);
  b._timer = setTimeout(() => {
    b.classList.remove('show');
    setTimeout(() => b.classList.add('hidden'), 420);
  }, 3200);
}
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// =================== THEME SWITCHING ===================
let activeTheme = 'cricket';

function switchTheme(theme) {
  activeTheme = theme;
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  document.getElementById('cricket-app').classList.toggle('hidden', theme !== 'cricket');
  document.getElementById('couple-app').classList.toggle('hidden', theme !== 'couple');
  if (theme === 'cricket') renderCricket();
  else renderCouple();
}

// =================== TAB SWITCHING ===================
function switchTab(app, tab) {
  const prefix = app + '-tab-';
  document.querySelectorAll(`#${app}-app .tab-content`).forEach(c => c.classList.toggle('active', c.id === prefix + tab));
  document.querySelectorAll(`#${app}-app .tab-btn`).forEach(b => b.classList.toggle('active', b.dataset.tab === tab && b.dataset.app === app));
}

// =================== CRICKET RENDER ===================
function renderCricket() {
  ensureTodayLog();
  renderCricketPlayer();
  renderCricketStats();
  renderTodayHabits();
  renderRunsToday();
  renderUnlocks();
  renderHabitsManage();
  renderGameDayTab();
  renderCricketHistory();
  document.getElementById('cricket-current-date').textContent = formatDate(todayStr());
}

function renderCricketPlayer() {
  const lc = getLevel(cState.streak);
  const prog = levelProgress(cState.streak);
  const nl = getNextLevel(cState.streak);
  document.getElementById('player-level-badge').textContent = lc.name;
  document.getElementById('player-svg').innerHTML = buildSVG(lc.kit);
  document.getElementById('player-name').textContent = cState.playerName;
  document.getElementById('level-fill').style.width = prog + '%';
  document.getElementById('level-label').textContent = nl
    ? `Level ${lc.level} · ${lc.name} — ${nl.minStreak - cState.streak} days to ${nl.name}`
    : `Level ${lc.level} · ${lc.name} — MAX LEVEL!`;
  document.querySelector('.player-card').classList.toggle('legend-mode', lc.level === 6);
}

function renderCricketStats() {
  setText('stat-streak', cState.streak);
  setText('stat-runs', cState.totalRuns);
  setText('stat-avg', cState.battingAverage.toFixed(2));
  setText('stat-best', cState.bestStreak);
  setText('stat-wickets', cState.wicketsLost);
  setText('stat-xp', cState.xp);
}

function renderTodayHabits() {
  const list = document.getElementById('today-habits-list');
  if (!cState.habits.length) {
    list.innerHTML = `<p class="empty-msg">No habits added yet. Go to the Habits tab! 🏏</p>`;
    renderRunsToday();
    updateSubmitBtn();
    return;
  }
  const submitted = cState.todayLog && cState.todayLog.submitted;
  list.innerHTML = cState.habits.map(h => {
    const r = cState.todayLog ? cState.todayLog.habitResults[h.id] : null;
    const isDone = r === 'done', isMissed = r === 'missed';
    const icon = CAT_ICONS[h.category] || '🎯';
    return `<div class="habit-today-item ${isDone ? 'done' : isMissed ? 'missed' : ''}" id="hti-${h.id}">
      <span class="habit-today-icon">${icon}</span>
      <span class="habit-today-name">${esc(h.name)}</span>
      <span class="habit-streak-badge">🔥 ${h.streak || 0}d</span>
      <div class="habit-actions">
        <button class="btn-done" onclick="markHabit('${h.id}','done')" ${submitted ? 'disabled' : ''} title="Done">✅</button>
        <button class="btn-miss" onclick="markHabit('${h.id}','missed')" ${submitted ? 'disabled' : ''} title="Missed">❌</button>
      </div>
    </div>`;
  }).join('');
  renderRunsToday();
  updateSubmitBtn();
}

function updateSubmitBtn() {
  const btn = document.getElementById('btn-submit-day');
  const submitted = cState.todayLog && cState.todayLog.submitted;
  if (submitted) {
    btn.textContent = '✏️ Re-open Today\'s Innings';
    btn.style.background = 'linear-gradient(135deg,#6366f1,#818cf8)';
    btn.onclick = reopenDay;
  } else {
    btn.textContent = "Submit Day's Innings ✅";
    btn.style.background = '';
    btn.onclick = submitDay;
  }
}

function renderRunsToday() {
  const res = cState.todayLog ? cState.todayLog.habitResults : {};
  const total = cState.habits.length;
  const done = Object.values(res).filter(v => v === 'done').length;
  const runs = calcRuns(done, total);
  const pct = total > 0 ? (done / total) * 100 : 0;
  setText('runs-today-val', runs);
  document.getElementById('innings-fill').style.width = pct + '%';
}

function calcRuns(done, total) {
  if (!total) return 0;
  return Math.round(done * 6 * (1 + cState.streak * 0.1));
}

function renderUnlocks() {
  document.querySelectorAll('.unlock-item[data-unlock]').forEach(el => {
    const t = UNLOCK_THRESHOLDS[el.dataset.unlock];
    el.classList.toggle('locked', cState.bestStreak < t);
    el.classList.toggle('unlocked', cState.bestStreak >= t);
  });
}

function renderHabitsManage() {
  const list = document.getElementById('habits-manage-list');
  if (!cState.habits.length) { list.innerHTML = '<p class="empty-msg">No habits yet. Add your first habit above!</p>'; return; }
  list.innerHTML = cState.habits.map(h => `
    <div class="habit-manage-item">
      <span class="habit-cat-icon">${CAT_ICONS[h.category] || '🎯'}</span>
      <div class="habit-manage-info"><div class="habit-manage-name">${esc(h.name)}</div><div class="habit-manage-meta">${h.category} · ${formatDate(h.addedDate)}</div></div>
      <div class="habit-streak-info"><div class="habit-streak-val">${h.streak || 0}</div><div class="habit-streak-sub">streak</div></div>
      <button class="btn-delete-habit" onclick="deleteHabit('${h.id}')">🗑</button>
    </div>`).join('');
}

function renderGameDayTab() {
  if (!document.getElementById('gd-date').value) document.getElementById('gd-date').value = todayStr();
  renderActiveScoreboard();
  renderUpcomingGDs();
}

function renderActiveScoreboard() {
  const today = todayStr();
  const gd = cState.gameDays.find(g => g.date === today && !g.played);
  const box = document.getElementById('scoreboard-content');
  if (!gd) { box.innerHTML = '<p class="empty-msg">No Game Day for today. Schedule one!</p>'; return; }
  const res = cState.todayLog ? cState.todayLog.habitResults : {};
  const total = cState.habits.length;
  const done = Object.values(res).filter(v => v === 'done').length;
  const runs = calcRuns(done, total);
  box.innerHTML = `<div class="scoreboard-box">
    <div class="scoreboard-header"><h4>🏟️ ${esc(gd.name)}</h4><span class="gd-date">${formatDate(gd.date)}</span></div>
    <div class="scoreboard-body">
      <div class="score-vs">🏏 You vs ${esc(gd.opponent || 'Your Bad Habits XI')}</div>
      <div class="score-main">${runs}/${cState.wicketsLost}</div>
      <div class="score-detail">
        <div class="score-detail-item"><div class="score-detail-val">${done}/${total}</div><div class="score-detail-lbl">Habits ✅</div></div>
        <div class="score-detail-item"><div class="score-detail-val">${Math.floor(done * 0.5)}</div><div class="score-detail-lbl">Fours 🏏</div></div>
        <div class="score-detail-item"><div class="score-detail-val">${Math.min(cState.streak, done)}</div><div class="score-detail-lbl">Sixes ⚡</div></div>
        <div class="score-detail-item"><div class="score-detail-val">${cState.streak}</div><div class="score-detail-lbl">Streak 🔥</div></div>
      </div>
      <button class="btn-primary btn-play-gd" onclick="finalizeGD('${gd.id}')">Finalize Game Day & Log Score 🏆</button>
    </div></div>`;
}

function renderUpcomingGDs() {
  const t = todayStr();
  const list = document.getElementById('upcoming-gamedays');
  const upcoming = cState.gameDays.filter(g => g.date >= t).sort((a, b) => a.date.localeCompare(b.date));
  if (!upcoming.length) { list.innerHTML = '<p class="empty-msg">No upcoming game days.</p>'; return; }
  list.innerHTML = upcoming.map(g => {
    const isToday = g.date === t;
    const badge = g.played
      ? `<span class="gd-status-badge gd-status-done">✅ Played</span>`
      : isToday ? `<span class="gd-status-badge gd-status-today">🎯 TODAY</span>`
        : `<span class="gd-status-badge gd-status-upcoming">📅 Upcoming</span>`;
    return `<div class="upcoming-gd-item"><span class="gd-icon">🏟️</span>
      <div class="gd-info"><div class="gd-info-name">${esc(g.name)}</div><div class="gd-info-meta">${formatDate(g.date)} · vs ${esc(g.opponent || 'Bad Habits XI')}</div></div>${badge}</div>`;
  }).join('');
}

function renderCricketHistory() {
  const hList = document.getElementById('history-list');
  const gdList = document.getElementById('gd-history-list');
  const innings = [...cState.history].reverse().slice(0, 30);
  const gdR = cState.gameDays.filter(g => g.played).reverse().slice(0, 20);
  hList.innerHTML = innings.length ? innings.map(h => {
    const rc = h.runs >= 50 ? 'good' : h.runs >= 20 ? 'avg' : 'bad';
    return `<div class="history-item"><div class="history-date">${formatDate(h.date)}</div>
      <div class="history-body"><div class="history-title">${h.habitsCompleted}/${h.habitsTotal} habits</div>
      <div class="history-detail">Streak: ${h.streakAfter} · XP +${h.xpEarned}</div></div>
      <div class="history-runs ${rc}">${h.runs} runs</div></div>`;
  }).join('') : '<p class="empty-msg">No innings yet.</p>';
  gdList.innerHTML = gdR.length ? gdR.map(g => `<div class="history-item">
    <div class="history-date">${formatDate(g.date)}</div>
    <div class="history-body"><div class="history-title">🏟️ ${esc(g.name)}</div><div class="history-detail">vs ${esc(g.opponent || 'Bad Habits XI')} · ${g.result || ''}</div></div>
    <div class="history-runs good">${g.runsScored || 0} runs</div></div>`).join('')
    : '<p class="empty-msg">No game day results.</p>';
}

// =================== CRICKET ACTIONS ===================

window.markHabit = function (id, result) {
  ensureTodayLog();
  if (cState.todayLog.submitted) return;
  const cur = cState.todayLog.habitResults[id];
  // Toggle: same button again → clear back to null
  cState.todayLog.habitResults[id] = (cur === result) ? null : result;
  if (cState.todayLog.habitResults[id] !== null) {
    showCommentary(result === 'done' ? rand(POS_COMMENTS) : rand(NEG_COMMENTS), result === 'done' ? 'positive' : 'negative');
  }
  saveCS();
  renderTodayHabits();
};

function submitDay() {
  ensureTodayLog();
  if (cState.todayLog.submitted) return;
  const res = cState.todayLog.habitResults;
  const total = cState.habits.length;
  if (!total) { showCommentary('⚠️ Add some habits first!', 'neutral'); return; }

  const done = Object.values(res).filter(v => v === 'done').length;
  const missed = Object.values(res).filter(v => v === 'missed').length;
  const unmarked = Object.values(res).filter(v => v === null).length;
  // Mark unmarked as missed
  Object.keys(res).forEach(id => { if (res[id] === null) res[id] = 'missed'; });

  const effectiveMissed = missed + unmarked;
  const allDone = done === total;
  const runs = calcRuns(done, total);
  const xp = allDone ? runs * 2 : runs;
  const prevLevel = getLevel(cState.streak);

  // --- SNAPSHOT for rollback (stored on todayLog) ---
  const habitSnap = {};
  cState.habits.forEach(h => habitSnap[h.id] = h.streak || 0);
  cState.todayLog._rollback = {
    streak: cState.streak,
    wickets: cState.wicketsLost,
    runs: cState.totalRuns,
    xp: cState.xp,
    innings: cState.totalInnings,
    bestStreak: cState.bestStreak,
    habitStreaks: habitSnap,
    historyDate: todayStr(),
  };

  // Update per-habit streaks
  cState.habits.forEach(h => {
    h.streak = res[h.id] === 'done' ? (h.streak || 0) + 1 : 0;
  });

  // Overall streak
  if (allDone) {
    cState.streak += 1;
    cState.bestStreak = Math.max(cState.bestStreak, cState.streak);
  } else if (effectiveMissed > 0) {
    cState.streak = 0;
    cState.wicketsLost += effectiveMissed;
  }

  cState.totalRuns += runs;
  cState.totalInnings += 1;
  cState.xp += xp;
  recalcAvg();
  cState.todayLog.submitted = true;

  const newLevel = getLevel(cState.streak);
  const comment = allDone ? rand(POS_COMMENTS) : effectiveMissed > 0 ? rand(NEG_COMMENTS) : rand(NEUTRAL_COMMENTS);

  cState.history.push({
    date: cState.todayLog.date,
    habitsCompleted: done, habitsTotal: total,
    runs, xpEarned: xp, streakAfter: cState.streak,
  });
  saveCS();

  const type = allDone ? 'positive' : effectiveMissed > 0 ? 'negative' : 'neutral';
  showCommentary(comment, type);

  if (newLevel.level !== prevLevel.level) {
    const el = document.getElementById('player-svg');
    el.classList.add(newLevel.level > prevLevel.level ? 'level-up-anim' : 'wicket-anim');
    setTimeout(() => el.classList.remove('level-up-anim', 'wicket-anim'), 700);
    setTimeout(() => {
      showCommentary(newLevel.level > prevLevel.level
        ? `⬆️ LEVEL UP! You are now a ${newLevel.name}!`
        : `⬇️ Form dropped to ${newLevel.name}. Fight back!`,
        newLevel.level > prevLevel.level ? 'neutral' : 'negative');
    }, 3500);
  }
  renderCricket();
}

// FIX: rollback stored directly on todayLog, so no index issues
function reopenDay() {
  ensureTodayLog();
  if (!cState.todayLog.submitted) return;

  const rb = cState.todayLog._rollback;
  if (rb) {
    // Reverse all stat changes
    cState.streak = rb.streak;
    cState.wicketsLost = rb.wickets;
    cState.totalRuns = rb.runs;
    cState.xp = rb.xp;
    cState.totalInnings = rb.innings;
    cState.bestStreak = rb.bestStreak;
    recalcAvg();
    // Restore per-habit streaks
    cState.habits.forEach(h => { if (rb.habitStreaks[h.id] !== undefined) h.streak = rb.habitStreaks[h.id]; });
    // Remove from history by matching date
    const idx = cState.history.findLastIndex ? cState.history.findLastIndex(e => e.date === rb.historyDate)
      : [...cState.history].reverse().findIndex(e => e.date === rb.historyDate);
    const realIdx = cState.history.findLastIndex ? idx : (idx >= 0 ? cState.history.length - 1 - idx : -1);
    if (realIdx >= 0) cState.history.splice(realIdx, 1);
  }

  // Restore habit results to what they were (keep marks for editing)
  // But re-enable buttons by marking submitted=false
  cState.todayLog.submitted = false;
  delete cState.todayLog._rollback;
  saveCS();
  renderCricket();
  showCommentary('✏️ Innings re-opened! Update your habits and resubmit.', 'neutral');
}

function recalcAvg() {
  cState.battingAverage = cState.totalInnings > 0 ? cState.totalRuns / cState.totalInnings : 0;
}

function addHabit() {
  const ni = document.getElementById('habit-name-input');
  const name = ni.value.trim();
  if (!name) { ni.focus(); return; }
  const h = { id: uid(), name, category: document.getElementById('habit-category').value, streak: 0, addedDate: todayStr() };
  cState.habits.push(h);
  ensureTodayLog();
  cState.todayLog.habitResults[h.id] = null;
  ni.value = '';
  saveCS();
  renderCricket();
  showCommentary(`🏏 "${name}" added to your innings!`, 'neutral');
}

window.deleteHabit = function (id) {
  showModal('Delete Habit', 'This will remove the habit and its streak data. Are you sure?', () => {
    cState.habits = cState.habits.filter(h => h.id !== id);
    if (cState.todayLog) delete cState.todayLog.habitResults[id];
    saveCS(); renderCricket();
  });
};

function scheduleGD() {
  const name = document.getElementById('gd-name').value.trim();
  const date = document.getElementById('gd-date').value;
  const opp = document.getElementById('gd-opponent').value.trim();
  if (!name || !date) { showCommentary('⚠️ Fill in Game Day name and date!', 'neutral'); return; }
  cState.gameDays.push({ id: uid(), name, date, opponent: opp || 'Your Bad Habits XI', played: false, runsScored: 0, result: null });
  document.getElementById('gd-name').value = '';
  document.getElementById('gd-opponent').value = '';
  saveCS(); renderCricket();
  showCommentary(`🏟️ Game Day "${name}" scheduled for ${formatDate(date)}!`, 'neutral');
}

window.finalizeGD = function (id) {
  const gd = cState.gameDays.find(g => g.id === id);
  if (!gd || gd.played) return;
  const res = cState.todayLog ? cState.todayLog.habitResults : {};
  const total = cState.habits.length;
  const done = Object.values(res).filter(v => v === 'done').length;
  const runs = calcRuns(done, total);
  gd.played = true; gd.runsScored = runs;
  gd.result = done === total ? `Dominant Victory! ${runs} runs` : done >= total * 0.7 ? `Good performance — ${runs} runs` : `Tough game — ${runs} runs`;
  cState.totalRuns += Math.floor(runs * 0.5);
  cState.xp += runs;
  recalcAvg();
  saveCS(); renderCricket();
  showCommentary(done >= total * 0.5 ? `🏆 VICTORY! ${runs} runs scored!` : `📊 Game Day done. ${runs} runs.`, done >= total * 0.5 ? 'positive' : 'negative');
};

// =================== COUPLE RENDER ===================

// Syncs all static "Partner 1" / "Partner 2" labels across the UI to the typed names.
function syncPartnerTabNames() {
  const n1 = cpState.name1 || 'Partner 1';
  const n2 = cpState.name2 || 'Partner 2';

  // Nav tab buttons
  const tb1 = document.getElementById('tab-btn-partner1');
  const tb2 = document.getElementById('tab-btn-partner2');
  if (tb1) tb1.innerHTML = `👤 ${n1}`;
  if (tb2) tb2.innerHTML = `👤 ${n2}`;

  // Couple Stats "P1 Today" / "P2 Today" labels
  const s1 = document.querySelector('#c-stat-p1done')?.closest('.stat-box')?.querySelector('.stat-lbl');
  const s2 = document.querySelector('#c-stat-p2done')?.closest('.stat-box')?.querySelector('.stat-lbl');
  if (s1) s1.textContent = n1 + ' Today';
  if (s2) s2.textContent = n2 + ' Today';

  // Name inputs (if not focused, keep in sync with state)
  const in1 = document.getElementById('p1-name-input');
  const in2 = document.getElementById('p2-name-input');
  if (in1 && document.activeElement !== in1 && in1.value !== n1) in1.value = n1;
  if (in2 && document.activeElement !== in2 && in2.value !== n2) in2.value = n2;
}

function renderCouple() {
  ensureTodayLogCouple(1);
  ensureTodayLogCouple(2);
  syncPartnerTabNames();
  renderCouplePath();
  renderCoupleStats();
  renderCoupleUnlocks();
  renderPartnerHabits(1);
  renderPartnerHabits(2);
  renderCoupleHistory();
  setText('couple-current-date', formatDate(todayStr()));
}

function calcCloseness() {
  const r1 = cpState.todayLog1 ? cpState.todayLog1.habitResults : {};
  const r2 = cpState.todayLog2 ? cpState.todayLog2.habitResults : {};
  const t1 = cpState.habits1.length, t2 = cpState.habits2.length;
  const d1 = Object.values(r1).filter(v => v === 'done').length;
  const d2 = Object.values(r2).filter(v => v === 'done').length;
  const p1 = t1 > 0 ? d1 / t1 : 0;
  const p2 = t2 > 0 ? d2 / t2 : 0;
  // Closeness = average of both, boosted by couple streak
  const base = (p1 + p2) / 2;
  const boost = Math.min(cpState.coupleStreak * 0.02, 0.3);
  return Math.min(1, base + boost);
}

function renderCouplePath() {
  const closeness = cpState.closeness; // 0-100 stored
  const todayClose = Math.round(calcCloseness() * 100);
  const displayClose = Math.max(closeness, todayClose);

  // Sync names from state into the input fields (only if they differ to avoid caret jump)
  const n1 = cpState.name1 || 'Partner 1';
  const n2 = cpState.name2 || 'Partner 2';
  const in1 = document.getElementById('p1-name-input');
  const in2 = document.getElementById('p2-name-input');
  if (in1 && in1.value !== n1 && document.activeElement !== in1) in1.value = n1;
  if (in2 && in2.value !== n2 && document.activeElement !== in2) in2.value = n2;

  // Update SVG labels
  const svgP1 = document.getElementById('p1-svg-label');
  const svgP2 = document.getElementById('p2-svg-label');
  if (svgP1) svgP1.textContent = n1.slice(0, 8);
  if (svgP2) svgP2.textContent = n2.slice(0, 8);

  // Move characters
  const p1x = 40 + (displayClose / 100) * 360;
  const p2x = 760 - (displayClose / 100) * 360;
  const p1char = document.getElementById('p1-char');
  const p2char = document.getElementById('p2-char');
  if (p1char) p1char.setAttribute('transform', `translate(${p1x}, 110)`);
  if (p2char) p2char.setAttribute('transform', `translate(${p2x}, 110)`);

  // Connection line
  const line = document.getElementById('couple-connect-line');
  if (line) {
    line.setAttribute('x1', p1x);
    line.setAttribute('x2', p2x);
    const opacity = 0.1 + (displayClose / 100) * 0.6;
    line.setAttribute('stroke', `rgba(244,114,182,${opacity.toFixed(2)})`);
  }

  // Center heart
  const heart = document.getElementById('center-heart');
  if (heart) heart.setAttribute('opacity', Math.max(0, (displayClose - 50) / 50).toFixed(2));

  // Love meter bar + thumb
  setText('love-meter-val', displayClose + '%');
  const fill = document.getElementById('love-meter-fill');
  const thumb = document.getElementById('love-meter-thumb');
  if (fill) fill.style.width = displayClose + '%';
  if (thumb) thumb.style.left = displayClose + '%';

  // Journey tab name displays (legacy click-to-edit spans — keep synced)
  setText('p1-name-display', n1);
  setText('p2-name-display', n2);
}

function renderCoupleStats() {
  const closeness = Math.round(calcCloseness() * 100);
  const r1 = cpState.todayLog1 ? cpState.todayLog1.habitResults : {};
  const r2 = cpState.todayLog2 ? cpState.todayLog2.habitResults : {};
  const t1 = cpState.habits1.length, t2 = cpState.habits2.length;
  const d1 = Object.values(r1).filter(v => v === 'done').length;
  const d2 = Object.values(r2).filter(v => v === 'done').length;
  setText('c-stat-closeness', closeness + '%');
  setText('c-stat-streak', cpState.coupleStreak);
  setText('c-stat-best', cpState.bestCoupleStreak);
  setText('c-stat-days', cpState.totalDays);
  setText('c-stat-p1done', t1 > 0 ? Math.round((d1 / t1) * 100) + '%' : '—');
  setText('c-stat-p2done', t2 > 0 ? Math.round((d2 / t2) * 100) + '%' : '—');
}

function renderCoupleUnlocks() {
  document.querySelectorAll('.unlock-item[data-cunlock]').forEach(el => {
    const t = COUPLE_UNLOCK_THRESHOLDS[el.dataset.cunlock];
    el.classList.toggle('locked', cpState.bestCoupleStreak < t);
    el.classList.toggle('unlocked', cpState.bestCoupleStreak >= t);
  });
}

function renderPartnerHabits(which) {
  const habits = which === 1 ? cpState.habits1 : cpState.habits2;
  const log = which === 1 ? cpState.todayLog1 : cpState.todayLog2;
  const name = which === 1 ? cpState.name1 : cpState.name2;
  const listId = `p${which}-habits-list`;
  const btnId = `btn-submit-p${which}`;
  const pctId = `p${which}-today-pct`;
  const noteId = `p${which}-day-note`;
  const countId = `p${which}-note-count`;

  // Sync name input (don't clobber active field)
  const nameInput = document.getElementById(`p${which}-name-input`);
  if (nameInput && nameInput.value !== (name || '') && document.activeElement !== nameInput) {
    nameInput.value = name || '';
  }

  const results = log ? log.habitResults : {};
  const total = habits.length;
  const done = Object.values(results).filter(v => v === 'done').length;
  setText(pctId, total > 0 ? Math.round((done / total) * 100) + '%' : '0%');

  const list = document.getElementById(listId);
  const submitted = log && log.submitted;
  if (!habits.length) {
    list.innerHTML = '<p class="empty-msg">No habits yet. Add some above!</p>';
  } else {
    list.innerHTML = habits.map(h => {
      const r = results[h.id];
      const isDone = r === 'done', isMissed = r === 'missed';
      const icon = CAT_ICONS[h.category] || '🎯';
      return `<div class="habit-today-item ${isDone ? 'done' : isMissed ? 'missed' : ''}" id="p${which}hti-${h.id}">
        <span class="habit-today-icon">${icon}</span>
        <span class="habit-today-name">${esc(h.name)}</span>
        <span class="habit-streak-badge">🔥 ${h.streak || 0}d</span>
        <div class="habit-actions">
          <button class="btn-done" onclick="markCoupleHabit(${which},'${h.id}','done')" ${submitted ? 'disabled' : ''}>✅</button>
          <button class="btn-miss" onclick="markCoupleHabit(${which},'${h.id}','missed')" ${submitted ? 'disabled' : ''}>❌</button>
        </div>
      </div>`;
    }).join('');
  }

  // Restore / lock textarea
  const noteEl = document.getElementById(noteId);
  const countEl = document.getElementById(countId);
  if (noteEl) {
    const savedNote = log ? (log.note || '') : '';
    if (document.activeElement !== noteEl) noteEl.value = savedNote;
    noteEl.disabled = submitted;
    if (countEl) countEl.textContent = noteEl.value.length;
  }

  const btn = document.getElementById(btnId);
  if (submitted) {
    btn.textContent = `✏️ Re-open Partner ${which}'s Day`;
    btn.style.background = 'linear-gradient(135deg,#6366f1,#818cf8)';
    btn.onclick = () => reopenPartnerDay(which);
  } else {
    btn.textContent = `Submit Partner ${which} Day ${which === 1 ? '💙' : '❤️'}`;
    btn.style.background = '';
    btn.onclick = () => submitPartnerDay(which);
  }
}

function renderCoupleHistory() {
  const list = document.getElementById('couple-history-list');
  const h = [...cpState.history].reverse().slice(0, 30);
  list.innerHTML = h.length ? h.map(e => {
    const cls = e.closeness >= 70 ? 'good' : e.closeness >= 40 ? 'avg' : 'bad';
    const arrow = e.closeness >= 50 ? '💗 Getting Closer' : '💔 Drifted Apart';
    const note1 = e.note1 ? `<div class="memory-note-block"><div class="memory-note-who p1">💙 ${esc(e.name1 || 'Partner 1')}</div>${esc(e.note1)}</div>` : '';
    const note2 = e.note2 ? `<div class="memory-note-block"><div class="memory-note-who p2">❤️ ${esc(e.name2 || 'Partner 2')}</div>${esc(e.note2)}</div>` : '';
    const notes = (note1 || note2) ? `<div class="memory-entry-detail">${note1}${note2}</div>` : '';
    return `<div class="history-item" style="flex-wrap:wrap;align-items:flex-start">
      <div class="history-date">${formatDate(e.date)}</div>
      <div class="history-body" style="flex:1;min-width:160px"><div class="history-title">${arrow}</div>
      <div class="history-detail">Streak: ${e.coupleStreak} · P1: ${e.p1pct}% · P2: ${e.p2pct}%</div>${notes}</div>
      <div class="history-runs ${cls}">${e.closeness}%</div></div>`;
  }).join('') : '<p class="empty-msg">No entries yet. Start your journey together!</p>';
}

// =================== COUPLE ACTIONS ===================

window.markCoupleHabit = function (which, id, result) {
  ensureTodayLogCouple(which);
  const log = which === 1 ? cpState.todayLog1 : cpState.todayLog2;
  if (log.submitted) return;
  const cur = log.habitResults[id];
  log.habitResults[id] = (cur === result) ? null : result;
  if (log.habitResults[id] !== null) {
    showCommentary(result === 'done' ? rand(LOVE_POS) : rand(LOVE_NEG), result === 'done' ? 'love' : 'negative');
  }
  saveCPS();
  renderPartnerHabits(which);
  renderCouplePath();
  renderCoupleStats();
};

function submitPartnerDay(which) {
  ensureTodayLogCouple(which);
  const log = which === 1 ? cpState.todayLog1 : cpState.todayLog2;
  if (log.submitted) return;
  const habits = which === 1 ? cpState.habits1 : cpState.habits2;
  const res = log.habitResults;
  const total = habits.length;
  if (!total) { showCommentary('⚠️ Add some habits first!', 'neutral'); return; }

  // Capture name from input field (live value)
  const nameVal = (document.getElementById(`p${which}-name-input`)?.value || '').trim();
  if (nameVal) { if (which === 1) cpState.name1 = nameVal; else cpState.name2 = nameVal; }

  // Journal is REQUIRED — block submit if empty
  const noteEl = document.getElementById(`p${which}-day-note`);
  const noteVal = (noteEl?.value || '').trim();
  if (!noteVal) {
    showCommentary('📝 Please write how your day went before submitting!', 'neutral');
    if (noteEl) {
      noteEl.classList.add('note-required-shake');
      noteEl.focus();
      setTimeout(() => noteEl.classList.remove('note-required-shake'), 600);
    }
    return;
  }
  log.note = noteVal;

  const done = Object.values(res).filter(v => v === 'done').length;
  // Mark unmarked as missed
  Object.keys(res).forEach(id => { if (res[id] === null) res[id] = 'missed'; });

  // Snapshot for rollback
  const habitSnap = {};
  habits.forEach(h => habitSnap[h.id] = h.streak || 0);
  log._rollback = { habitStreaks: habitSnap, historyDate: todayStr(), note: noteVal };

  // Update streaks
  habits.forEach(h => { h.streak = res[h.id] === 'done' ? (h.streak || 0) + 1 : 0; });
  log.submitted = true;

  // Check if both submitted today → finalize couple day
  const other = which === 1 ? cpState.todayLog2 : cpState.todayLog1;
  if (other && other.submitted) {
    finalizeCoupleDay();
  } else {
    saveCPS();
    renderCouple();
    const nm = cpState['name' + which] || 'Partner ' + which;
    showCommentary(done === total ? `💙 ${nm} nailed it! Waiting for partner...` : `📊 ${nm} submitted. Challenge the other!`, done === total ? 'love' : 'neutral');
  }
}

function finalizeCoupleDay() {
  const closeness = Math.round(calcCloseness() * 100);
  const r1 = cpState.todayLog1 ? cpState.todayLog1.habitResults : {};
  const r2 = cpState.todayLog2 ? cpState.todayLog2.habitResults : {};
  const t1 = cpState.habits1.length, t2 = cpState.habits2.length;
  const d1 = Object.values(r1).filter(v => v === 'done').length;
  const d2 = Object.values(r2).filter(v => v === 'done').length;
  const p1pct = t1 > 0 ? Math.round(d1 / t1 * 100) : 0;
  const p2pct = t2 > 0 ? Math.round(d2 / t2 * 100) : 0;
  const bothPerfect = d1 === t1 && d2 === t2;

  if (bothPerfect) {
    cpState.coupleStreak = (cpState.coupleStreak || 0) + 1;
    cpState.bestCoupleStreak = Math.max(cpState.bestCoupleStreak, cpState.coupleStreak);
  } else {
    cpState.coupleStreak = 0;
  }
  cpState.closeness = closeness;
  cpState.totalDays = (cpState.totalDays || 0) + 1;

  cpState.history.push({
    date: todayStr(), closeness, coupleStreak: cpState.coupleStreak, p1pct, p2pct,
    note1: cpState.todayLog1 ? (cpState.todayLog1.note || '') : '',
    note2: cpState.todayLog2 ? (cpState.todayLog2.note || '') : '',
    name1: cpState.name1 || 'Partner 1',
    name2: cpState.name2 || 'Partner 2',
  });
  saveCPS();
  renderCouple();

  if (bothPerfect) {
    showCommentary(rand(LOVE_POS) + '  💗 Both perfect!', 'love');
  } else if (closeness >= 50) {
    showCommentary(`💗 Getting closer — ${closeness}% together today!`, 'love');
  } else {
    showCommentary(`💔 Distance grew... ${closeness}% closeness. Come back stronger!`, 'negative');
  }
}

function reopenPartnerDay(which) {
  ensureTodayLogCouple(which);
  const log = which === 1 ? cpState.todayLog1 : cpState.todayLog2;
  if (!log.submitted) return;

  const rb = log._rollback;
  const habits = which === 1 ? cpState.habits1 : cpState.habits2;
  if (rb) {
    habits.forEach(h => { if (rb.habitStreaks[h.id] !== undefined) h.streak = rb.habitStreaks[h.id]; });
    // Restore the note to the textarea for editing
    if (rb.note !== undefined) log.note = rb.note;
  }
  log.submitted = false;
  delete log._rollback;

  // If couple day was finalized (both were submitted), partially reverse
  const otherSubmitted = which === 1 ? (cpState.todayLog2 && cpState.todayLog2.submitted) : (cpState.todayLog1 && cpState.todayLog1.submitted);
  if (!otherSubmitted) {
    const idx = cpState.history.length - 1;
    if (idx >= 0 && cpState.history[idx].date === todayStr()) cpState.history.splice(idx, 1);
    if (cpState.coupleStreak > 0) cpState.coupleStreak = Math.max(0, cpState.coupleStreak - 1);
    cpState.totalDays = Math.max(0, (cpState.totalDays || 1) - 1);
  }
  saveCPS();
  renderCouple();
  showCommentary(`✏️ Partner ${which}'s day re-opened! Update and resubmit.`, 'neutral');
}

window.addCoupleHabit = function (which) {
  const inputId = `p${which}-habit-input`;
  const catId = `p${which}-habit-cat`;
  const input = document.getElementById(inputId);
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  const h = { id: uid(), name, category: document.getElementById(catId).value, streak: 0, addedDate: todayStr() };
  if (which === 1) cpState.habits1.push(h); else cpState.habits2.push(h);
  ensureTodayLogCouple(which);
  const log = which === 1 ? cpState.todayLog1 : cpState.todayLog2;
  log.habitResults[h.id] = null;
  input.value = '';
  saveCPS(); renderCouple();
  showCommentary(`💗 "${name}" added!`, 'love');
};

// Names are now entered via input fields; this is kept as a no-op for any stale onclick refs
window.editPartnerName = function (which) {
  const input = document.getElementById(`p${which}-name-input`);
  if (input) { input.focus(); input.select(); }
};

// =================== MODAL ===================
let _mc = null;
function showModal(title, msg, cb) {
  _mc = cb;
  setText('modal-title', title);
  setText('modal-msg', msg);
  document.getElementById('confirm-modal').classList.remove('hidden');
}
function hideModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
  _mc = null;
}

// =================== UTILITIES ===================
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// =================== INIT ===================
document.addEventListener('DOMContentLoaded', () => {
  // Theme switcher
  document.querySelectorAll('.theme-btn').forEach(b => b.addEventListener('click', () => switchTheme(b.dataset.theme)));

  // Cricket tabs
  document.querySelectorAll('[data-app="cricket"].tab-btn').forEach(b => b.addEventListener('click', () => switchTab('cricket', b.dataset.tab)));

  // Couple tabs
  document.querySelectorAll('[data-app="couple"].tab-btn').forEach(b => b.addEventListener('click', () => switchTab('couple', b.dataset.tab)));

  // Cricket: add habit
  document.getElementById('btn-add-habit').addEventListener('click', addHabit);
  document.getElementById('habit-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') addHabit(); });

  // Cricket: submit day (initial setup; updateSubmitBtn overrides onclick)
  document.getElementById('btn-submit-day').addEventListener('click', function () { this.onclick ? this.onclick() : submitDay(); });

  // Cricket: schedule game day
  document.getElementById('btn-schedule-gd').addEventListener('click', scheduleGD);

  // Cricket: player name edit
  document.getElementById('player-name').addEventListener('click', () => {
    const n = prompt('Rename your cricketer:', cState.playerName);
    if (n && n.trim()) { cState.playerName = n.trim().slice(0, 30); saveCS(); renderCricketPlayer(); }
  });

  // Couple: partner habits
  document.getElementById('btn-add-p1-habit').addEventListener('click', () => addCoupleHabit(1));
  document.getElementById('btn-add-p2-habit').addEventListener('click', () => addCoupleHabit(2));
  document.getElementById('p1-habit-input').addEventListener('keydown', e => { if (e.key === 'Enter') addCoupleHabit(1); });
  document.getElementById('p2-habit-input').addEventListener('keydown', e => { if (e.key === 'Enter') addCoupleHabit(2); });

  // Couple: partner name inputs — live update state as you type
  function wireNameInput(which) {
    const el = document.getElementById(`p${which}-name-input`);
    if (!el) return;
    // Seed value from saved state
    const savedName = which === 1 ? cpState.name1 : cpState.name2;
    if (savedName && savedName !== `Partner ${which}`) el.value = savedName;
    el.addEventListener('input', () => {
      const val = el.value.trim().slice(0, 20);
      const display = val || `Partner ${which}`;
      if (which === 1) cpState.name1 = display; else cpState.name2 = display;
      saveCPS();
      // Update SVG label live
      const svgEl = document.getElementById(`p${which}-svg-label`);
      if (svgEl) svgEl.textContent = display.slice(0, 8);
      // Sync all labels across the UI immediately
      syncPartnerTabNames();
      setText(`p${which}-name-display`, display);
    });
  }
  wireNameInput(1); wireNameInput(2);

  // Couple: daily note char counters
  function wireNoteCounter(which) {
    const ta = document.getElementById(`p${which}-day-note`);
    const ct = document.getElementById(`p${which}-note-count`);
    if (!ta || !ct) return;
    ta.addEventListener('input', () => {
      ct.textContent = ta.value.length;
      // Auto-save note to todayLog so it's preserved even if not submitted
      const log = which === 1 ? cpState.todayLog1 : cpState.todayLog2;
      if (log && !log.submitted) { log.note = ta.value; saveCPS(); }
    });
  }
  wireNoteCounter(1); wireNoteCounter(2);

  // Submit partner days (initial; onclick set by renderPartnerHabits)
  document.getElementById('btn-submit-p1').addEventListener('click', function () { this.onclick ? this.onclick() : submitPartnerDay(1); });
  document.getElementById('btn-submit-p2').addEventListener('click', function () { this.onclick ? this.onclick() : submitPartnerDay(2); });

  // Modal
  document.getElementById('modal-confirm').addEventListener('click', () => { if (_mc) _mc(); hideModal(); });
  document.getElementById('modal-cancel').addEventListener('click', hideModal);
  document.getElementById('confirm-modal').addEventListener('click', e => { if (e.target.id === 'confirm-modal') hideModal(); });

  // Initial render
  renderCricket();

  // Welcome
  if (!cState.history.length && !cState.habits.length) {
    setTimeout(() => showCommentary('🏏 Welcome! Add habits to start your innings!', 'neutral'), 800);
  }
});
