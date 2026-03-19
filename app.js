// MOSQUITO BOOSTER – Main Application v2.0
// Smart Training Engine with RIR, Readiness, Microcycles
(async function() {
  await DB.open();
  await seedDatabase();

  // State
  let currentScreen = 'dashboard';
  let activeSession = null;
  let timerInterval = null;
  let timerSeconds = 0;
  let timerTotal = 180;
  let timerRunning = false;
  let selectedHistorySession = null;
  let chartExercise = null;
  let toastTimeout = null;
  let editingSession = null;
  let swapModalExIdx = null;
  let workoutSummaryData = null;
  let preWorkoutData = null; // readiness check data
  let setRestTimes = []; // auto-tracked rest between sets
  let lastSetTime = null; // timestamp of last completed set

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
    return all.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, n);
  }

  async function getSessionSetsGrouped(exerciseId, limit = 5) {
    const sessions = await DB.getAll('sessions');
    sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
    const groups = [];
    for (const s of sessions.slice(-limit * 2)) {
      const sets = await DB.getAllByIndex('sessionSets', 'sessionId', s.id);
      const exSets = sets.filter(st => st.exerciseId === exerciseId);
      if (exSets.length > 0) groups.push(exSets);
      if (groups.length >= limit) break;
    }
    return groups;
  }

  async function getPrevSessionSets(exerciseId) {
    const sessions = await DB.getAll('sessions');
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const s of sessions) {
      if (activeSession && s.id === activeSession.id) continue;
      const sets = await DB.getAllByIndex('sessionSets', 'sessionId', s.id);
      const exSets = sets.filter(st => st.exerciseId === exerciseId);
      if (exSets.length > 0) return exSets;
    }
    return [];
  }

  async function getRestTime() {
    const s = await DB.get('settings', 'restTime');
    return s ? s.value : 180;
  }

  async function getDietGoal() {
    const s = await DB.get('settings', 'dietGoal');
    return s ? s.value : { kcal: [2400, 2600], protein: [140, 160], fat: [60, 90], carbs: [250, 350] };
  }

  async function getTodayDiet() {
    return await DB.getAllByIndex('diet', 'date', today());
  }

  // ---- TIMER ----
  function startTimer() {
    stopTimer();
    timerRunning = true;
    timerSeconds = timerTotal;
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        stopTimer();
        playBeep();
        showToast('Przerwa skonczona!', 'progress');
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

  // ---- RENDER ----
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
      case 'plan-editor': html = await renderPlanEditor(); break;
    }
    html += renderNav();
    if (timerRunning && currentScreen === 'workout') {
      const m = Math.floor(timerSeconds / 60);
      const s = timerSeconds % 60;
      html += `<div class="timer-bar">
        <button class="timer-btn" data-action="timer-skip">Pomin</button>
        <div class="timer-display">${m}:${s.toString().padStart(2, '0')}</div>
        <button class="timer-btn" data-action="timer-add30">+30s</button>
        <div class="timer-progress" style="width: ${((timerTotal - timerSeconds) / timerTotal) * 100}%"></div>
      </div>`;
    }
    app.innerHTML = html;
    bindEvents();
  }

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  async function renderDashboard() {
    const plan = await DB.getAll('plan');
    const sessions = await getLastSessions(1);
    const lastSession = sessions[0];
    const dietEntries = await getTodayDiet();
    const dietGoal = await getDietGoal();
    const mcInfo = await getMicrocycleInfo();
    const muscleVol = await getWeeklyMuscleVolume();

    const totalProtein = dietEntries.reduce((s, e) => s + (e.protein || 0), 0);
    const proteinTarget = dietGoal.protein[1];
    const proteinPct = Math.min(100, Math.round((totalProtein / proteinTarget) * 100));

    // Microcycle badge
    const mcBadge = mcInfo.isDeload
      ? `<div class="microcycle-badge deload"><span>&#x1F4A4;</span> TYDZIEŃ DELOAD &middot; -15% ciężaru</div>`
      : `<div class="microcycle-badge"><span>&#x1F4AA;</span> ${mcInfo.weekLabel} &middot; ${mcInfo.sessionsThisWeek}/3 treningów</div>`;

    let lastSummary = '';
    if (lastSession) {
      const sets = await DB.getAllByIndex('sessionSets', 'sessionId', lastSession.id);
      const totalSets = sets.length;
      const totalVolume = sets.reduce((s, st) => s + (st.weight || 0) * (st.reps || 0), 0);
      const avgRir = sets.filter(s => s.rir != null).map(s => s.rir);
      const rirDisplay = avgRir.length > 0 ? (avgRir.reduce((a, b) => a + b, 0) / avgRir.length).toFixed(1) : '-';
      lastSummary = `
        <div class="card">
          <div class="card-title">Ostatnia sesja</div>
          <div class="last-session-date">${formatDate(lastSession.date)}</div>
          <div class="last-session-summary">
            <div class="stat-item"><div class="stat-value">${totalSets}</div><div class="stat-label">Serii</div></div>
            <div class="stat-item"><div class="stat-value">${Math.round(totalVolume)}</div><div class="stat-label">Wolumen</div></div>
            <div class="stat-item"><div class="stat-value">${rirDisplay}</div><div class="stat-label">Śr. RIR</div></div>
            <div class="stat-item"><div class="stat-value">${lastSession.duration ? Math.round(lastSession.duration / 60) + 'm' : '-'}</div><div class="stat-label">Czas</div></div>
          </div>
        </div>`;
    }

    // Weekly muscle volume
    let volumeHtml = '';
    const muscleNames = Object.keys(muscleVol.volume);
    if (muscleNames.length > 0) {
      const maxVol = Math.max(...Object.values(muscleVol.volume));
      volumeHtml = `<div class="card">
        <div class="card-title">Objętość tygodniowa</div>`;
      for (const muscle of muscleNames) {
        const vol = muscleVol.volume[muscle];
        const sets = muscleVol.sets[muscle] || 0;
        const pct = maxVol > 0 ? Math.round((vol / maxVol) * 100) : 0;
        volumeHtml += `<div class="volume-row">
          <div class="volume-label">
            <span class="muscle-badge" style="background:${MUSCLE_COLORS[muscle] || '#666'};font-size:9px">${muscle}</span>
            <span class="volume-sets">${sets} serii</span>
          </div>
          <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${pct}%;background:${MUSCLE_COLORS[muscle] || '#666'}"></div></div>
          <span class="volume-value">${Math.round(vol)}kg</span>
        </div>`;
      }
      volumeHtml += `</div>`;
    }

    // Progressions
    let progressionHtml = '';
    const plan2 = await DB.getAll('plan');
    const planExIds = plan2.map(p => p.exerciseId);
    const exercises = await DB.getAll('exercises');
    for (const ex of exercises) {
      if (!planExIds.includes(ex.id)) continue;
      const history = await analyzeExerciseHistory(ex.id, 5);
      const suggestion = suggestWeight(ex.name, history);
      if (suggestion && suggestion.direction !== 'maintain') {
        const iconMap = { up: '&#x2191;', down: '&#x2193;', stagnation: '&#x26A0;', fatigue: '&#x23F3;', reps_first: '&#x1F4AA;' };
        const colorMap = { up: 'rgba(34,197,94,0.15)', down: 'rgba(239,68,68,0.15)', stagnation: 'rgba(245,158,11,0.15)', fatigue: 'rgba(100,210,255,0.15)', reps_first: 'rgba(168,85,247,0.15)' };
        progressionHtml += `
          <div class="progression-card">
            <div class="progression-icon" style="background:${colorMap[suggestion.direction] || colorMap.up}">
              ${iconMap[suggestion.direction] || '&#x2191;'}
            </div>
            <div class="progression-info">
              <div class="progression-name">${ex.name}</div>
              <div class="progression-msg">${suggestion.reason}</div>
            </div>
          </div>`;
      }
    }

    return `
      <div class="dashboard-hero">
        <div class="logo-icon" style="color:var(--accent)">${MOSQUITO_SVG}</div>
        <h2>MOSQUITO BOOSTER</h2>
        <div class="tagline">${plan.length} cwiczen w planie</div>
      </div>
      ${mcBadge}
      <button class="start-btn" data-action="start-readiness">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Rozpocznij trening
      </button>
      <div class="card">
        <div class="card-title">Bialko dzis</div>
        <div class="protein-bar-wrap">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${proteinPct}%; background: ${proteinPct >= 80 ? 'var(--green)' : 'var(--orange)'}"></div>
          </div>
          <div class="protein-value">${totalProtein}g / ${proteinTarget}g</div>
        </div>
      </div>
      ${progressionHtml}
      ${lastSummary}
      ${volumeHtml}
      <div class="card">
        <div class="card-title">Dzisiejszy plan</div>
        ${await renderTodayPlan()}
      </div>`;
  }

  async function renderTodayPlan() {
    const plan = await DB.getAll('plan');
    plan.sort((a, b) => a.order - b.order);
    let html = '';
    for (const p of plan) {
      const history = await analyzeExerciseHistory(p.exerciseId, 3);
      const suggestion = suggestWeight(p.exerciseName, history);
      const prevSets = await getPrevSessionSets(p.exerciseId);
      const maxSet = prevSets.find(s => s.type === 'max');
      const workingSet = prevSets.find(s => s.type === 'working');
      const ref = maxSet || workingSet;

      let suggestHint = '';
      if (suggestion && suggestion.direction === 'up') {
        suggestHint = `<span class="plan-suggest up">&#x2191; ${suggestion.weight}kg</span>`;
      } else if (suggestion && suggestion.direction === 'down') {
        suggestHint = `<span class="plan-suggest down">&#x2193; ${suggestion.weight}kg</span>`;
      }

      html += `<div class="plan-item">
        <span class="muscle-badge" style="background:${MUSCLE_COLORS[p.muscle] || '#666'}">${p.muscle}</span>
        <span class="plan-item-name">${p.exerciseName}</span>
        ${suggestHint}
        <span class="plan-item-weight">${ref ? ref.weight + 'kg' : p.sets[p.sets.length-1].weight + 'kg'}</span>
      </div>`;
    }
    return html;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRE-WORKOUT READINESS CHECK
  // Pytamy: sen, stres, bolesnosc miesni -> readiness score
  // ═══════════════════════════════════════════════════════════════
  function renderReadinessCheck() {
    return `
      <div class="readiness-screen">
        <div class="readiness-header">
          <button class="back-btn" data-action="back-dashboard">&#x2190;</button>
          <h2>Jak się dziś czujesz?</h2>
          <p class="readiness-subtitle">Dostosujemy trening do Twojej formy</p>
        </div>

        <div class="readiness-card">
          <div class="readiness-label">&#x1F634; Sen (ostatnia noc)</div>
          <div class="readiness-scale" data-field="sleep">
            <button class="scale-btn ${preWorkoutData?.sleep === 1 ? 'active' : ''}" data-value="1">1<span>Fatalny</span></button>
            <button class="scale-btn ${preWorkoutData?.sleep === 2 ? 'active' : ''}" data-value="2">2<span>Slaby</span></button>
            <button class="scale-btn ${preWorkoutData?.sleep === 3 ? 'active' : ''}" data-value="3">3<span>OK</span></button>
            <button class="scale-btn ${preWorkoutData?.sleep === 4 ? 'active' : ''}" data-value="4">4<span>Dobry</span></button>
            <button class="scale-btn ${preWorkoutData?.sleep === 5 ? 'active' : ''}" data-value="5">5<span>Super</span></button>
          </div>
        </div>

        <div class="readiness-card">
          <div class="readiness-label">&#x1F4A5; Stres</div>
          <div class="readiness-scale" data-field="stress">
            <button class="scale-btn ${preWorkoutData?.stress === 1 ? 'active' : ''}" data-value="1">1<span>Zero</span></button>
            <button class="scale-btn ${preWorkoutData?.stress === 2 ? 'active' : ''}" data-value="2">2<span>Lekki</span></button>
            <button class="scale-btn ${preWorkoutData?.stress === 3 ? 'active' : ''}" data-value="3">3<span>Sredni</span></button>
            <button class="scale-btn ${preWorkoutData?.stress === 4 ? 'active' : ''}" data-value="4">4<span>Duzy</span></button>
            <button class="scale-btn ${preWorkoutData?.stress === 5 ? 'active' : ''}" data-value="5">5<span>Max</span></button>
          </div>
        </div>

        <div class="readiness-card">
          <div class="readiness-label">&#x1F525; Bolesnosc miesni (DOMS)</div>
          <div class="readiness-scale" data-field="soreness">
            <button class="scale-btn ${preWorkoutData?.soreness === 1 ? 'active' : ''}" data-value="1">1<span>Brak</span></button>
            <button class="scale-btn ${preWorkoutData?.soreness === 2 ? 'active' : ''}" data-value="2">2<span>Lekka</span></button>
            <button class="scale-btn ${preWorkoutData?.soreness === 3 ? 'active' : ''}" data-value="3">3<span>Srednia</span></button>
            <button class="scale-btn ${preWorkoutData?.soreness === 4 ? 'active' : ''}" data-value="4">4<span>Duza</span></button>
            <button class="scale-btn ${preWorkoutData?.soreness === 5 ? 'active' : ''}" data-value="5">5<span>Ciężka</span></button>
          </div>
        </div>

        <div class="readiness-card">
          <div class="readiness-label">&#x1F4DD; Notatki (opcjonalnie)</div>
          <textarea class="note-input" rows="2" placeholder="Np. mało jadłem, jestem po chorobie..." id="readiness-notes">${preWorkoutData?.notes || ''}</textarea>
        </div>

        ${preWorkoutData?.sleep ? (() => {
          const score = calculateReadiness(preWorkoutData);
          const info = getReadinessLabel(score);
          return `<div class="readiness-result" style="border-color: ${info.color}40">
            <div class="readiness-score" style="color: ${info.color}">${info.emoji} Gotowość: ${score}/5 – ${info.text}</div>
            ${score <= 2 ? '<div class="readiness-hint">Zmniejszymy ciężary o ~5% na dziś</div>' : ''}
            ${score >= 5 ? '<div class="readiness-hint" style="color:var(--green)">Daj z siebie wszystko!</div>' : ''}
          </div>`;
        })() : ''}

        <button class="start-btn" data-action="start-workout" style="margin-top:8px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          ${preWorkoutData?.sleep ? 'Zaczynamy!' : 'Pomiń i zacznij'}
        </button>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTIVE WORKOUT
  // ═══════════════════════════════════════════════════════════════
  async function startWorkout() {
    const plan = await DB.getAll('plan');
    plan.sort((a, b) => a.order - b.order);
    timerTotal = await getRestTime();
    const mcInfo = await getMicrocycleInfo();
    const deloadMod = getDeloadModifier(mcInfo.isDeload);
    const readiness = preWorkoutData ? calculateReadiness(preWorkoutData) : 3;

    // Save body stats
    if (preWorkoutData && preWorkoutData.sleep) {
      await DB.add('bodyStats', {
        date: today(),
        sleep: preWorkoutData.sleep,
        stress: preWorkoutData.stress,
        soreness: preWorkoutData.soreness,
        notes: preWorkoutData.notes || '',
        readiness
      });
    }

    const sessionId = await DB.add('sessions', {
      date: today(),
      startTime: Date.now(),
      duration: null,
      completed: false,
      readiness,
      isDeload: mcInfo.isDeload
    });

    const exerciseData = [];
    for (const p of plan) {
      const prevSets = await getPrevSessionSets(p.exerciseId);
      const history = await analyzeExerciseHistory(p.exerciseId, 3);
      const suggestion = suggestWeight(p.exerciseName, history, readiness);

      const sets = p.sets.map((s, i) => {
        const prev = prevSets[i];
        let weight = prev ? prev.weight : s.weight;
        let reps = prev ? prev.reps : s.reps;

        // Apply suggestion to working/max sets
        if (suggestion && (s.type === 'working' || s.type === 'max')) {
          if (suggestion.direction === 'up') {
            weight = suggestion.weight;
          } else if (suggestion.direction === 'down') {
            weight = suggestion.weight;
          }
        }

        // Apply deload modifier
        if (mcInfo.isDeload && (s.type === 'working' || s.type === 'max')) {
          weight = Math.round(weight * deloadMod / 2.5) * 2.5;
        }

        return {
          ...s,
          index: i,
          actualWeight: weight,
          actualReps: reps,
          rir: null,
          completed: false,
          restTime: null
        };
      });

      exerciseData.push({
        exerciseId: p.exerciseId,
        exerciseName: p.exerciseName,
        muscle: p.muscle,
        sets,
        suggestion: suggestion ? suggestion.reason : null,
        note: ''
      });
    }

    activeSession = {
      id: sessionId,
      exercises: exerciseData,
      currentExercise: 0,
      startTime: Date.now(),
      readiness,
      isDeload: mcInfo.isDeload
    };

    lastSetTime = null;
    setRestTimes = [];
    currentScreen = 'workout';
    render();
  }

  async function renderWorkout() {
    if (!activeSession) return '<div class="empty-state">Brak aktywnej sesji</div>';

    const ex = activeSession.exercises;
    const completedSets = ex.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0);
    const totalSets = ex.reduce((a, e) => a + e.sets.length, 0);

    let html = `<div class="workout-header">
      <button class="back-btn" data-action="end-workout">&#x2715; Zakoncz</button>
      <div class="workout-progress">${completedSets}/${totalSets} serii</div>
      ${activeSession.isDeload ? '<span class="deload-badge">DELOAD</span>' : ''}
    </div>`;

    for (let ei = 0; ei < ex.length; ei++) {
      const e = ex[ei];
      const allDone = e.sets.every(s => s.completed);
      const prevSets = await getPrevSessionSets(e.exerciseId);

      html += `<div class="exercise-card" id="ex-${ei}">
        <div class="exercise-header">
          <span class="muscle-badge" style="background:${MUSCLE_COLORS[e.muscle] || '#666'}">${e.muscle}</span>
          <span class="exercise-name">${e.exerciseName}</span>
          ${allDone ? '<span style="color:var(--green);font-weight:700">&#x2713;</span>' : ''}
          <button class="swap-btn" data-action="open-swap" data-ex="${ei}">${SWAP_ICON} Zamien</button>
        </div>`;

      // Smart suggestion tooltip
      if (e.suggestion && !allDone) {
        html += `<div class="suggestion-bar">${e.suggestion}</div>`;
      }

      // Set header row
      html += `<div class="set-header-row">
        <div>Seria</div><div>Plan</div><div>Ciężar</div><div>Powt.</div><div>RIR</div><div></div>
      </div>`;

      for (let si = 0; si < e.sets.length; si++) {
        const s = e.sets[si];
        const st = SET_TYPES[s.type];
        const prev = prevSets[si];
        const isActive = !s.completed && (si === 0 || e.sets[si - 1].completed);

        let comparison = '';
        if (prev && s.completed && s.actualReps !== null && prev.reps !== null) {
          if (s.actualWeight > prev.weight || (s.actualWeight === prev.weight && s.actualReps > prev.reps)) {
            comparison = '<span class="comparison better">&#x25B2;</span>';
          } else if (s.actualWeight < prev.weight || (s.actualWeight === prev.weight && s.actualReps < prev.reps)) {
            comparison = '<span class="comparison worse">&#x25BC;</span>';
          } else {
            comparison = '<span class="comparison same">=</span>';
          }
        }

        html += `<div class="set-row ${isActive ? 'active-set' : ''} ${s.completed ? 'completed' : ''}">
          <div class="set-type" style="color:${st.color}">${st.short}${si + 1}</div>
          <div class="set-planned">${s.weight}kg x ${s.reps || 'MAX'}</div>
          <input class="set-input" type="number" inputmode="decimal" step="0.5" placeholder="${s.weight}"
            value="${s.actualWeight || ''}" data-ex="${ei}" data-set="${si}" data-field="weight"
            ${s.completed ? 'disabled' : ''}>
          <input class="set-input" type="number" inputmode="numeric" placeholder="${s.reps || '?'}"
            value="${s.actualReps || ''}" data-ex="${ei}" data-set="${si}" data-field="reps"
            ${s.completed ? 'disabled' : ''}>
          <select class="rir-select ${s.completed ? 'done' : ''}" data-ex="${ei}" data-set="${si}" data-field="rir" ${s.completed ? 'disabled' : ''}>
            <option value="" ${s.rir == null ? 'selected' : ''}>-</option>
            <option value="0" ${s.rir === 0 ? 'selected' : ''}>0</option>
            <option value="1" ${s.rir === 1 ? 'selected' : ''}>1</option>
            <option value="2" ${s.rir === 2 ? 'selected' : ''}>2</option>
            <option value="3" ${s.rir === 3 ? 'selected' : ''}>3</option>
            <option value="4" ${s.rir === 4 ? 'selected' : ''}>4+</option>
          </select>
          <button class="set-check ${s.completed ? 'done' : ''}" data-action="complete-set" data-ex="${ei}" data-set="${si}">
            ${s.completed ? '&#x2713;' : '&#x25CB;'}
          </button>
        </div>`;

        if (prev && !s.completed) {
          html += `<div class="prev-result">Poprzednio: ${prev.weight}kg x ${prev.reps || '-'} ${prev.rir != null ? '(RIR ' + prev.rir + ')' : ''} ${comparison}</div>`;
        }

        // Show rest time if tracked
        if (s.completed && s.restTime) {
          html += `<div class="rest-time-display">&#x23F1; Przerwa: ${Math.round(s.restTime)}s</div>`;
        }
      }

      html += `<div class="note-area">
        <textarea class="note-input" rows="1" placeholder="Notatka (forma, technika, kontuzja...)" data-ex="${ei}" data-note="true">${e.note || ''}</textarea>
      </div>`;

      html += `</div>`;
    }

    html += `<div style="height: 100px;"></div>`;
    return html;
  }

  async function completeSet(exIdx, setIdx) {
    const s = activeSession.exercises[exIdx].sets[setIdx];
    if (s.completed) return;

    const weightInput = document.querySelector(`input[data-ex="${exIdx}"][data-set="${setIdx}"][data-field="weight"]`);
    const repsInput = document.querySelector(`input[data-ex="${exIdx}"][data-set="${setIdx}"][data-field="reps"]`);
    const rirSelect = document.querySelector(`select[data-ex="${exIdx}"][data-set="${setIdx}"][data-field="rir"]`);

    s.actualWeight = parseFloat(weightInput?.value) || s.weight;
    s.actualReps = parseInt(repsInput?.value) || s.reps || 0;
    s.rir = rirSelect?.value !== '' ? parseInt(rirSelect.value) : null;
    s.completed = true;

    // Track rest time (time since last completed set)
    const now = Date.now();
    if (lastSetTime) {
      s.restTime = Math.round((now - lastSetTime) / 1000);
      setRestTimes.push(s.restTime);
    }
    lastSetTime = now;

    await DB.add('sessionSets', {
      sessionId: activeSession.id,
      exerciseId: activeSession.exercises[exIdx].exerciseId,
      exerciseName: activeSession.exercises[exIdx].exerciseName,
      type: s.type,
      setIndex: setIdx,
      weight: s.actualWeight,
      reps: s.actualReps,
      rir: s.rir,
      restTime: s.restTime || null,
      plannedWeight: s.weight,
      plannedReps: s.reps
    });

    startTimer();
    render();
  }

  // ---- SWAP EXERCISE ----
  async function openSwapModal(exIdx) {
    swapModalExIdx = exIdx;
    const ex = activeSession.exercises[exIdx];
    const allExercises = await DB.getAll('exercises');
    const alternatives = allExercises.filter(e => e.muscle === ex.muscle);

    let modalHtml = `<div class="swap-modal-overlay" data-action="close-swap">
      <div class="swap-modal" onclick="event.stopPropagation()">
        <div class="swap-modal-title">Zamien cwiczenie</div>
        <div class="swap-modal-subtitle">${ex.muscle} &middot; Wybierz alternatywe</div>`;

    for (const alt of alternatives) {
      const isCurrent = alt.name === ex.exerciseName;
      modalHtml += `<div class="swap-option ${isCurrent ? 'current' : ''}" data-action="swap-to" data-ex-id="${alt.id}" data-ex-name="${alt.name}">
        <div class="swap-option-name">${alt.name}</div>
        <div class="swap-option-equip">${alt.equipment}</div>
        ${isCurrent ? '<span style="color:var(--accent);font-size:12px;font-weight:700">AKTUALNY</span>' : ''}
      </div>`;
    }

    modalHtml += `<div class="swap-custom">
        <div class="swap-custom-label">Albo wpisz wlasna nazwe:</div>
        <div class="swap-custom-row">
          <input class="swap-custom-input" type="text" placeholder="Np. maszyna przy oknie..." id="custom-exercise-name">
          <button class="btn btn-primary btn-sm" data-action="swap-custom">OK</button>
        </div>
      </div>
      <button class="swap-cancel" data-action="close-swap">Anuluj</button>
    </div></div>`;

    const el = document.createElement('div');
    el.innerHTML = modalHtml;
    document.body.appendChild(el.firstChild);

    document.querySelectorAll('[data-action="swap-to"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await doSwap(parseInt(btn.dataset.exId), btn.dataset.exName);
      });
    });

    document.querySelectorAll('[data-action="swap-custom"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const customName = document.getElementById('custom-exercise-name')?.value?.trim();
        if (!customName) return;
        const allEx = await DB.getAll('exercises');
        let existing = allEx.find(e => e.name === customName);
        if (!existing) {
          const muscle = activeSession.exercises[swapModalExIdx].muscle;
          const newId = await DB.add('exercises', { name: customName, muscle, equipment: 'inne' });
          await doSwap(newId, customName);
        } else {
          await doSwap(existing.id, existing.name);
        }
      });
    });

    document.querySelectorAll('[data-action="close-swap"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const overlay = document.querySelector('.swap-modal-overlay');
        if (overlay) overlay.remove();
        swapModalExIdx = null;
      });
    });
  }

  async function doSwap(newExId, newExName) {
    const exIdx = swapModalExIdx;
    const oldEx = activeSession.exercises[exIdx];

    const prevSets = await getPrevSessionSets(newExId);
    oldEx.exerciseId = newExId;
    oldEx.exerciseName = newExName;

    // Recalculate suggestion for new exercise
    const history = await analyzeExerciseHistory(newExId, 3);
    const suggestion = suggestWeight(newExName, history, activeSession.readiness);
    oldEx.suggestion = suggestion ? suggestion.reason : null;

    for (let i = 0; i < oldEx.sets.length; i++) {
      if (!oldEx.sets[i].completed) {
        const prev = prevSets[i];
        if (prev) {
          oldEx.sets[i].actualWeight = prev.weight;
          oldEx.sets[i].actualReps = prev.reps;
        }
      }
    }

    const overlay = document.querySelector('.swap-modal-overlay');
    if (overlay) overlay.remove();
    swapModalExIdx = null;
    showToast(`Zamieniono na: ${newExName}`);
    render();
  }

  // ═══════════════════════════════════════════════════════════════
  // END WORKOUT & SUMMARY
  // ═══════════════════════════════════════════════════════════════
  async function endWorkout() {
    stopTimer();
    const duration = Math.round((Date.now() - activeSession.startTime) / 1000);

    for (let i = 0; i < activeSession.exercises.length; i++) {
      const noteEl = document.querySelector(`textarea[data-ex="${i}"]`);
      if (noteEl && noteEl.value.trim()) {
        await DB.add('notes', {
          sessionId: activeSession.id,
          exerciseId: activeSession.exercises[i].exerciseId,
          text: noteEl.value.trim()
        });
      }
    }

    const session = await DB.get('sessions', activeSession.id);
    session.duration = duration;
    session.completed = true;
    await DB.put('sessions', session);

    await buildWorkoutSummary(session);

    activeSession = null;
    preWorkoutData = null;
    currentScreen = 'dashboard';
    render();
    showSummaryOverlay();
  }

  async function buildWorkoutSummary(session) {
    const sets = await DB.getAllByIndex('sessionSets', 'sessionId', session.id);
    const exercises = await DB.getAll('exercises');

    const grouped = {};
    sets.forEach(s => {
      if (!grouped[s.exerciseName]) grouped[s.exerciseName] = { sets: [], exerciseId: s.exerciseId };
      grouped[s.exerciseName].sets.push(s);
    });

    const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const totalSets = sets.length;
    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
    const rirs = sets.filter(s => s.rir != null).map(s => s.rir);
    const avgRir = rirs.length > 0 ? (rirs.reduce((a, b) => a + b, 0) / rirs.length).toFixed(1) : null;
    const avgRestTime = setRestTimes.length > 0 ? Math.round(setRestTimes.reduce((a, b) => a + b, 0) / setRestTimes.length) : null;
    const musclesWorked = [...new Set(sets.map(s => {
      const ex = exercises.find(e => e.id === s.exerciseId);
      return ex ? ex.muscle : '?';
    }))];

    const prs = [];
    const insights = [];

    for (const [name, data] of Object.entries(grouped)) {
      const maxSet = data.sets.find(s => s.type === 'max');

      const sessions = await DB.getAll('sessions');
      sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
      let prevSessionSets = [];
      for (const s of sessions) {
        if (s.id === session.id) continue;
        const sSets = await DB.getAllByIndex('sessionSets', 'sessionId', s.id);
        const exSets = sSets.filter(st => st.exerciseId === data.exerciseId);
        if (exSets.length > 0) { prevSessionSets = exSets; break; }
      }

      if (maxSet && prevSessionSets.length > 0) {
        const prevMax = prevSessionSets.find(s => s.type === 'max');
        if (prevMax) {
          if (maxSet.weight > prevMax.weight) {
            prs.push({ name, type: 'weight', value: `${maxSet.weight}kg (bylo ${prevMax.weight}kg)` });
          } else if (maxSet.weight === prevMax.weight && maxSet.reps > prevMax.reps) {
            prs.push({ name, type: 'reps', value: `${maxSet.reps} powt. (bylo ${prevMax.reps})` });
          }
        }
      }

      const exVol = data.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      if (prevSessionSets.length > 0) {
        const prevVol = prevSessionSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        const diff = Math.round(((exVol - prevVol) / prevVol) * 100);
        if (diff > 5) {
          insights.push({ icon: '&#x2191;', text: `<strong>${name}</strong>: wolumen +${diff}% vs ostatnio` });
        } else if (diff < -5) {
          insights.push({ icon: '&#x2193;', text: `<strong>${name}</strong>: wolumen ${diff}% vs ostatnio` });
        }
      }
    }

    // Progressions
    const progressions = [];
    for (const [name, data] of Object.entries(grouped)) {
      const history = await analyzeExerciseHistory(data.exerciseId, 5);
      const suggestion = suggestWeight(name, history);
      if (suggestion && suggestion.direction !== 'maintain') {
        progressions.push({ name, ...suggestion });
      }
    }

    // RIR-based insights
    if (avgRir !== null) {
      const rirNum = parseFloat(avgRir);
      if (rirNum <= 0.5) {
        insights.push({ icon: '&#x26A0;', text: `Średni RIR ${avgRir} = trenujesz do porażki. Zostaw 1-2 RIR dla bezpiecznej progresji.` });
      } else if (rirNum >= 3) {
        insights.push({ icon: '&#x1F4AA;', text: `Średni RIR ${avgRir} = masz jeszcze dużo rezerwy. Następnym razem zwiększ ciężar lub powtórzenia.` });
      } else {
        insights.push({ icon: '&#x2705;', text: `Średni RIR ${avgRir} = idealny zakres (1-2). Świetna robota!` });
      }
    }

    // Rest time insight
    if (avgRestTime) {
      if (avgRestTime > 240) {
        insights.push({ icon: '&#x23F1;', text: `Średnia przerwa: ${Math.round(avgRestTime / 60)}min. Dla hipertrofii optymalnie 2-3 min.` });
      } else if (avgRestTime < 60) {
        insights.push({ icon: '&#x23F1;', text: `Średnia przerwa: ${avgRestTime}s. Compound mogą wymagać dłuższych przerw (2-3 min).` });
      }
    }

    if (musclesWorked.length >= 5) {
      insights.push({ icon: '&#x2705;', text: `Dobra równowaga! ${musclesWorked.length} grup mięśniowych.` });
    }

    // Microcycle tip
    const mcInfo = await getMicrocycleInfo();
    if (mcInfo.week === 3 && mcInfo.sessionsThisWeek >= 3) {
      insights.push({ icon: '&#x1F4A4;', text: 'Następny tydzień to <strong>DELOAD</strong>. Automatycznie zmniejszymy ciężary o 15%.' });
    }

    workoutSummaryData = {
      date: session.date,
      duration: session.duration,
      totalSets,
      totalReps,
      totalVolume,
      avgRir,
      avgRestTime,
      musclesWorked,
      exerciseDetails: grouped,
      prs,
      insights,
      progressions,
      readiness: session.readiness
    };
  }

  function showSummaryOverlay() {
    if (!workoutSummaryData) return;
    const d = workoutSummaryData;

    let html = `<div class="summary-overlay" id="workout-summary">
      <div class="summary-content">
        <div class="summary-header">
          <div class="summary-icon">&#x1F99F;</div>
          <div class="summary-title">Trening zakonczony!</div>
          <div class="summary-date">${formatDate(d.date)}</div>
        </div>

        <div class="summary-stats">
          <div class="summary-stat">
            <div class="summary-stat-value">${d.duration ? Math.round(d.duration / 60) : 0}</div>
            <div class="summary-stat-label">Minut</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value">${d.totalSets}</div>
            <div class="summary-stat-label">Serii</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value">${Math.round(d.totalVolume)}</div>
            <div class="summary-stat-label">Wolumen</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value">${d.avgRir || '-'}</div>
            <div class="summary-stat-label">Śr. RIR</div>
          </div>
        </div>`;

    // Exercise breakdown
    html += `<div class="summary-section">
      <div class="summary-section-title">Cwiczenia</div>`;
    for (const [name, data] of Object.entries(d.exerciseDetails)) {
      const maxSet = data.sets.find(s => s.type === 'max');
      const vol = data.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      const exRirs = data.sets.filter(s => s.rir != null).map(s => s.rir);
      const exAvgRir = exRirs.length > 0 ? (exRirs.reduce((a, b) => a + b, 0) / exRirs.length).toFixed(1) : null;
      html += `<div class="summary-exercise">
        <div class="summary-ex-info">
          <div class="summary-ex-name">${name}</div>
          <div class="summary-ex-detail">${data.sets.length} serii &middot; ${Math.round(vol)}kg vol${maxSet ? ' &middot; MAX: ' + maxSet.weight + 'kg x' + maxSet.reps : ''}${exAvgRir ? ' &middot; RIR ' + exAvgRir : ''}</div>
        </div>
      </div>`;
    }
    html += `</div>`;

    // PRs
    if (d.prs.length > 0) {
      html += `<div class="summary-section">
        <div class="summary-section-title">&#x1F3C6; Rekordy!</div>`;
      for (const pr of d.prs) {
        html += `<div class="summary-insight">
          <div class="summary-insight-icon">&#x1F525;</div>
          <div class="summary-insight-text"><strong>${pr.name}</strong>: nowy rekord ${pr.type === 'weight' ? 'ciezaru' : 'powtorzen'} &ndash; ${pr.value}</div>
        </div>`;
      }
      html += `</div>`;
    }

    // Progressions
    if (d.progressions.length > 0) {
      html += `<div class="summary-section">
        <div class="summary-section-title">&#x1F4C8; Nastepny trening</div>`;
      for (const p of d.progressions) {
        const dirIcon = { up: '&#x2B06;', down: '&#x2B07;', stagnation: '&#x26A0;', fatigue: '&#x23F3;', reps_first: '&#x1F4AA;' };
        html += `<div class="summary-insight">
          <div class="summary-insight-icon">${dirIcon[p.direction] || '&#x2B06;'}</div>
          <div class="summary-insight-text"><strong>${p.name}</strong>: ${p.reason}</div>
        </div>`;
      }
      html += `</div>`;
    }

    // Insights
    if (d.insights.length > 0) {
      html += `<div class="summary-section">
        <div class="summary-section-title">&#x1F4A1; Analiza</div>`;
      for (const ins of d.insights) {
        html += `<div class="summary-insight">
          <div class="summary-insight-icon">${ins.icon}</div>
          <div class="summary-insight-text">${ins.text}</div>
        </div>`;
      }
      html += `</div>`;
    }

    html += `<button class="summary-close-btn" id="close-summary">Swietnie! Zamknij</button>
      </div>
    </div>`;

    const el = document.createElement('div');
    el.innerHTML = html;
    document.body.appendChild(el.firstChild);

    document.getElementById('close-summary')?.addEventListener('click', () => {
      const overlay = document.getElementById('workout-summary');
      if (overlay) overlay.remove();
      workoutSummaryData = null;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════════
  async function renderHistory() {
    const sessions = await getLastSessions(50);
    let html = `<div class="header"><h1>Historia</h1></div>`;

    if (sessions.length === 0) {
      return html + `<div class="empty-state"><div class="empty-state-icon">&#x1F4CB;</div><div class="empty-state-text">Brak sesji treningowych</div></div>`;
    }

    for (const s of sessions) {
      const sets = await DB.getAllByIndex('sessionSets', 'sessionId', s.id);
      const exercises = [...new Set(sets.map(st => st.exerciseName))];
      const volume = sets.reduce((sum, st) => sum + st.weight * st.reps, 0);
      const rirs = sets.filter(st => st.rir != null).map(st => st.rir);
      const avgRir = rirs.length > 0 ? (rirs.reduce((a, b) => a + b, 0) / rirs.length).toFixed(1) : null;

      html += `<div class="session-item" data-action="show-session" data-session-id="${s.id}">
        <div class="session-date">${formatDate(s.date)} ${s.isDeload ? '<span class="deload-badge" style="font-size:10px">DELOAD</span>' : ''}</div>
        <div class="session-summary">${exercises.length} cwiczen &middot; ${sets.length} serii &middot; ${Math.round(volume)}kg${avgRir ? ' &middot; RIR ' + avgRir : ''} &middot; ${s.duration ? Math.round(s.duration / 60) + 'min' : '-'}</div>
      </div>`;
    }
    return html;
  }

  async function renderHistoryDetail() {
    if (!selectedHistorySession) return renderHistory();
    const session = await DB.get('sessions', selectedHistorySession);
    if (!session) return renderHistory();

    const sets = await DB.getAllByIndex('sessionSets', 'sessionId', session.id);
    const grouped = {};
    sets.forEach(s => {
      if (!grouped[s.exerciseName]) grouped[s.exerciseName] = [];
      grouped[s.exerciseName].push(s);
    });

    const allExercises = await DB.getAll('exercises');

    let html = `<div class="header">
      <button class="back-btn" data-action="back-history">&#x2190; Wroc</button>
      <h1>${formatDate(session.date)}</h1>
    </div>
    <div style="display:flex; gap:8px; padding:0 16px 12px;">
      <button class="btn btn-sm btn-secondary" data-action="edit-session" data-session-id="${session.id}" style="flex:1">Edytuj</button>
      <button class="btn btn-sm btn-danger" data-action="delete-session" data-session-id="${session.id}" style="flex:1">Usun</button>
    </div>`;

    // Show readiness if available
    if (session.readiness) {
      const info = getReadinessLabel(session.readiness);
      html += `<div style="padding:0 16px 12px;font-size:13px;color:var(--text2)">${info.emoji} Gotowość: ${session.readiness}/5 ${session.isDeload ? '&middot; DELOAD' : ''}</div>`;
    }

    if (editingSession === session.id) {
      for (const [name, exSets] of Object.entries(grouped)) {
        const muscle = allExercises.find(e => e.name === name)?.muscle || '';
        html += `<div class="session-detail-ex">
          <h3><span class="muscle-badge" style="background:${MUSCLE_COLORS[muscle] || '#666'}">${muscle}</span> ${name}</h3>`;
        for (const s of exSets) {
          html += `<div style="display:flex; gap:8px; align-items:center; padding:6px 0;">
            <span class="set-type" style="color:${SET_TYPES[s.type]?.color || '#666'}; width:30px;">${SET_TYPES[s.type]?.short || '?'}</span>
            <input class="set-input" type="number" inputmode="decimal" step="0.5" value="${s.weight}" data-edit-set-id="${s.id}" data-edit-field="weight" style="width:70px;">
            <span style="color:var(--text3)">kg x</span>
            <input class="set-input" type="number" inputmode="numeric" value="${s.reps}" data-edit-set-id="${s.id}" data-edit-field="reps" style="width:60px;">
            <span style="color:var(--text3)">RIR</span>
            <input class="set-input" type="number" inputmode="numeric" value="${s.rir != null ? s.rir : ''}" data-edit-set-id="${s.id}" data-edit-field="rir" style="width:50px;">
          </div>`;
        }
        html += `</div>`;
      }
      html += `<div style="padding:12px 16px;">
        <button class="btn btn-primary" data-action="save-session-edit" data-session-id="${session.id}">Zapisz zmiany</button>
      </div>`;
    } else {
      for (const [name, exSets] of Object.entries(grouped)) {
        const muscle = allExercises.find(e => e.name === name)?.muscle || '';
        html += `<div class="session-detail-ex">
          <h3><span class="muscle-badge" style="background:${MUSCLE_COLORS[muscle] || '#666'}">${muscle}</span> ${name}</h3>
          <div class="session-sets-grid">
            ${exSets.map(s => `<div class="session-set-chip">
              <div style="font-size:10px;color:${SET_TYPES[s.type]?.color || '#666'};font-weight:700">${SET_TYPES[s.type]?.short || '?'}</div>
              <div style="font-weight:700">${s.weight}kg x ${s.reps}</div>
              ${s.rir != null ? `<div style="font-size:10px;color:var(--text3)">RIR ${s.rir}</div>` : ''}
            </div>`).join('')}
          </div>
        </div>`;

        const notes = await DB.getAllByIndex('notes', 'sessionExercise', [session.id, exSets[0]?.exerciseId]);
        if (notes.length > 0) {
          html += `<div style="padding:4px 16px 8px; font-size:12px; color:var(--text3); font-style:italic;">&#x1F4DD; ${notes[0].text}</div>`;
        }
      }
    }

    return html;
  }

  // ═══════════════════════════════════════════════════════════════
  // CHARTS
  // ═══════════════════════════════════════════════════════════════
  async function renderCharts() {
    const exercises = await DB.getAll('exercises');
    const plan = await DB.getAll('plan');
    const planExIds = plan.map(p => p.exerciseId);
    // Show plan exercises first, then all
    const sortedEx = [...exercises].sort((a, b) => {
      const aInPlan = planExIds.includes(a.id) ? 0 : 1;
      const bInPlan = planExIds.includes(b.id) ? 0 : 1;
      return aInPlan - bInPlan;
    });
    if (!chartExercise && sortedEx.length > 0) chartExercise = sortedEx[0].id;

    let html = `<div class="header"><h1>Wykresy</h1></div>`;

    html += `<div class="chart-container">
      <select class="chart-select" data-action="chart-select">
        ${sortedEx.map(e => `<option value="${e.id}" ${e.id === chartExercise ? 'selected' : ''}>${e.name} ${planExIds.includes(e.id) ? '★' : ''}</option>`).join('')}
      </select>
      <div class="card-title">Progresja ciezaru (seria MAX)</div>
      <div class="chart-canvas" id="weight-chart"></div>
    </div>`;

    html += `<div class="chart-container">
      <div class="card-title">RIR w czasie</div>
      <div class="chart-canvas" id="rir-chart"></div>
    </div>`;

    html += `<div class="chart-container">
      <div class="card-title">Tygodniowy wolumen</div>
      <div class="chart-canvas" id="volume-chart"></div>
    </div>`;

    return html;
  }

  async function drawCharts() {
    if (currentScreen !== 'charts') return;

    if (chartExercise) {
      const history = await analyzeExerciseHistory(chartExercise, 20);

      // Weight chart
      const weightData = history.map((h, i) => ({
        x: i, y: h.maxWeight, label: `${h.maxWeight}kg`
      }));
      drawLineChart('weight-chart', weightData, 'kg');

      // RIR chart
      const rirData = history.filter(h => h.avgRir != null).map((h, i) => ({
        x: i, y: h.avgRir, label: `RIR ${h.avgRir.toFixed(1)}`
      }));
      drawLineChart('rir-chart', rirData, 'RIR', 'var(--cyan)');
    }

    // Volume chart
    const sessions = await getLastSessions(8);
    sessions.reverse();
    const volData = [];
    for (const s of sessions) {
      const sets = await DB.getAllByIndex('sessionSets', 'sessionId', s.id);
      const vol = sets.reduce((sum, st) => sum + st.weight * st.reps, 0);
      volData.push({ x: volData.length, y: vol, label: formatDate(s.date).slice(0, 5) });
    }
    drawBarChart('volume-chart', volData, 'kg');
  }

  function drawLineChart(containerId, data, unit, color) {
    const container = document.getElementById(containerId);
    if (!container || data.length === 0) {
      if (container) container.innerHTML = '<div class="empty-state-text" style="padding:40px 0">Brak danych</div>';
      return;
    }

    const w = container.clientWidth;
    const h = 200;
    const pad = { top: 20, right: 20, bottom: 30, left: 40 };
    const iw = w - pad.left - pad.right;
    const ih = h - pad.top - pad.bottom;

    const minY = Math.min(...data.map(d => d.y)) * 0.9;
    const maxY = Math.max(...data.map(d => d.y)) * 1.1;

    const scaleX = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * iw;
    const scaleY = (v) => pad.top + ih - ((v - minY) / (maxY - minY || 1)) * ih;

    const points = data.map((d, i) => `${scaleX(i)},${scaleY(d.y)}`).join(' ');
    const areaPoints = `${scaleX(0)},${pad.top + ih} ` + points + ` ${scaleX(data.length - 1)},${pad.top + ih}`;
    const gradId = containerId + '-grad';

    let svg = `<svg class="chart-svg" viewBox="0 0 ${w} ${h}">`;
    svg += `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color || 'var(--accent)'}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color || 'var(--accent)'}" stop-opacity="0"/></linearGradient></defs>`;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ih / 4) * i;
      const val = maxY - ((maxY - minY) / 4) * i;
      svg += `<line class="chart-grid" x1="${pad.left}" y1="${y}" x2="${w - pad.right}" y2="${y}"/>`;
      svg += `<text class="chart-label" x="${pad.left - 5}" y="${y + 4}" text-anchor="end">${Math.round(val * 10) / 10}</text>`;
    }
    svg += `<polygon points="${areaPoints}" fill="url(#${gradId})"/>`;
    svg += `<polyline class="chart-line" points="${points}" style="stroke:${color || 'var(--accent)'}"/>`;
    data.forEach((d, i) => {
      svg += `<circle class="chart-dot" cx="${scaleX(i)}" cy="${scaleY(d.y)}" r="4" style="fill:${color || 'var(--accent)'}"/>`;
    });
    svg += `</svg>`;
    container.innerHTML = svg;
  }

  function drawBarChart(containerId, data, unit) {
    const container = document.getElementById(containerId);
    if (!container || data.length === 0) {
      if (container) container.innerHTML = '<div class="empty-state-text" style="padding:40px 0">Brak danych</div>';
      return;
    }

    const w = container.clientWidth;
    const h = 200;
    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const iw = w - pad.left - pad.right;
    const ih = h - pad.top - pad.bottom;

    const maxY = Math.max(...data.map(d => d.y)) * 1.1;
    const barW = Math.min(30, iw / data.length - 4);

    let svg = `<svg class="chart-svg" viewBox="0 0 ${w} ${h}">`;
    svg += `<defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0.4"/></linearGradient></defs>`;
    data.forEach((d, i) => {
      const x = pad.left + (iw / data.length) * i + (iw / data.length - barW) / 2;
      const barH = (d.y / maxY) * ih;
      const y = pad.top + ih - barH;
      svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="url(#barGrad)"/>`;
      svg += `<text class="chart-label" x="${x + barW / 2}" y="${h - 5}" text-anchor="middle">${d.label || ''}</text>`;
      svg += `<text class="chart-label" x="${x + barW / 2}" y="${y - 5}" text-anchor="middle">${Math.round(d.y)}</text>`;
    });
    svg += `</svg>`;
    container.innerHTML = svg;
  }

  // ═══════════════════════════════════════════════════════════════
  // DIET
  // ═══════════════════════════════════════════════════════════════
  async function renderDiet() {
    const entries = await getTodayDiet();
    const goal = await getDietGoal();
    const totals = {
      kcal: entries.reduce((s, e) => s + (e.kcal || 0), 0),
      protein: entries.reduce((s, e) => s + (e.protein || 0), 0),
      fat: entries.reduce((s, e) => s + (e.fat || 0), 0),
      carbs: entries.reduce((s, e) => s + (e.carbs || 0), 0)
    };

    let html = `<div class="header"><h1>Dieta</h1><span class="header-sub">${today()}</span></div>`;

    html += `<div class="diet-summary">
      ${renderMacroCard('Kalorie', totals.kcal, goal.kcal, 'kcal', 'var(--red)')}
      ${renderMacroCard('Bialko', totals.protein, goal.protein, 'g', 'var(--green)')}
      ${renderMacroCard('Tluszcz', totals.fat, goal.fat, 'g', 'var(--orange)')}
      ${renderMacroCard('Wegle', totals.carbs, goal.carbs, 'g', 'var(--blue)')}
    </div>`;

    html += `<div class="card"><div class="card-title">Dodaj posilek</div>
      <div class="add-meal-form">
        <input type="text" id="meal-name" placeholder="Nazwa posilku">
        <div class="macro-inputs">
          <input type="number" id="meal-kcal" placeholder="kcal" inputmode="numeric">
          <input type="number" id="meal-protein" placeholder="bialko (g)" inputmode="numeric">
          <input type="number" id="meal-fat" placeholder="tluszcz (g)" inputmode="numeric">
          <input type="number" id="meal-carbs" placeholder="wegle (g)" inputmode="numeric">
        </div>
        <button class="btn btn-primary" data-action="add-meal">Dodaj posilek</button>
      </div>
    </div>`;

    if (entries.length > 0) {
      html += `<div class="card"><div class="card-title">Dzisiejsze posilki</div>`;
      for (const e of entries) {
        html += `<div class="meal-item">
          <div>
            <div class="meal-name">${e.name}</div>
            <div class="meal-macros">${e.kcal}kcal &middot; B:${e.protein}g &middot; T:${e.fat}g &middot; W:${e.carbs}g</div>
          </div>
          <button class="delete-btn" data-action="delete-meal" data-meal-id="${e.id}">&#x2715;</button>
        </div>`;
      }
      html += `</div>`;
    }

    html += `<div class="card"><div class="card-title">Ostatnie 7 dni</div>`;
    for (let d = 1; d <= 7; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().slice(0, 10);
      const dayEntries = await DB.getAllByIndex('diet', 'date', dateStr);
      const dayProtein = dayEntries.reduce((s, e) => s + (e.protein || 0), 0);
      const dayKcal = dayEntries.reduce((s, e) => s + (e.kcal || 0), 0);
      html += `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--glass-border);font-size:13px;">
        <span style="color:var(--text2)">${formatDate(dateStr)}</span>
        <span style="font-variant-numeric:tabular-nums">${dayKcal} kcal &middot; ${dayProtein}g B</span>
      </div>`;
    }
    html += `</div>`;

    return html;
  }

  function renderMacroCard(label, value, range, unit, color) {
    const pct = Math.min(100, Math.round((value / range[1]) * 100));
    const inRange = value >= range[0] && value <= range[1];
    return `<div class="macro-card">
      <div class="macro-value" style="color:${inRange ? 'var(--green)' : color}">${value}</div>
      <div class="macro-label">${label}</div>
      <div class="progress-bar" style="margin:6px 0"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="macro-target">${range[0]}-${range[1]}${unit}</div>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════
  async function renderSettings() {
    const restTime = await getRestTime();
    const dietGoal = await getDietGoal();
    const mcInfo = await getMicrocycleInfo();

    return `<div class="header"><h1>Ustawienia</h1></div>
      <div class="card">
        <div class="card-title">Trening</div>
        <div class="setting-row">
          <span class="setting-label">Przerwa (sekundy)</span>
          <input class="setting-value" type="number" id="rest-time" value="${restTime}" inputmode="numeric">
        </div>
        <div style="padding:8px 0">
          <button class="btn btn-secondary" data-action="save-rest-time">Zapisz</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Mikrocykl</div>
        <div class="setting-row">
          <span class="setting-label">${mcInfo.weekLabel}</span>
          <button class="btn btn-sm btn-secondary" data-action="reset-microcycle">Resetuj cykl</button>
        </div>
        <div style="font-size:12px;color:var(--text3);padding:4px 0">3 tygodnie progresji + 1 tydzień deload. Automatyczny cykl.</div>
      </div>
      <div class="card">
        <div class="card-title">Plan treningowy</div>
        <button class="btn btn-secondary" data-action="edit-plan">Edytuj plan FBW</button>
      </div>
      <div class="card">
        <div class="card-title">Cele dietetyczne</div>
        <div class="setting-row">
          <span class="setting-label">Kalorie (min)</span>
          <input class="setting-value" type="number" id="goal-kcal-min" value="${dietGoal.kcal[0]}" inputmode="numeric">
        </div>
        <div class="setting-row">
          <span class="setting-label">Kalorie (max)</span>
          <input class="setting-value" type="number" id="goal-kcal-max" value="${dietGoal.kcal[1]}" inputmode="numeric">
        </div>
        <div class="setting-row">
          <span class="setting-label">Bialko (min)</span>
          <input class="setting-value" type="number" id="goal-protein-min" value="${dietGoal.protein[0]}" inputmode="numeric">
        </div>
        <div class="setting-row">
          <span class="setting-label">Bialko (max)</span>
          <input class="setting-value" type="number" id="goal-protein-max" value="${dietGoal.protein[1]}" inputmode="numeric">
        </div>
        <div style="padding:8px 0">
          <button class="btn btn-secondary" data-action="save-diet-goals">Zapisz cele</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Baza cwiczen</div>
        <button class="btn btn-secondary" data-action="add-exercise-form">Dodaj cwiczenie</button>
        <div id="add-exercise-area"></div>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // PLAN EDITOR
  // ═══════════════════════════════════════════════════════════════
  async function renderPlanEditor() {
    const plan = await DB.getAll('plan');
    plan.sort((a, b) => a.order - b.order);
    const exercises = await DB.getAll('exercises');

    let html = `<div class="header">
      <button class="back-btn" data-action="back-settings">&#x2190; Wroc</button>
      <h1>Plan FBW</h1>
    </div>`;

    for (const p of plan) {
      html += `<div class="plan-exercise" data-plan-id="${p.id}">
        <div class="plan-ex-header">
          <div>
            <span class="muscle-badge" style="background:${MUSCLE_COLORS[p.muscle] || '#666'}">${p.muscle}</span>
            <strong style="margin-left:8px">${p.exerciseName}</strong>
          </div>
          <button class="delete-btn" data-action="delete-plan-exercise" data-plan-id="${p.id}">&#x2715;</button>
        </div>`;

      for (let si = 0; si < p.sets.length; si++) {
        const s = p.sets[si];
        html += `<div class="plan-set-row">
          <select data-plan-id="${p.id}" data-set="${si}" data-field="type">
            ${Object.entries(SET_TYPES).map(([k, v]) => `<option value="${k}" ${k === s.type ? 'selected' : ''}>${v.label}</option>`).join('')}
          </select>
          <input type="number" step="0.5" value="${s.weight}" placeholder="kg" data-plan-id="${p.id}" data-set="${si}" data-field="planWeight">
          <input type="number" value="${s.reps || ''}" placeholder="powt." data-plan-id="${p.id}" data-set="${si}" data-field="planReps">
          <button class="delete-btn" data-action="delete-plan-set" data-plan-id="${p.id}" data-set="${si}">&#x2715;</button>
        </div>`;
      }

      html += `<div style="padding:8px 16px">
        <button class="btn btn-sm btn-ghost" data-action="add-plan-set" data-plan-id="${p.id}">+ Dodaj serie</button>
      </div></div>`;
    }

    html += `<div style="padding:16px">
      <select id="new-plan-exercise" class="chart-select">
        <option value="">Dodaj cwiczenie do planu...</option>
        ${exercises.map(e => `<option value="${e.id}">${e.name} (${e.muscle})</option>`).join('')}
      </select>
      <button class="btn btn-primary" data-action="add-plan-exercise" style="margin-top:8px">Dodaj do planu</button>
    </div>`;

    html += `<div style="padding:0 16px 16px">
      <button class="btn btn-secondary" data-action="save-plan">Zapisz zmiany</button>
    </div>`;

    return html;
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════
  function bindEvents() {
    // Nav
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        currentScreen = el.dataset.nav;
        render().then(() => { if (currentScreen === 'charts') drawCharts(); });
      });
    });

    // Readiness scale buttons
    document.querySelectorAll('.readiness-scale .scale-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.closest('.readiness-scale').dataset.field;
        const value = parseInt(btn.dataset.value);
        if (!preWorkoutData) preWorkoutData = {};
        preWorkoutData[field] = value;
        render();
      });
    });

    // Actions
    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', async (e) => {
        const action = el.dataset.action;

        switch (action) {
          case 'start-readiness':
            preWorkoutData = { sleep: null, stress: null, soreness: null, notes: '' };
            currentScreen = 'readiness';
            render();
            break;

          case 'back-dashboard':
            preWorkoutData = null;
            currentScreen = 'dashboard';
            render();
            break;

          case 'start-workout':
            // Grab notes from readiness if present
            if (currentScreen === 'readiness') {
              const notesEl = document.getElementById('readiness-notes');
              if (notesEl && preWorkoutData) preWorkoutData.notes = notesEl.value;
            }
            await startWorkout();
            break;

          case 'end-workout':
            if (confirm('Zakonczyc trening?')) {
              await endWorkout();
            }
            break;

          case 'complete-set':
            await completeSet(parseInt(el.dataset.ex), parseInt(el.dataset.set));
            break;

          case 'open-swap':
            await openSwapModal(parseInt(el.dataset.ex));
            break;

          case 'timer-skip':
            stopTimer();
            render();
            break;

          case 'timer-add30':
            timerSeconds += 30;
            timerTotal += 30;
            break;

          case 'show-session':
            selectedHistorySession = parseInt(el.dataset.sessionId);
            currentScreen = 'history-detail';
            render();
            break;

          case 'back-history':
            editingSession = null;
            currentScreen = 'history';
            render();
            break;

          case 'edit-session':
            editingSession = parseInt(el.dataset.sessionId);
            render();
            break;

          case 'save-session-edit':
            const editInputs = document.querySelectorAll('[data-edit-set-id]');
            const updates = {};
            editInputs.forEach(input => {
              const setId = parseInt(input.dataset.editSetId);
              if (!updates[setId]) updates[setId] = {};
              if (input.dataset.editField === 'weight') updates[setId].weight = parseFloat(input.value) || 0;
              if (input.dataset.editField === 'reps') updates[setId].reps = parseInt(input.value) || 0;
              if (input.dataset.editField === 'rir') updates[setId].rir = input.value !== '' ? parseInt(input.value) : null;
            });
            for (const [setId, vals] of Object.entries(updates)) {
              const setData = await DB.get('sessionSets', parseInt(setId));
              if (setData) {
                if (vals.weight !== undefined) setData.weight = vals.weight;
                if (vals.reps !== undefined) setData.reps = vals.reps;
                if (vals.rir !== undefined) setData.rir = vals.rir;
                await DB.put('sessionSets', setData);
              }
            }
            editingSession = null;
            showToast('Sesja zaktualizowana');
            render();
            break;

          case 'delete-session':
            if (confirm('Usunac te sesje treningowa?')) {
              const delSessionId = parseInt(el.dataset.sessionId);
              const delSets = await DB.getAllByIndex('sessionSets', 'sessionId', delSessionId);
              for (const ds of delSets) {
                await DB.delete('sessionSets', ds.id);
              }
              const allNotes = await DB.getAll('notes');
              for (const n of allNotes) {
                if (n.sessionId === delSessionId) await DB.delete('notes', n.id);
              }
              await DB.delete('sessions', delSessionId);
              selectedHistorySession = null;
              currentScreen = 'history';
              showToast('Sesja usunieta');
              render();
            }
            break;

          case 'back-settings':
            currentScreen = 'settings';
            render();
            break;

          case 'add-meal':
            await addMeal();
            break;

          case 'delete-meal':
            await DB.delete('diet', parseInt(el.dataset.mealId));
            render();
            break;

          case 'save-rest-time':
            const rt = parseInt(document.getElementById('rest-time').value) || 180;
            await DB.put('settings', { key: 'restTime', value: rt });
            timerTotal = rt;
            showToast('Czas przerwy zapisany');
            break;

          case 'reset-microcycle':
            await DB.put('settings', { key: 'microcycle', value: { week: 1, startDate: today() } });
            showToast('Cykl zresetowany do tygodnia 1');
            render();
            break;

          case 'save-diet-goals':
            await DB.put('settings', {
              key: 'dietGoal',
              value: {
                kcal: [parseInt(document.getElementById('goal-kcal-min').value) || 2400, parseInt(document.getElementById('goal-kcal-max').value) || 2600],
                protein: [parseInt(document.getElementById('goal-protein-min').value) || 140, parseInt(document.getElementById('goal-protein-max').value) || 160],
                fat: [60, 90],
                carbs: [250, 350]
              }
            });
            showToast('Cele dietetyczne zapisane');
            break;

          case 'edit-plan':
            currentScreen = 'plan-editor';
            render();
            break;

          case 'add-plan-exercise':
            const exSelect = document.getElementById('new-plan-exercise');
            if (!exSelect.value) return;
            const exData = await DB.get('exercises', parseInt(exSelect.value));
            const planAll = await DB.getAll('plan');
            await DB.add('plan', {
              exerciseId: exData.id,
              exerciseName: exData.name,
              muscle: exData.muscle,
              sets: [{ type: 'working', weight: 20, reps: 8 }],
              order: planAll.length
            });
            render();
            break;

          case 'delete-plan-exercise':
            await DB.delete('plan', parseInt(el.dataset.planId));
            render();
            break;

          case 'add-plan-set':
            const p = await DB.get('plan', parseInt(el.dataset.planId));
            p.sets.push({ type: 'working', weight: p.sets[p.sets.length - 1]?.weight || 20, reps: 8 });
            await DB.put('plan', p);
            render();
            break;

          case 'delete-plan-set':
            const pl = await DB.get('plan', parseInt(el.dataset.planId));
            pl.sets.splice(parseInt(el.dataset.set), 1);
            await DB.put('plan', pl);
            render();
            break;

          case 'save-plan':
            const planItems = await DB.getAll('plan');
            for (const item of planItems) {
              const inputs = document.querySelectorAll(`[data-plan-id="${item.id}"]`);
              inputs.forEach(input => {
                if (input.dataset.set !== undefined && input.dataset.field) {
                  const si = parseInt(input.dataset.set);
                  if (input.dataset.field === 'type') item.sets[si].type = input.value;
                  if (input.dataset.field === 'planWeight') item.sets[si].weight = parseFloat(input.value) || 0;
                  if (input.dataset.field === 'planReps') item.sets[si].reps = parseInt(input.value) || null;
                }
              });
              await DB.put('plan', item);
            }
            showToast('Plan zapisany');
            break;

          case 'add-exercise-form':
            const area = document.getElementById('add-exercise-area');
            if (area) {
              area.innerHTML = `
                <div style="padding:12px 0; display:flex; flex-direction:column; gap:8px;">
                  <input type="text" id="new-ex-name" placeholder="Nazwa cwiczenia" class="swap-custom-input">
                  <select id="new-ex-muscle" class="chart-select">
                    ${Object.keys(MUSCLE_COLORS).map(m => `<option value="${m}">${m}</option>`).join('')}
                  </select>
                  <input type="text" id="new-ex-equip" placeholder="Sprzet (np. maszyna, hantle)" class="swap-custom-input">
                  <button class="btn btn-primary btn-sm" id="save-new-exercise">Zapisz</button>
                </div>`;
              document.getElementById('save-new-exercise').addEventListener('click', async () => {
                const name = document.getElementById('new-ex-name').value.trim();
                const muscle = document.getElementById('new-ex-muscle').value;
                const equipment = document.getElementById('new-ex-equip').value.trim();
                if (!name) return;
                await DB.add('exercises', { name, muscle, equipment });
                showToast(`Dodano: ${name}`);
                render();
              });
            }
            break;
        }
      });
    });

    // Chart select change
    const chartSelect = document.querySelector('[data-action="chart-select"]');
    if (chartSelect) {
      chartSelect.addEventListener('change', (e) => {
        chartExercise = parseInt(e.target.value);
        drawCharts();
      });
    }

    // Input changes during workout
    document.querySelectorAll('.set-input').forEach(input => {
      input.addEventListener('input', (e) => {
        if (!activeSession) return;
        const exI = parseInt(e.target.dataset.ex);
        const setI = parseInt(e.target.dataset.set);
        const field = e.target.dataset.field;
        if (isNaN(exI) || isNaN(setI)) return;
        const val = parseFloat(e.target.value) || 0;
        if (field === 'weight') activeSession.exercises[exI].sets[setI].actualWeight = val;
        if (field === 'reps') activeSession.exercises[exI].sets[setI].actualReps = val;
      });
    });

    // RIR select changes during workout
    document.querySelectorAll('.rir-select').forEach(select => {
      select.addEventListener('change', (e) => {
        if (!activeSession) return;
        const exI = parseInt(e.target.dataset.ex);
        const setI = parseInt(e.target.dataset.set);
        if (isNaN(exI) || isNaN(setI)) return;
        activeSession.exercises[exI].sets[setI].rir = e.target.value !== '' ? parseInt(e.target.value) : null;
      });
    });

    // Note changes
    document.querySelectorAll('[data-note]').forEach(textarea => {
      textarea.addEventListener('input', (e) => {
        if (!activeSession) return;
        const exI = parseInt(e.target.dataset.ex);
        activeSession.exercises[exI].note = e.target.value;
      });
    });
  }

  async function addMeal() {
    const name = document.getElementById('meal-name')?.value?.trim();
    const kcal = parseInt(document.getElementById('meal-kcal')?.value) || 0;
    const protein = parseInt(document.getElementById('meal-protein')?.value) || 0;
    const fat = parseInt(document.getElementById('meal-fat')?.value) || 0;
    const carbs = parseInt(document.getElementById('meal-carbs')?.value) || 0;

    if (!name) {
      showToast('Podaj nazwe posilku', 'warning');
      return;
    }

    await DB.add('diet', {
      date: today(),
      name,
      kcal,
      protein,
      fat,
      carbs,
      time: new Date().toTimeString().slice(0, 5)
    });

    render();
  }

  // Initial render
  render();
})();
