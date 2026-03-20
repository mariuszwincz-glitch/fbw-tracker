// MOSQUITO BOOSTER – AI Coach v3.0
// FBW A/B Split, Deterministyczna Progresja, Smart Sugestie
(async function() {
  await DB.open();
  await seedDatabase();

  // State
  let currentScreen = 'dashboard';
  let activeSession = null;
  let timerInterval = null;
  let timerSeconds = 0;
  let timerTotal = 120;
  let timerRunning = false;
  let selectedHistorySession = null;
  let chartExercise = null;
  let toastTimeout = null;
  let swapModalExIdx = null;
  let workoutSummaryData = null;
  let preWorkoutData = null;
  let lastSetTime = null;

  const app = document.getElementById('app');

  // Mosquito SVG icon (inline)
  const MOSQUITO_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(50,50)">
      <ellipse cx="0" cy="8" rx="6" ry="18" fill="currentColor" opacity="0.9"/>
      <ellipse cx="0" cy="-8" rx="4" ry="6" fill="currentColor" opacity="0.85"/>
      <circle cx="0" cy="-16" r="4.5" fill="currentColor" opacity="0.9"/>
      <line x1="0" y1="-20" x2="0" y2="-36" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="-2" y1="-18" x2="-10" y2="-32" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="2" y1="-18" x2="10" y2="-32" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <ellipse cx="-16" cy="-4" rx="14" ry="5" fill="currentColor" opacity="0.25" transform="rotate(-15)"/>
      <ellipse cx="16" cy="-4" rx="14" ry="5" fill="currentColor" opacity="0.25" transform="rotate(15)"/>
      <line x1="-5" y1="0" x2="-20" y2="-10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="5" y1="0" x2="20" y2="-10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="-5" y1="6" x2="-22" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="5" y1="6" x2="22" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="-4" y1="14" x2="-18" y2="22" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="4" y1="14" x2="18" y2="22" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </g>
  </svg>`;

  // ---- NAV ----
  const NAV_ITEMS = [
    { id: 'dashboard', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`, label: 'Start' },
    { id: 'history', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`, label: 'Historia' },
    { id: 'charts', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`, label: 'Wykresy' },
    { id: 'diet', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`, label: 'Dieta' },
    { id: 'settings', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`, label: 'Ustawienia' }
  ];

  const SWAP_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`;

  function renderNav() {
    if (activeSession || currentScreen === 'readiness') return '';
    return `<nav class="bottom-nav">${NAV_ITEMS.map(n =>
      `<button class="nav-item ${currentScreen === n.id ? 'active' : ''}" data-nav="${n.id}">${n.icon}<span>${n.label}</span></button>`
    ).join('')}</nav>`;
  }

  // ---- TOAST ----
  function showToast(text, type = '') {
    if (toastTimeout) clearTimeout(toastTimeout);
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = `toast ${type ? 'toast-' + type : ''}`;
    el.innerHTML = `<span class="toast-text">${text}</span>`;
    document.body.appendChild(el);
    toastTimeout = setTimeout(() => el.remove(), 4000);
  }

  // ---- HELPERS ----
  function formatDate(d) {
    const date = new Date(d);
    const days = ['Niedz.', 'Pon.', 'Wt.', 'Sr.', 'Czw.', 'Pt.', 'Sob.'];
    return `${days[date.getDay()]} ${date.getDate()}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getFullYear()}`;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  async function getLastSessions(n = 5) {
    const all = await DB.getAll('sessions');
    return all.filter(s => s.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, n);
  }

  async function getPrevSessionSets(exerciseId) {
    const sessions = await DB.getAll('sessions');
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const s of sessions) {
      if (!s.completed) continue;
      if (activeSession && s.id === activeSession.id) continue;
      const sets = await DB.getAllByIndex('sessionSets', 'sessionId', s.id);
      const exSets = sets.filter(st => st.exerciseId === exerciseId);
      if (exSets.length > 0) return exSets;
    }
    return [];
  }

  async function getDietGoal() {
    const s = await DB.get('settings', 'dietGoal');
    return s ? s.value : { kcal: [2400, 2600], protein: [140, 160], fat: [60, 90], carbs: [250, 350] };
  }

  async function getTodayDiet() {
    return await DB.getAllByIndex('diet', 'date', today());
  }

  // ---- TIMER ----
  function startTimer(seconds) {
    stopTimer();
    timerRunning = true;
    timerTotal = seconds || 120;
    timerSeconds = timerTotal;
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        stopTimer();
        playBeep();
        showToast('Przerwa skonczona! Czas na serie!', 'progress');
      }
    }, 1000);
    render();
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
  }

  function updateTimerDisplay() {
    const el = document.querySelector('.timer-display');
    if (el) {
      const m = Math.floor(timerSeconds / 60);
      const s = timerSeconds % 60;
      el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }
    const bar = document.querySelector('.timer-progress');
    if (bar) {
      bar.style.width = `${((timerTotal - timerSeconds) / timerTotal) * 100}%`;
    }
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.3;
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.15);
      }
    } catch(e) {}
  }

  // ════════════════════════════════════════════
  // RENDER ROUTER
  // ════════════════════════════════════════════
  async function render() {
    let html = '';
    switch (currentScreen) {
      case 'dashboard': html = await renderDashboard(); break;
      case 'readiness': html = renderReadinessCheck(); break;
      case 'workout': html = await renderWorkout(); break;
      case 'history': html = await renderHistory(); break;
      case 'history-detail': html = await renderHistoryDetail(); break;
      case 'charts': html = await renderCharts(); break;
      case 'diet': html = await renderDiet(); break;
      case 'settings': html = await renderSettings(); break;
    }
    html += renderNav();
    if (timerRunning && currentScreen === 'workout') {
      const m = Math.floor(timerSeconds / 60);
      const s = timerSeconds % 60;
      html += `<div class="timer-bar">
        <button class="timer-btn" onclick="document.dispatchEvent(new CustomEvent('stopTimer'))">Stop</button>
        <div class="timer-display">${m}:${s.toString().padStart(2, '0')}</div>
        <button class="timer-btn" onclick="document.dispatchEvent(new CustomEvent('addTimer', {detail:30}))">+30s</button>
        <div class="timer-progress" style="width:${((timerTotal - timerSeconds) / timerTotal) * 100}%"></div>
      </div>`;
    }
    app.innerHTML = html;
    bindEvents();
  }

  // ════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════
  async function renderDashboard() {
    const nextType = await getNextWorkoutType();
    const mcInfo = await getMicrocycleInfo();
    const sessions = await getLastSessions(1);
    const lastSession = sessions[0];
    const plan = await DB.getAll('plan');
    const planForNext = plan.filter(p => p.workout === nextType).sort((a, b) => a.order - b.order);
    const exercises = await DB.getAll('exercises');
    const exMap = {};
    exercises.forEach(e => { exMap[e.id] = e; });

    // Build pre-workout suggestions
    const suggestions = [];
    for (const p of planForNext) {
      const history = await analyzeExerciseHistory(p.exerciseId, 4);
      const ex = exMap[p.exerciseId];
      const sug = suggestWeight(p.exerciseName, p.exerciseType, p.muscle, history, mcInfo.isDeload);
      suggestions.push({ ...sug, name: p.exerciseName, muscle: p.muscle, type: p.exerciseType, exerciseId: p.exerciseId });
    }

    // Find focus exercise (the one with 'up' direction)
    const focusEx = suggestions.find(s => s.direction === 'up');

    let html = `<div class="dashboard-hero">
      <div class="logo-icon">${MOSQUITO_SVG}</div>
      <h2>MOSQUITO BOOSTER</h2>
      <div class="tagline">AI Coach &middot; FBW A/B Split</div>
    </div>`;

    // Microcycle badge
    html += `<div class="microcycle-badge ${mcInfo.isDeload ? 'deload' : ''}">
      <span>${mcInfo.isDeload ? '&#x1F9CA;' : '&#x1F4C5;'}</span>
      <div>
        <div style="font-weight:800;color:var(--text)">${mcInfo.weekLabel}</div>
        <div style="font-size:11px;margin-top:2px">${mcInfo.sessionsThisWeek}/2 treningow w tym tygodniu</div>
      </div>
    </div>`;

    // Pre-workout focus tip
    if (focusEx) {
      html += `<div class="card" style="border-color:rgba(var(--green-rgb),0.15);background:rgba(var(--green-rgb),0.04)">
        <div style="font-size:12px;color:var(--green);font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">&#x1F3AF; Cel dzisiejszego treningu</div>
        <div style="font-size:15px;font-weight:700">Skup sie na progresji w <strong>${focusEx.name}</strong></div>
        <div style="font-size:12px;color:var(--text2);margin-top:4px">${focusEx.reason}</div>
      </div>`;
    } else if (mcInfo.isDeload) {
      html += `<div class="card" style="border-color:rgba(100,210,255,0.15);background:rgba(100,210,255,0.04)">
        <div style="font-size:12px;color:var(--cyan);font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">&#x1F9CA; DELOAD</div>
        <div style="font-size:15px;font-weight:700">Tydzien regeneracji</div>
        <div style="font-size:12px;color:var(--text2);margin-top:4px">Zmniejszone ciezary i objetosc. Twoje cialo potrzebuje odpoczynku.</div>
      </div>`;
    }

    // Start button
    const typeColor = nextType === 'A' ? 'var(--accent)' : 'var(--green)';
    html += `<button class="start-btn" data-action="start-workout">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>
      TRENING ${nextType}
    </button>`;

    // Next workout preview
    html += `<div class="card"><div class="card-title">&#x1F4CB; Plan treningu ${nextType}</div>`;
    for (const s of suggestions) {
      const color = MUSCLE_COLORS[s.muscle] || '#888';
      const typeLabel = s.type === 'main' ? 'MAIN' : s.type === 'secondary' ? 'SEC' : 'ISO';
      const dirIcon = s.direction === 'up' ? '<span style="color:var(--green)">&#x2B06;</span>' :
                      s.direction === 'down' ? '<span style="color:var(--red)">&#x2B07;</span>' :
                      s.direction === 'deload' ? '<span style="color:var(--cyan)">&#x1F9CA;</span>' :
                      s.direction === 'stagnation' ? '<span style="color:var(--orange)">&#x26A0;</span>' :
                      s.direction === 'hold_failure' ? '<span style="color:var(--red)">&#x1F6D1;</span>' :
                      '<span style="color:var(--text3)">&#x2796;</span>';
      html += `<div class="plan-item">
        <span class="muscle-badge" style="background:${color};font-size:8px;padding:2px 6px">${typeLabel}</span>
        <span class="plan-item-name">${s.name}</span>
        <span class="plan-item-weight">${s.weight}kg &times; ${s.sets}s ${dirIcon}</span>
      </div>`;
    }
    html += `</div>`;

    // Last session
    if (lastSession) {
      const sets = await DB.getAllByIndex('sessionSets', 'sessionId', lastSession.id);
      const totalVol = sets.reduce((s, st) => s + (st.weight||0) * (st.reps||0), 0);
      const totalSets = sets.length;
      const muscles = [...new Set(sets.map(s => {
        const ex = exMap[s.exerciseId];
        return ex ? ex.muscle : '?';
      }))];
      html += `<div class="card">
        <div class="card-title">&#x1F4CA; Ostatni trening</div>
        <div class="last-session-date">${formatDate(lastSession.date)} &middot; Trening ${lastSession.workoutType || '?'}</div>
        <div class="last-session-summary">
          <div class="stat-item"><div class="stat-value">${totalSets}</div><div class="stat-label">Serie</div></div>
          <div class="stat-item"><div class="stat-value">${Math.round(totalVol)}</div><div class="stat-label">Volumen</div></div>
          <div class="stat-item"><div class="stat-value">${muscles.length}</div><div class="stat-label">Partie</div></div>
          <div class="stat-item"><div class="stat-value">${lastSession.duration || '?'}</div><div class="stat-label">Min</div></div>
        </div>
      </div>`;
    }

    // Weekly volume
    const weeklyData = await getWeeklyMuscleVolume();
    if (Object.keys(weeklyData.sets).length > 0) {
      html += `<div class="card"><div class="card-title">&#x1F4AA; Objetosc tygodniowa</div>`;
      for (const [muscle, sets] of Object.entries(weeklyData.sets)) {
        const color = MUSCLE_COLORS[muscle] || '#888';
        const vol = weeklyData.volume[muscle] || 0;
        html += `<div class="volume-row">
          <div class="volume-label"><span class="muscle-badge" style="background:${color};font-size:8px;padding:2px 6px">${muscle}</span></div>
          <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${Math.min(100, sets * 6)}%;background:${color}"></div></div>
          <div class="volume-sets">${sets} serii</div>
          <div class="volume-value">${Math.round(vol)} kg</div>
        </div>`;
      }
      html += `</div>`;
    }

    // Progression cards
    const progSuggestions = suggestions.filter(s => s.direction !== 'start');
    if (progSuggestions.length > 0) {
      html += `<div style="padding:0 16px 4px"><div class="card-title">&#x1F4C8; Progresja cwiczen</div></div>`;
      for (const s of progSuggestions) {
        const iconBg = s.direction === 'up' ? 'rgba(var(--green-rgb),0.15)' :
                       s.direction === 'down' ? 'rgba(var(--red-rgb),0.15)' :
                       s.direction === 'stagnation' ? 'rgba(255,159,10,0.15)' :
                       s.direction === 'hold_failure' ? 'rgba(var(--red-rgb),0.15)' :
                       s.direction === 'deload' ? 'rgba(100,210,255,0.15)' :
                       'rgba(255,255,255,0.05)';
        const icon = s.direction === 'up' ? '&#x2B06;' :
                     s.direction === 'down' ? '&#x2B07;' :
                     s.direction === 'stagnation' ? '&#x26A0;' :
                     s.direction === 'hold_failure' ? '&#x1F6D1;' :
                     s.direction === 'deload' ? '&#x1F9CA;' : '&#x2796;';
        html += `<div class="progression-card">
          <div class="progression-icon" style="background:${iconBg}">${icon}</div>
          <div class="progression-info">
            <div class="progression-name">${s.name}</div>
            <div class="progression-msg">${s.reason}</div>
          </div>
        </div>`;
      }
    }

    return html;
  }

  // ════════════════════════════════════════════
  // READINESS CHECK (pre-workout)
  // ════════════════════════════════════════════
  function renderReadinessCheck() {
    const rd = preWorkoutData || { sleep: 3, stress: 3, soreness: 3 };
    const score = calculateReadiness(rd);
    const label = getReadinessLabel(score);

    function scaleButtons(key, val) {
      const labels = key === 'sleep' ? ['Fatalny', 'Slaby', 'OK', 'Dobry', 'Swietny'] :
                     key === 'stress' ? ['Max', 'Duzy', 'Sredni', 'Maly', 'Zero'] :
                     ['Brutal', 'Duzy', 'Sredni', 'Lekki', 'Brak'];
      return [1,2,3,4,5].map(v => `<button class="scale-btn ${val === v ? 'active' : ''}" data-readiness="${key}" data-val="${v}">
        ${v}<span>${labels[v-1]}</span>
      </button>`).join('');
    }

    return `<div class="readiness-screen">
      <div class="readiness-header">
        <div style="font-size:40px">${label.emoji}</div>
        <h2>Jak sie czujesz?</h2>
        <div class="readiness-subtitle">Pomoz mi dostosowac trening</div>
      </div>
      <div class="readiness-card">
        <div class="readiness-label">&#x1F634; Jakos snu</div>
        <div class="readiness-scale">${scaleButtons('sleep', rd.sleep)}</div>
      </div>
      <div class="readiness-card">
        <div class="readiness-label">&#x1F612; Poziom stresu</div>
        <div class="readiness-scale">${scaleButtons('stress', rd.stress)}</div>
      </div>
      <div class="readiness-card">
        <div class="readiness-label">&#x1F4AA; Bolesnosc miesni</div>
        <div class="readiness-scale">${scaleButtons('soreness', rd.soreness)}</div>
      </div>
      <div class="readiness-result">
        <div class="readiness-score" style="color:${label.color}">Gotowos: ${label.text}</div>
        <div class="readiness-hint">${score <= 2 ? 'Rozwaz lzejszy trening lub odpoczynek' : score >= 4 ? 'Super forma! Mozesz dac z siebie max!' : 'Standardowy trening bez zmian'}</div>
      </div>
      <button class="btn btn-primary" data-action="start-from-readiness" style="margin-bottom:10px">Zacznij trening</button>
      <button class="btn btn-secondary" data-action="skip-workout">Wroc</button>
    </div>`;
  }

  // ════════════════════════════════════════════
  // ACTIVE WORKOUT
  // ════════════════════════════════════════════
  async function renderWorkout() {
    if (!activeSession) return renderDashboard();
    const plan = await DB.getAll('plan');
    const planForType = plan.filter(p => p.workout === activeSession.workoutType).sort((a, b) => a.order - b.order);
    const exercises = await DB.getAll('exercises');
    const exMap = {};
    exercises.forEach(e => { exMap[e.id] = e; });
    const mcInfo = await getMicrocycleInfo();

    // Collect all sets for this session
    const allSessionSets = await DB.getAllByIndex('sessionSets', 'sessionId', activeSession.id);

    // Group exercises in session (may include swapped exercises)
    const sessionExercises = activeSession.exercises || planForType.map(p => ({
      exerciseId: p.exerciseId,
      exerciseName: p.exerciseName,
      muscle: p.muscle,
      exerciseType: p.exerciseType
    }));

    let totalSets = 0, completedSets = 0;
    const exerciseData = [];

    for (let i = 0; i < sessionExercises.length; i++) {
      const se = sessionExercises[i];
      const exSets = allSessionSets.filter(s => s.exerciseId === se.exerciseId).sort((a, b) => a.setNum - b.setNum);
      const history = await analyzeExerciseHistory(se.exerciseId, 4);
      const suggestion = suggestWeight(se.exerciseName, se.exerciseType, se.muscle, history, mcInfo.isDeload);
      const prevSets = await getPrevSessionSets(se.exerciseId);

      totalSets += suggestion.sets;
      completedSets += exSets.filter(s => s.completed).length;

      exerciseData.push({ ...se, sets: exSets, suggestion, prevSets, index: i });
    }

    const progress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
    const elapsed = activeSession.startTime ? Math.floor((Date.now() - activeSession.startTime) / 60000) : 0;

    let html = `<div class="workout-header">
      <button class="back-btn" data-action="end-workout-confirm">&#x2190; Zakoncz</button>
      <div style="text-align:center">
        <div style="font-size:16px;font-weight:800">Trening ${activeSession.workoutType}</div>
        <div style="font-size:11px;color:var(--text3)">${elapsed} min</div>
      </div>
      <div class="workout-progress">${progress}%</div>
    </div>
    <div class="progress-bar" style="margin:0 12px 8px;height:4px"><div class="progress-fill" style="width:${progress}%;background:linear-gradient(90deg,var(--accent),var(--green))"></div></div>`;

    for (const ed of exerciseData) {
      const color = MUSCLE_COLORS[ed.muscle] || '#888';
      const cls = getExerciseClass({ type: ed.exerciseType, muscle: ed.muscle });
      const typeLabel = ed.exerciseType === 'main' ? 'MAIN' : ed.exerciseType === 'secondary' ? 'SEC' : 'ISO';

      html += `<div class="exercise-card">
        <div class="exercise-header">
          <span class="muscle-badge" style="background:${color}">${typeLabel}</span>
          <span class="exercise-name">${ed.exerciseName}</span>
          <button class="swap-btn" data-swap="${ed.index}">${SWAP_ICON} Zamien</button>
        </div>
        <div class="suggestion-bar">${ed.suggestion.reason} &middot; Przerwa: ${Math.floor(ed.suggestion.restTime/60)}:${(ed.suggestion.restTime%60).toString().padStart(2,'0')}</div>
        <div class="set-header-row">
          <div>SET</div><div>PLAN</div><div>KG</div><div>POWT</div><div>RIR</div><div></div>
        </div>`;

      const numSets = ed.suggestion.sets;
      for (let s = 0; s < numSets; s++) {
        const existingSet = ed.sets.find(st => st.setNum === s);
        const isCompleted = existingSet && existingSet.completed;
        const isActive = !isCompleted && (s === 0 || ed.sets.find(st => st.setNum === s - 1 && st.completed));
        const prevSet = ed.prevSets[s];
        const planWeight = ed.suggestion.weight;
        const planReps = ed.suggestion.reps;

        const weight = existingSet ? existingSet.weight : planWeight;
        const reps = existingSet ? existingSet.reps : '';
        const rir = existingSet && existingSet.rir != null ? existingSet.rir : '';

        // Comparison with previous
        let compHtml = '';
        if (prevSet && existingSet && isCompleted) {
          const diff = (existingSet.weight * existingSet.reps) - (prevSet.weight * prevSet.reps);
          if (diff > 0) compHtml = `<span class="comparison better">+${Math.round(diff)}</span>`;
          else if (diff < 0) compHtml = `<span class="comparison worse">${Math.round(diff)}</span>`;
          else compHtml = `<span class="comparison same">=</span>`;
        }

        html += `<div class="set-row ${isCompleted ? 'completed' : ''} ${isActive ? 'active-set' : ''}">
          <div class="set-type" style="color:${color}">${s + 1}</div>
          <div class="set-planned">${planWeight}kg &times; ${planReps}</div>
          <input class="set-input" type="number" inputmode="decimal" step="0.5"
            value="${weight}" data-ex="${ed.index}" data-set="${s}" data-field="weight"
            ${isCompleted ? 'disabled' : ''} placeholder="kg">
          <input class="set-input" type="number" inputmode="numeric"
            value="${reps}" data-ex="${ed.index}" data-set="${s}" data-field="reps"
            ${isCompleted ? 'disabled' : ''} placeholder="reps">
          <select class="rir-select ${isCompleted ? 'done' : ''}" data-ex="${ed.index}" data-set="${s}" data-field="rir"
            ${isCompleted ? 'disabled' : ''}>
            <option value="">RIR</option>
            <option value="0" ${rir === 0 ? 'selected' : ''}>0</option>
            <option value="1" ${rir === 1 ? 'selected' : ''}>1</option>
            <option value="2" ${rir === 2 ? 'selected' : ''}>2</option>
            <option value="3" ${rir === 3 ? 'selected' : ''}>3</option>
            <option value="4" ${rir === 4 ? 'selected' : ''}>4</option>
          </select>
          <button class="set-check ${isCompleted ? 'done' : ''}" data-confirm="${ed.index}" data-set="${s}">
            ${isCompleted ? '&#x2713;' : '&#x25CB;'}
          </button>
        </div>`;

        if (prevSet && !isCompleted) {
          html += `<div class="prev-result">Poprzednio: ${prevSet.weight}kg &times; ${prevSet.reps} ${prevSet.rir != null ? '(RIR '+prevSet.rir+')' : ''} ${compHtml}</div>`;
        } else if (isCompleted && compHtml) {
          html += `<div class="prev-result">Vol delta: ${compHtml}</div>`;
        }
      }

      // Note area
      html += `<div class="note-area">
        <textarea class="note-input" rows="1" placeholder="Notatka (technika, forma, kontuzja...)" data-note-ex="${ed.exerciseId}"></textarea>
      </div>`;

      html += `</div>`;
    }

    html += `<div style="padding:16px">
      <button class="btn btn-primary" data-action="end-workout" style="margin-bottom:10px">&#x1F3C1; Zakoncz trening</button>
    </div>`;
    html += `<div style="height:120px"></div>`;

    return html;
  }

  // ════════════════════════════════════════════
  // HISTORY
  // ════════════════════════════════════════════
  async function renderHistory() {
    const sessions = await getLastSessions(20);
    let html = `<div class="header"><h1>Historia</h1></div>`;

    if (sessions.length === 0) {
      html += `<div class="empty-state"><div class="empty-state-icon">&#x1F4CB;</div><div class="empty-state-text">Brak treningow</div></div>`;
      return html;
    }

    html += `<div class="card" style="padding:0;overflow:hidden">`;
    const exercises = await DB.getAll('exercises');
    const exMap = {};
    exercises.forEach(e => { exMap[e.id] = e; });

    for (const s of sessions) {
      const sets = await DB.getAllByIndex('sessionSets', 'sessionId', s.id);
      const totalVol = sets.reduce((sum, st) => sum + (st.weight||0) * (st.reps||0), 0);
      const totalSets = sets.length;
      const exNames = [...new Set(sets.map(st => {
        const ex = exMap[st.exerciseId];
        return ex ? ex.name : '?';
      }))];
      html += `<div class="session-item" data-session="${s.id}">
        <div class="session-date">${formatDate(s.date)} &middot; Trening ${s.workoutType || '?'} ${s.duration ? '&middot; ' + s.duration + ' min' : ''}</div>
        <div class="session-summary">${totalSets} serii &middot; ${Math.round(totalVol)} kg volume &middot; ${exNames.slice(0,3).join(', ')}${exNames.length > 3 ? '...' : ''}</div>
      </div>`;
    }
    html += `</div>`;
    return html;
  }

  async function renderHistoryDetail() {
    if (!selectedHistorySession) return renderHistory();
    const session = await DB.get('sessions', selectedHistorySession);
    if (!session) return renderHistory();
    const allSets = await DB.getAllByIndex('sessionSets', 'sessionId', session.id);
    const exercises = await DB.getAll('exercises');
    const exMap = {};
    exercises.forEach(e => { exMap[e.id] = e; });

    // Group sets by exercise
    const grouped = {};
    for (const s of allSets) {
      if (!grouped[s.exerciseId]) grouped[s.exerciseId] = [];
      grouped[s.exerciseId].push(s);
    }

    let html = `<div class="header">
      <button class="back-btn" data-action="back-history">&#x2190; Wstecz</button>
      <h1>Trening ${session.workoutType || ''}</h1>
      <div></div>
    </div>
    <div class="card" style="padding:12px 16px">
      <div style="font-size:13px;color:var(--text2)">${formatDate(session.date)} ${session.duration ? '&middot; ' + session.duration + ' min' : ''}</div>
    </div>`;

    for (const [exId, sets] of Object.entries(grouped)) {
      const ex = exMap[exId];
      const exName = ex ? ex.name : 'Cwiczenie #' + exId;
      const color = ex ? (MUSCLE_COLORS[ex.muscle] || '#888') : '#888';
      sets.sort((a, b) => a.setNum - b.setNum);

      html += `<div class="session-detail-ex">
        <h3><span class="muscle-badge" style="background:${color}">${ex ? ex.muscle : '?'}</span> ${exName}</h3>
        <div class="session-sets-grid">`;

      for (const s of sets) {
        html += `<div class="session-set-chip">
          <div style="font-weight:800;font-size:16px">${s.weight}kg</div>
          <div style="font-size:12px;color:var(--text2)">${s.reps} powt ${s.rir != null ? '&middot; RIR ' + s.rir : ''}</div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // Notes
    const notes = await DB.getAll('notes');
    const sessionNotes = notes.filter(n => n.sessionId === session.id);
    if (sessionNotes.length > 0) {
      html += `<div class="card"><div class="card-title">Notatki</div>`;
      for (const n of sessionNotes) {
        const ex = exMap[n.exerciseId];
        html += `<div style="padding:6px 0;font-size:13px"><strong>${ex ? ex.name : '?'}:</strong> ${n.text}</div>`;
      }
      html += `</div>`;
    }

    return html;
  }

  // ════════════════════════════════════════════
  // CHARTS
  // ════════════════════════════════════════════
  async function renderCharts() {
    const exercises = await DB.getAll('exercises');
    const planExercises = exercises.filter(e => e.workout !== null);

    if (!chartExercise && planExercises.length > 0) {
      chartExercise = planExercises[0].id;
    }

    let html = `<div class="header"><h1>Wykresy</h1></div>`;
    html += `<div class="chart-container">
      <select class="chart-select" data-action="change-chart">
        ${planExercises.map(e => `<option value="${e.id}" ${chartExercise === e.id ? 'selected' : ''}>${e.name} (${e.workout})</option>`).join('')}
      </select>
      <div class="chart-canvas" id="chart-canvas"></div>
    </div>`;

    // After render, draw chart
    setTimeout(() => drawChart(chartExercise), 50);
    return html;
  }

  async function drawChart(exerciseId) {
    const container = document.getElementById('chart-canvas');
    if (!container) return;

    const history = await analyzeExerciseHistory(exerciseId, 12);
    if (history.length < 2) {
      container.innerHTML = `<div class="empty-state" style="padding:40px 0"><div class="empty-state-text">Za malo danych (min. 2 treningi)</div></div>`;
      return;
    }

    const weights = history.map(h => h.avgWeight);
    const volumes = history.map(h => h.volume);
    const dates = history.map(h => {
      const d = new Date(h.date);
      return `${d.getDate()}.${d.getMonth()+1}`;
    });

    const maxW = Math.max(...weights);
    const minW = Math.min(...weights);
    const maxV = Math.max(...volumes);
    const rangeW = maxW - minW || 1;

    const W = 340, H = 180, PAD = 30;
    const plotW = W - PAD * 2, plotH = H - PAD * 2;

    const pts = weights.map((w, i) => ({
      x: PAD + (i / (weights.length - 1)) * plotW,
      y: PAD + plotH - ((w - minW) / rangeW) * plotH
    }));

    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    let svg = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--accent)"/>
          <stop offset="100%" stop-color="var(--green)"/>
        </linearGradient>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>`;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = PAD + (i / 4) * plotH;
      const val = maxW - (i / 4) * rangeW;
      svg += `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" class="chart-grid"/>`;
      svg += `<text x="${PAD - 4}" y="${y + 3}" class="chart-label" text-anchor="end">${val.toFixed(1)}</text>`;
    }

    // Date labels
    for (let i = 0; i < dates.length; i++) {
      if (i % Math.ceil(dates.length / 6) === 0 || i === dates.length - 1) {
        svg += `<text x="${pts[i].x}" y="${H - 4}" class="chart-label" text-anchor="middle">${dates[i]}</text>`;
      }
    }

    // Area fill
    svg += `<path d="${pathD} L ${pts[pts.length-1].x} ${PAD + plotH} L ${pts[0].x} ${PAD + plotH} Z" fill="url(#areaGrad)"/>`;
    // Line
    svg += `<path d="${pathD}" class="chart-line"/>`;
    // Dots
    for (const p of pts) {
      svg += `<circle cx="${p.x}" cy="${p.y}" r="4" class="chart-dot"/>`;
    }

    svg += `</svg>`;
    svg += `<div style="text-align:center;padding-top:8px;font-size:11px;color:var(--text3)">Ciezar (kg) &middot; ${history.length} sesji</div>`;

    container.innerHTML = svg;
  }

  // ════════════════════════════════════════════
  // DIET
  // ════════════════════════════════════════════
  async function renderDiet() {
    const goal = await getDietGoal();
    const meals = await getTodayDiet();
    const totals = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
    meals.forEach(m => {
      totals.kcal += m.kcal || 0;
      totals.protein += m.protein || 0;
      totals.fat += m.fat || 0;
      totals.carbs += m.carbs || 0;
    });

    const macros = [
      { key: 'kcal', label: 'Kalorie', unit: '', color: 'var(--accent)', target: goal.kcal },
      { key: 'protein', label: 'Bialko', unit: 'g', color: 'var(--green)', target: goal.protein },
      { key: 'fat', label: 'Tluszcze', unit: 'g', color: 'var(--orange)', target: goal.fat },
      { key: 'carbs', label: 'Wegle', unit: 'g', color: 'var(--blue)', target: goal.carbs }
    ];

    let html = `<div class="header"><h1>Dieta</h1><div class="header-sub">${formatDate(today())}</div></div>`;
    html += `<div class="diet-summary">`;
    for (const m of macros) {
      const pct = m.target[1] > 0 ? Math.min(100, Math.round((totals[m.key] / m.target[1]) * 100)) : 0;
      html += `<div class="macro-card">
        <div class="macro-value" style="color:${m.color}">${totals[m.key]}${m.unit}</div>
        <div class="macro-label">${m.label}</div>
        <div class="progress-bar" style="margin-top:8px"><div class="progress-fill" style="width:${pct}%;background:${m.color}"></div></div>
        <div class="macro-target">${m.target[0]}–${m.target[1]}${m.unit}</div>
      </div>`;
    }
    html += `</div>`;

    // Meals
    html += `<div class="card" style="padding:0;overflow:hidden">`;
    if (meals.length === 0) {
      html += `<div class="empty-state" style="padding:32px"><div class="empty-state-text">Brak posilkow</div></div>`;
    } else {
      for (const m of meals) {
        html += `<div class="meal-item">
          <div><div class="meal-name">${m.name}</div><div class="meal-macros">${m.kcal}kcal &middot; B:${m.protein}g T:${m.fat}g W:${m.carbs}g</div></div>
          <button class="delete-btn" data-delete-meal="${m.id}">&times;</button>
        </div>`;
      }
    }
    html += `</div>`;

    // Add meal form
    html += `<div class="card"><div class="card-title">Dodaj posilek</div>
      <div class="add-meal-form">
        <input type="text" id="meal-name" placeholder="Nazwa">
        <div class="macro-inputs">
          <input type="number" id="meal-kcal" placeholder="kcal" inputmode="numeric">
          <input type="number" id="meal-protein" placeholder="Bialko (g)" inputmode="numeric">
          <input type="number" id="meal-fat" placeholder="Tluszcz (g)" inputmode="numeric">
          <input type="number" id="meal-carbs" placeholder="Wegle (g)" inputmode="numeric">
        </div>
        <button class="btn btn-primary" data-action="add-meal">Dodaj</button>
      </div>
    </div>`;

    return html;
  }

  // ════════════════════════════════════════════
  // SETTINGS
  // ════════════════════════════════════════════
  async function renderSettings() {
    const goal = await getDietGoal();
    const mcInfo = await getMicrocycleInfo();

    let html = `<div class="header"><h1>Ustawienia</h1></div>`;

    html += `<div class="card"><div class="card-title">Mikrocykl</div>
      <div class="setting-row"><span class="setting-label">Aktualny tydzien</span><span style="font-weight:800;color:var(--accent)">${mcInfo.weekLabel}</span></div>
      <div class="setting-row"><span class="setting-label">Reset cyklu</span><button class="btn btn-sm btn-secondary" data-action="reset-cycle">Reset</button></div>
    </div>`;

    html += `<div class="card"><div class="card-title">Cele diety</div>
      <div class="setting-row"><span class="setting-label">Kalorie</span><div style="display:flex;gap:6px;align-items:center"><input class="setting-value" type="number" value="${goal.kcal[0]}" data-diet="kcal-min">–<input class="setting-value" type="number" value="${goal.kcal[1]}" data-diet="kcal-max"></div></div>
      <div class="setting-row"><span class="setting-label">Bialko (g)</span><div style="display:flex;gap:6px;align-items:center"><input class="setting-value" type="number" value="${goal.protein[0]}" data-diet="protein-min">–<input class="setting-value" type="number" value="${goal.protein[1]}" data-diet="protein-max"></div></div>
      <div class="setting-row"><span class="setting-label">Tluszcz (g)</span><div style="display:flex;gap:6px;align-items:center"><input class="setting-value" type="number" value="${goal.fat[0]}" data-diet="fat-min">–<input class="setting-value" type="number" value="${goal.fat[1]}" data-diet="fat-max"></div></div>
      <div class="setting-row"><span class="setting-label">Wegle (g)</span><div style="display:flex;gap:6px;align-items:center"><input class="setting-value" type="number" value="${goal.carbs[0]}" data-diet="carbs-min">–<input class="setting-value" type="number" value="${goal.carbs[1]}" data-diet="carbs-max"></div></div>
      <button class="btn btn-sm btn-primary" data-action="save-diet" style="margin-top:12px">Zapisz</button>
    </div>`;

    html += `<div class="card"><div class="card-title">Dane</div>
      <div class="setting-row"><span class="setting-label">Wyczysc wszystko</span><button class="btn btn-sm btn-danger" data-action="clear-all">Reset</button></div>
    </div>`;

    html += `<div style="text-align:center;padding:20px;font-size:11px;color:var(--text3)">MOSQUITO BOOSTER v3.0<br>AI Coach &middot; FBW A/B Split</div>`;

    return html;
  }

  // ════════════════════════════════════════════
  // WORKOUT SUMMARY (post-workout overlay)
  // ════════════════════════════════════════════
  function renderSummaryOverlay(data) {
    const analysis = analyzeWorkoutPerformance(data.exerciseResults);
    const totalVol = data.totalVolume;
    const totalSets = data.totalSets;
    const duration = data.duration;
    const muscles = data.muscleGroups;

    let html = `<div class="summary-overlay">
      <div class="summary-content">
        <div class="summary-header">
          <span class="summary-icon">${analysis.progressed >= analysis.total * 0.5 ? '&#x1F525;' : analysis.progressed > 0 ? '&#x1F4AA;' : '&#x1F44D;'}</span>
          <div class="summary-title">Trening zakonczony!</div>
          <div class="summary-date">${formatDate(today())} &middot; Trening ${data.workoutType}</div>
        </div>

        <div class="summary-stats">
          <div class="summary-stat"><div class="summary-stat-value">${duration}</div><div class="summary-stat-label">Minut</div></div>
          <div class="summary-stat"><div class="summary-stat-value">${totalSets}</div><div class="summary-stat-label">Serii</div></div>
          <div class="summary-stat"><div class="summary-stat-value">${Math.round(totalVol)}</div><div class="summary-stat-label">Volumen kg</div></div>
          <div class="summary-stat"><div class="summary-stat-value">${muscles.length}</div><div class="summary-stat-label">Partii</div></div>
        </div>

        <div class="summary-section">
          <div class="summary-section-title">Analiza AI</div>`;

    for (const tip of analysis.tips) {
      html += `<div class="summary-insight">
        <div class="summary-insight-icon">${tip.icon}</div>
        <div class="summary-insight-text">${tip.text}</div>
      </div>`;
    }
    html += `</div>`;

    // Per-exercise breakdown
    html += `<div class="summary-section"><div class="summary-section-title">Cwiczenia</div>`;
    for (const er of data.exerciseResults) {
      const color = MUSCLE_COLORS[er.muscle] || '#888';
      const dirIcon = er.direction === 'up' ? '&#x2B06;' : er.direction === 'down' ? '&#x2B07;' : '&#x2796;';
      const dirColor = er.direction === 'up' ? 'var(--green)' : er.direction === 'down' ? 'var(--red)' : 'var(--text3)';
      html += `<div class="summary-exercise">
        <span class="muscle-badge" style="background:${color}">${er.muscle.slice(0,3)}</span>
        <div class="summary-ex-info">
          <div class="summary-ex-name">${er.name}</div>
          <div class="summary-ex-detail">${er.setsCount}s &middot; Maks: ${er.maxWeight}kg &times; ${er.maxReps} ${er.avgRir != null ? '&middot; RIR ' + er.avgRir.toFixed(1) : ''}</div>
        </div>
        <span style="color:${dirColor};font-size:18px">${dirIcon}</span>
      </div>`;
    }
    html += `</div>`;

    // Next workout suggestion
    html += `<div class="summary-section" style="border-color:rgba(var(--green-rgb),0.15);background:rgba(var(--green-rgb),0.03)">
      <div class="summary-section-title" style="color:var(--green)">&#x1F4CB; Nastepny trening</div>
      <div class="summary-insight">
        <div class="summary-insight-icon">&#x1F4C5;</div>
        <div class="summary-insight-text">Nastepny: <strong>Trening ${data.workoutType === 'A' ? 'B' : 'A'}</strong><br>
          <span style="font-size:12px;color:var(--text3)">Zaplanuj za 2-3 dni. Daj cialu odpoczac!</span>
        </div>
      </div>
    </div>`;

    html += `<button class="summary-close-btn" data-action="close-summary">ZAMKNIJ</button>
      </div>
    </div>`;
    return html;
  }

  // ════════════════════════════════════════════
  // SWAP MODAL
  // ════════════════════════════════════════════
  async function renderSwapModal(exIdx) {
    const se = activeSession.exercises[exIdx];
    const exercises = await DB.getAll('exercises');
    const alternatives = exercises.filter(e => e.muscle === se.muscle && e.id !== se.exerciseId);

    let html = `<div class="swap-modal-overlay" data-action="close-swap">
      <div class="swap-modal" onclick="event.stopPropagation()">
        <div class="swap-modal-title">Zamien cwiczenie</div>
        <div class="swap-modal-subtitle">${se.exerciseName} &middot; ${se.muscle}</div>`;

    for (const alt of alternatives) {
      const isCurrent = alt.id === se.exerciseId;
      html += `<div class="swap-option ${isCurrent ? 'current' : ''}" data-swap-to="${alt.id}" data-swap-name="${alt.name}">
        <span class="swap-option-name">${alt.name}</span>
        <span class="swap-option-equip">${alt.equipment || ''}</span>
      </div>`;
    }

    html += `<div class="swap-custom">
      <div class="swap-custom-label">Lub wpisz wlasna nazwe:</div>
      <div class="swap-custom-row">
        <input class="swap-custom-input" type="text" placeholder="Np. Maszyna przy lustrze" id="custom-swap-name">
        <button class="btn btn-sm btn-primary" data-action="custom-swap">OK</button>
      </div>
    </div>
    <button class="swap-cancel" data-action="close-swap">Anuluj</button>
    </div></div>`;

    return html;
  }

  // ════════════════════════════════════════════
  // EVENTS
  // ════════════════════════════════════════════
  function bindEvents() {
    // Nav
    app.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        currentScreen = el.dataset.nav;
        selectedHistorySession = null;
        render();
      });
    });

    // Actions
    app.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', async () => {
        const action = el.dataset.action;

        if (action === 'start-workout') {
          preWorkoutData = { sleep: 3, stress: 3, soreness: 3 };
          currentScreen = 'readiness';
          render();
        }

        else if (action === 'start-from-readiness') {
          await startWorkout();
        }

        else if (action === 'skip-workout') {
          currentScreen = 'dashboard';
          preWorkoutData = null;
          render();
        }

        else if (action === 'end-workout') {
          await endWorkout();
        }

        else if (action === 'end-workout-confirm') {
          if (confirm('Zakonczyc trening?')) {
            await endWorkout();
          }
        }

        else if (action === 'close-summary') {
          workoutSummaryData = null;
          currentScreen = 'dashboard';
          render();
        }

        else if (action === 'back-history') {
          currentScreen = 'history';
          selectedHistorySession = null;
          render();
        }

        else if (action === 'add-meal') {
          await addMeal();
        }

        else if (action === 'save-diet') {
          await saveDietGoal();
        }

        else if (action === 'reset-cycle') {
          if (confirm('Resetowac mikrocykl?')) {
            await DB.put('settings', { key: 'microcycle', value: { week: 1, startDate: today() } });
            showToast('Mikrocykl zresetowany');
            render();
          }
        }

        else if (action === 'clear-all') {
          if (confirm('UWAGA: Usunie wszystkie dane! Kontynuowac?')) {
            indexedDB.deleteDatabase(DB_NAME);
            location.reload();
          }
        }

        else if (action === 'close-swap') {
          const overlay = document.querySelector('.swap-modal-overlay');
          if (overlay) overlay.remove();
          swapModalExIdx = null;
        }

        else if (action === 'custom-swap') {
          const nameInput = document.getElementById('custom-swap-name');
          if (nameInput && nameInput.value.trim()) {
            await doCustomSwap(swapModalExIdx, nameInput.value.trim());
          }
        }

        else if (action === 'change-chart') {
          // handled by select event
        }
      });
    });

    // Chart select
    const chartSelect = app.querySelector('.chart-select');
    if (chartSelect) {
      chartSelect.addEventListener('change', () => {
        chartExercise = parseInt(chartSelect.value);
        drawChart(chartExercise);
      });
    }

    // Session items
    app.querySelectorAll('[data-session]').forEach(el => {
      el.addEventListener('click', () => {
        selectedHistorySession = parseInt(el.dataset.session);
        currentScreen = 'history-detail';
        render();
      });
    });

    // Delete meal
    app.querySelectorAll('[data-delete-meal]').forEach(el => {
      el.addEventListener('click', async () => {
        await DB.delete('diet', parseInt(el.dataset.deleteMeal));
        render();
      });
    });

    // Swap buttons
    app.querySelectorAll('[data-swap]').forEach(el => {
      el.addEventListener('click', async () => {
        swapModalExIdx = parseInt(el.dataset.swap);
        const modalHtml = await renderSwapModal(swapModalExIdx);
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
        bindSwapModalEvents();
      });
    });

    // Set confirm buttons
    app.querySelectorAll('[data-confirm]').forEach(el => {
      el.addEventListener('click', async () => {
        const exIdx = parseInt(el.dataset.confirm);
        const setNum = parseInt(el.dataset.set);
        await confirmSet(exIdx, setNum);
      });
    });

    // Set inputs (auto-save on change)
    app.querySelectorAll('.set-input, .rir-select').forEach(el => {
      el.addEventListener('change', () => {
        // Values saved on confirm
      });
    });

    // Readiness scale buttons
    app.querySelectorAll('[data-readiness]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.readiness;
        const val = parseInt(el.dataset.val);
        if (preWorkoutData) {
          preWorkoutData[key] = val;
          render();
        }
      });
    });

    // Note inputs
    app.querySelectorAll('.note-input').forEach(el => {
      // Load existing note
      const exId = parseInt(el.dataset.noteEx);
      if (activeSession) {
        DB.getAll('notes').then(notes => {
          const existing = notes.find(n => n.sessionId === activeSession.id && n.exerciseId === exId);
          if (existing) el.value = existing.text;
        });
      }
    });

    // Timer events
    document.addEventListener('stopTimer', () => { stopTimer(); render(); });
    document.addEventListener('addTimer', (e) => { timerSeconds += e.detail; timerTotal += e.detail; });
  }

  function bindSwapModalEvents() {
    document.querySelectorAll('.swap-modal-overlay [data-swap-to]').forEach(el => {
      el.addEventListener('click', async () => {
        const newExId = parseInt(el.dataset.swapTo);
        const newExName = el.dataset.swapName;
        await doSwap(swapModalExIdx, newExId, newExName);
      });
    });

    document.querySelectorAll('.swap-modal-overlay [data-action="close-swap"]').forEach(el => {
      el.addEventListener('click', () => {
        const overlay = document.querySelector('.swap-modal-overlay');
        if (overlay) overlay.remove();
        swapModalExIdx = null;
      });
    });

    document.querySelectorAll('.swap-modal-overlay [data-action="custom-swap"]').forEach(el => {
      el.addEventListener('click', async () => {
        const nameInput = document.getElementById('custom-swap-name');
        if (nameInput && nameInput.value.trim()) {
          await doCustomSwap(swapModalExIdx, nameInput.value.trim());
        }
      });
    });
  }

  // ════════════════════════════════════════════
  // WORKOUT ACTIONS
  // ════════════════════════════════════════════

  async function startWorkout() {
    const nextType = await getNextWorkoutType();
    const plan = await DB.getAll('plan');
    const planForType = plan.filter(p => p.workout === nextType).sort((a, b) => a.order - b.order);
    const mcInfo = await getMicrocycleInfo();

    // Create session
    const sessionId = await DB.add('sessions', {
      date: today(),
      workoutType: nextType,
      startTime: Date.now(),
      completed: false,
      readiness: preWorkoutData ? calculateReadiness(preWorkoutData) : 3,
      readinessData: preWorkoutData
    });

    const exercises = planForType.map(p => ({
      exerciseId: p.exerciseId,
      exerciseName: p.exerciseName,
      muscle: p.muscle,
      exerciseType: p.exerciseType
    }));

    activeSession = await DB.get('sessions', sessionId);
    activeSession.exercises = exercises;
    await DB.put('sessions', activeSession);

    currentScreen = 'workout';
    lastSetTime = null;
    preWorkoutData = null;
    render();
  }

  async function confirmSet(exIdx, setNum) {
    const se = activeSession.exercises[exIdx];
    const row = app.querySelector(`.set-row .set-check[data-confirm="${exIdx}"][data-set="${setNum}"]`)?.closest('.set-row');
    if (!row) return;

    const weightInput = row.querySelector('[data-field="weight"]');
    const repsInput = row.querySelector('[data-field="reps"]');
    const rirSelect = row.querySelector('[data-field="rir"]');

    const weight = parseFloat(weightInput?.value) || 0;
    const reps = parseInt(repsInput?.value) || 0;
    const rir = rirSelect?.value !== '' ? parseInt(rirSelect.value) : null;

    if (weight <= 0 || reps <= 0) {
      showToast('Wpisz ciezar i powtorzenia!', 'warning');
      return;
    }

    // Check if set already exists
    const allSets = await DB.getAllByIndex('sessionSets', 'sessionId', activeSession.id);
    const existing = allSets.find(s => s.exerciseId === se.exerciseId && s.setNum === setNum);

    if (existing && existing.completed) return; // Already done

    const setData = {
      sessionId: activeSession.id,
      exerciseId: se.exerciseId,
      setNum,
      weight,
      reps,
      rir,
      completed: true,
      timestamp: Date.now()
    };

    if (existing) {
      setData.id = existing.id;
      await DB.put('sessionSets', setData);
    } else {
      await DB.add('sessionSets', setData);
    }

    // Auto-track rest time
    if (lastSetTime) {
      const restSec = Math.floor((Date.now() - lastSetTime) / 1000);
      if (restSec > 10 && restSec < 600) {
        // Could store rest times for analysis
      }
    }
    lastSetTime = Date.now();

    // Start rest timer based on exercise type
    const cls = getExerciseClass({ type: se.exerciseType, muscle: se.muscle });
    startTimer(cls.restTime);

    // RIR feedback
    if (rir === 0) {
      showToast('RIR 0 - porazka! Nastepnym razem utrzymaj ciezar.', 'warning');
    } else if (rir !== null && rir <= 1) {
      showToast(`Seria ${setNum + 1} &#x2713; &middot; RIR ${rir} - blisko limitu!`, 'progress');
    } else {
      showToast(`Seria ${setNum + 1} &#x2713; &middot; ${weight}kg &times; ${reps}`, 'progress');
    }

    render();
  }

  async function endWorkout() {
    if (!activeSession) return;

    const allSets = await DB.getAllByIndex('sessionSets', 'sessionId', activeSession.id);
    const completedSets = allSets.filter(s => s.completed);

    if (completedSets.length === 0) {
      if (confirm('Brak zalogowanych serii. Usunac trening?')) {
        await DB.delete('sessions', activeSession.id);
        activeSession = null;
        stopTimer();
        currentScreen = 'dashboard';
        render();
      }
      return;
    }

    // Save notes
    const noteInputs = app.querySelectorAll('.note-input');
    for (const el of noteInputs) {
      const exId = parseInt(el.dataset.noteEx);
      const text = el.value.trim();
      if (text) {
        const existing = (await DB.getAll('notes')).find(n => n.sessionId === activeSession.id && n.exerciseId === exId);
        if (existing) {
          existing.text = text;
          await DB.put('notes', existing);
        } else {
          await DB.add('notes', { sessionId: activeSession.id, exerciseId: exId, text });
        }
      }
    }

    // Calculate duration
    const duration = activeSession.startTime ? Math.round((Date.now() - activeSession.startTime) / 60000) : 0;
    activeSession.completed = true;
    activeSession.duration = duration;
    await DB.put('sessions', activeSession);

    // Build summary
    const exercises = await DB.getAll('exercises');
    const exMap = {};
    exercises.forEach(e => { exMap[e.id] = e; });

    const exerciseResults = [];
    const muscleGroups = new Set();
    let totalVolume = 0;

    for (const se of activeSession.exercises) {
      const exSets = completedSets.filter(s => s.exerciseId === se.exerciseId);
      if (exSets.length === 0) continue;

      const maxWeight = Math.max(...exSets.map(s => s.weight));
      const maxReps = Math.max(...exSets.filter(s => s.weight === maxWeight).map(s => s.reps));
      const rirs = exSets.filter(s => s.rir != null).map(s => s.rir);
      const avgRir = rirs.length > 0 ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
      const vol = exSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      totalVolume += vol;
      muscleGroups.add(se.muscle);

      // Determine direction vs previous
      const prevSets = await getPrevSessionSets(se.exerciseId);
      let direction = 'maintain';
      if (prevSets.length > 0) {
        const prevVol = prevSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        if (vol > prevVol * 1.02) direction = 'up';
        else if (vol < prevVol * 0.95) direction = 'down';
      }

      exerciseResults.push({
        name: se.exerciseName,
        muscle: se.muscle,
        setsCount: exSets.length,
        maxWeight,
        maxReps,
        avgRir,
        volume: vol,
        direction
      });
    }

    workoutSummaryData = {
      workoutType: activeSession.workoutType,
      duration,
      totalSets: completedSets.length,
      totalVolume,
      muscleGroups: [...muscleGroups],
      exerciseResults
    };

    stopTimer();
    activeSession = null;

    // Show summary overlay
    const overlay = document.createElement('div');
    overlay.innerHTML = renderSummaryOverlay(workoutSummaryData);
    document.body.appendChild(overlay.firstElementChild);

    // Bind close
    document.querySelector('.summary-close-btn')?.addEventListener('click', () => {
      document.querySelector('.summary-overlay')?.remove();
      workoutSummaryData = null;
      currentScreen = 'dashboard';
      render();
    });
  }

  async function doSwap(exIdx, newExId, newExName) {
    const overlay = document.querySelector('.swap-modal-overlay');
    if (overlay) overlay.remove();

    const ex = await DB.get('exercises', newExId);
    activeSession.exercises[exIdx] = {
      exerciseId: newExId,
      exerciseName: newExName,
      muscle: ex ? ex.muscle : activeSession.exercises[exIdx].muscle,
      exerciseType: ex ? ex.type : activeSession.exercises[exIdx].exerciseType
    };
    await DB.put('sessions', activeSession);
    swapModalExIdx = null;
    showToast(`Zamieniono na: ${newExName}`);
    render();
  }

  async function doCustomSwap(exIdx, customName) {
    const overlay = document.querySelector('.swap-modal-overlay');
    if (overlay) overlay.remove();

    const oldEx = activeSession.exercises[exIdx];
    // Create new exercise in DB
    const newId = await DB.add('exercises', {
      name: customName,
      muscle: oldEx.muscle,
      equipment: 'custom',
      type: oldEx.exerciseType,
      workout: null,
      order: 99
    });

    activeSession.exercises[exIdx] = {
      exerciseId: newId,
      exerciseName: customName,
      muscle: oldEx.muscle,
      exerciseType: oldEx.exerciseType
    };
    await DB.put('sessions', activeSession);
    swapModalExIdx = null;
    showToast(`Dodano: ${customName}`);
    render();
  }

  async function addMeal() {
    const name = document.getElementById('meal-name')?.value?.trim();
    const kcal = parseInt(document.getElementById('meal-kcal')?.value) || 0;
    const protein = parseInt(document.getElementById('meal-protein')?.value) || 0;
    const fat = parseInt(document.getElementById('meal-fat')?.value) || 0;
    const carbs = parseInt(document.getElementById('meal-carbs')?.value) || 0;

    if (!name) { showToast('Wpisz nazwe posilku', 'warning'); return; }

    await DB.add('diet', { date: today(), name, kcal, protein, fat, carbs, time: new Date().toISOString() });
    showToast(`Dodano: ${name}`);
    render();
  }

  async function saveDietGoal() {
    const getVal = (sel) => parseInt(app.querySelector(`[data-diet="${sel}"]`)?.value) || 0;
    const goal = {
      kcal: [getVal('kcal-min'), getVal('kcal-max')],
      protein: [getVal('protein-min'), getVal('protein-max')],
      fat: [getVal('fat-min'), getVal('fat-max')],
      carbs: [getVal('carbs-min'), getVal('carbs-max')]
    };
    await DB.put('settings', { key: 'dietGoal', value: goal });
    showToast('Cele diety zapisane!');
  }

  // ════════════════════════════════════════════
  // INITIAL RENDER
  // ════════════════════════════════════════════
  render();
})();
