// MOSQUITO BOOSTER – IndexedDB + Smart Training Engine
// System: FBW A/B Split, 2x/tydzień, deterministyczna progresja
const DB_NAME = 'mosquito-booster';
const DB_VERSION = 4;

const DB = {
  _db: null,

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('exercises')) {
          const ex = db.createObjectStore('exercises', { keyPath: 'id', autoIncrement: true });
          ex.createIndex('muscle', 'muscle', { unique: false });
        }
        if (!db.objectStoreNames.contains('plan')) {
          db.createObjectStore('plan', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          const sess = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
          sess.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('sessionSets')) {
          const ss = db.createObjectStore('sessionSets', { keyPath: 'id', autoIncrement: true });
          ss.createIndex('sessionId', 'sessionId', { unique: false });
          ss.createIndex('exerciseId', 'exerciseId', { unique: false });
        }
        if (!db.objectStoreNames.contains('notes')) {
          const n = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
          n.createIndex('sessionExercise', ['sessionId', 'exerciseId'], { unique: true });
        }
        if (!db.objectStoreNames.contains('diet')) {
          const d = db.createObjectStore('diet', { keyPath: 'id', autoIncrement: true });
          d.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('bodyStats')) {
          const bs = db.createObjectStore('bodyStats', { keyPath: 'id', autoIncrement: true });
          bs.createIndex('date', 'date', { unique: false });
        }
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async getAll(store) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async get(store, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async put(store, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(data);
      req.onsuccess = () => resolve(req.result);
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async add(store, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).add(data);
      req.onsuccess = () => resolve(req.result);
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async delete(store, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async getAllByIndex(store, indexName, value) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const idx = tx.objectStore(store).index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async clear(store) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async count(store) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// MUSCLE GROUPS & COLORS
// ═══════════════════════════════════════════════════════════════
const MUSCLE_COLORS = {
  'Klatka': '#ef4444',
  'Plecy': '#3b82f6',
  'Barki': '#f59e0b',
  'Nogi': '#22c55e',
  'Triceps': '#a855f7',
  'Biceps': '#f97316',
  'Posladki': '#ec4899'
};

// ═══════════════════════════════════════════════════════════════
// EXERCISE CLASSIFICATION
//
// 'main'      = główne compound (5-8 powt, 4 serie, przerwa 2-3min)
// 'secondary' = drugorzędne compound (6-10 powt, 3-4 serie, przerwa 2min)
// 'isolation' = izolacje (8-15 powt, 3 serie, przerwa 1-2min)
// ═══════════════════════════════════════════════════════════════
const EXERCISE_CLASS = {
  main:      { repRange: [5, 8],  sets: 4, weightStep: 2.5, restTime: 150, rirTarget: [1, 2] },
  secondary: { repRange: [6, 10], sets: 3, weightStep: 2.5, restTime: 120, rirTarget: [1, 2] },
  isolation: { repRange: [8, 15], sets: 3, weightStep: 1,   restTime: 90,  rirTarget: [1, 2] }
};

// Nogi: weightStep = 5kg
const EXERCISE_CLASS_LEGS = {
  main:      { ...EXERCISE_CLASS.main, weightStep: 5 },
  secondary: { ...EXERCISE_CLASS.secondary, weightStep: 2.5 }
};

// RIR labels
const RIR_LABELS = {
  0: 'Porażka',
  1: 'Ostatni',
  2: 'Jeszcze 2',
  3: 'Jeszcze 3',
  4: 'Lekko'
};

// Set types for display
const SET_TYPES = {
  working: { label: 'Robocza', short: 'W', color: '#3b82f6' }
};

// ═══════════════════════════════════════════════════════════════
// TRENING A / B – STAŁA KOLEJNOŚĆ, STAŁE ĆWICZENIA
// ═══════════════════════════════════════════════════════════════

const DEFAULT_EXERCISES = [
  // TRENING A
  { name: 'Bench Press',           muscle: 'Klatka',  equipment: 'sztanga',  type: 'main',      workout: 'A', order: 0 },
  { name: 'Incline Dumbbell Press', muscle: 'Klatka',  equipment: 'hantle',   type: 'secondary', workout: 'A', order: 1 },
  { name: 'Ściąganie drążka',       muscle: 'Plecy',   equipment: 'wyciąg',   type: 'secondary', workout: 'A', order: 2 },
  { name: 'Wiosłowanie',            muscle: 'Plecy',   equipment: 'sztanga',  type: 'secondary', workout: 'A', order: 3 },
  { name: 'Wznosy boczne',          muscle: 'Barki',   equipment: 'hantle',   type: 'isolation', workout: 'A', order: 4 },
  { name: 'Curl hantlami',          muscle: 'Biceps',  equipment: 'hantle',   type: 'isolation', workout: 'A', order: 5 },
  { name: 'Rope Pushdown',          muscle: 'Triceps', equipment: 'wyciąg',   type: 'isolation', workout: 'A', order: 6 },

  // TRENING B
  { name: 'Przysiad ze sztangą',    muscle: 'Nogi',     equipment: 'sztanga', type: 'main',      workout: 'B', order: 0 },
  { name: 'Overhead Press (OHP)',    muscle: 'Barki',    equipment: 'sztanga', type: 'main',      workout: 'B', order: 1 },
  { name: 'Romanian Deadlift',      muscle: 'Nogi',     equipment: 'sztanga', type: 'secondary', workout: 'B', order: 2 },
  { name: 'Chest Fly',              muscle: 'Klatka',   equipment: 'maszyna', type: 'isolation', workout: 'B', order: 3 },
  { name: 'Face Pull',              muscle: 'Plecy',    equipment: 'wyciąg',  type: 'isolation', workout: 'B', order: 4 },
  { name: 'Modlitewnik',            muscle: 'Biceps',   equipment: 'sztanga', type: 'isolation', workout: 'B', order: 5 },
  { name: 'French Press',           muscle: 'Triceps',  equipment: 'hantle',  type: 'isolation', workout: 'B', order: 6 },

  // Alternatives for swaps (same muscle group)
  { name: 'Maszyna na klatkę',     muscle: 'Klatka',  equipment: 'maszyna', type: 'secondary', workout: null, order: 99 },
  { name: 'Wyciskanie na skosie',  muscle: 'Klatka',  equipment: 'sztanga', type: 'secondary', workout: null, order: 99 },
  { name: 'Rozpiętki wyciąg',      muscle: 'Klatka',  equipment: 'wyciąg',  type: 'isolation', workout: null, order: 99 },
  { name: 'Maszyna na plecy',      muscle: 'Plecy',   equipment: 'maszyna', type: 'secondary', workout: null, order: 99 },
  { name: 'Podciąganie',           muscle: 'Plecy',   equipment: 'drążek',  type: 'secondary', workout: null, order: 99 },
  { name: 'Ściąganie wąskim',      muscle: 'Plecy',   equipment: 'wyciąg',  type: 'secondary', workout: null, order: 99 },
  { name: 'Wiosłowanie hantlą',    muscle: 'Plecy',   equipment: 'hantle',  type: 'secondary', workout: null, order: 99 },
  { name: 'Arnoldki',              muscle: 'Barki',   equipment: 'hantle',  type: 'secondary', workout: null, order: 99 },
  { name: 'Maszyna na barki',      muscle: 'Barki',   equipment: 'maszyna', type: 'secondary', workout: null, order: 99 },
  { name: 'Wznosy boczne wyciąg',  muscle: 'Barki',   equipment: 'wyciąg',  type: 'isolation', workout: null, order: 99 },
  { name: 'Leg Press',             muscle: 'Nogi',    equipment: 'maszyna', type: 'main',      workout: null, order: 99 },
  { name: 'Hack Squat',            muscle: 'Nogi',    equipment: 'maszyna', type: 'main',      workout: null, order: 99 },
  { name: 'Wyprosty nóg',          muscle: 'Nogi',    equipment: 'maszyna', type: 'isolation', workout: null, order: 99 },
  { name: 'Uginanie nóg leżąc',   muscle: 'Nogi',    equipment: 'maszyna', type: 'isolation', workout: null, order: 99 },
  { name: 'Curl na wyciągu',       muscle: 'Biceps',  equipment: 'wyciąg',  type: 'isolation', workout: null, order: 99 },
  { name: 'Curl młotkowy',         muscle: 'Biceps',  equipment: 'hantle',  type: 'isolation', workout: null, order: 99 },
  { name: 'Dipy',                  muscle: 'Triceps', equipment: 'poręcze', type: 'secondary', workout: null, order: 99 },
  { name: 'Maszyna na triceps',    muscle: 'Triceps', equipment: 'maszyna', type: 'isolation', workout: null, order: 99 },
];

// Default starting weights (conservative)
const DEFAULT_WEIGHTS = {
  'Bench Press': 40, 'Incline Dumbbell Press': 12, 'Ściąganie drążka': 40,
  'Wiosłowanie': 40, 'Wznosy boczne': 6, 'Curl hantlami': 8, 'Rope Pushdown': 20,
  'Przysiad ze sztangą': 50, 'Overhead Press (OHP)': 30, 'Romanian Deadlift': 40,
  'Chest Fly': 15, 'Face Pull': 15, 'Modlitewnik': 15, 'French Press': 8
};

// ═══════════════════════════════════════════════════════════════
// SEED DATABASE
// ═══════════════════════════════════════════════════════════════

async function seedDatabase() {
  const exCount = await DB.count('exercises');
  if (exCount === 0) {
    for (const ex of DEFAULT_EXERCISES) {
      await DB.add('exercises', ex);
    }
    // Build plan from A+B exercises
    const exercises = await DB.getAll('exercises');
    for (const ex of exercises) {
      if (ex.workout) {
        const cls = getExerciseClass(ex);
        const weight = DEFAULT_WEIGHTS[ex.name] || 20;
        const sets = [];
        for (let i = 0; i < cls.sets; i++) {
          sets.push({ type: 'working', weight, reps: cls.repRange[1] });
        }
        await DB.add('plan', {
          exerciseId: ex.id,
          exerciseName: ex.name,
          muscle: ex.muscle,
          workout: ex.workout,
          exerciseType: ex.type,
          sets,
          order: ex.order
        });
      }
    }
    await DB.put('settings', { key: 'restTime', value: 120 });
    await DB.put('settings', { key: 'dietGoal', value: { kcal: [2400, 2600], protein: [140, 160], fat: [60, 90], carbs: [250, 350] } });
    await DB.put('settings', { key: 'microcycle', value: { week: 1, startDate: new Date().toISOString().slice(0, 10) } });
  } else {
    // AUTO-MIGRATION: update exercises to have workout/type fields
    const existing = await DB.getAll('exercises');
    const existingNames = existing.map(e => e.name);

    // Update existing exercises with new fields (workout, type, equipment)
    for (const defEx of DEFAULT_EXERCISES) {
      const match = existing.find(e => e.name === defEx.name);
      if (match) {
        // Upgrade: add missing fields from new schema
        let changed = false;
        if (match.workout === undefined && defEx.workout !== null) { match.workout = defEx.workout; changed = true; }
        if (!match.type && defEx.type) { match.type = defEx.type; changed = true; }
        if (!match.equipment && defEx.equipment) { match.equipment = defEx.equipment; changed = true; }
        if (match.order === undefined && defEx.order !== undefined) { match.order = defEx.order; changed = true; }
        if (changed) await DB.put('exercises', match);
      } else {
        await DB.add('exercises', defEx);
      }
    }

    // AUTO-MIGRATION: rebuild plan if it doesn't have A/B workout types
    const planItems = await DB.getAll('plan');
    const hasAB = planItems.some(p => p.workout === 'A' || p.workout === 'B');
    if (!hasAB) {
      // Clear old plan and rebuild
      await DB.clear('plan');
      const allEx = await DB.getAll('exercises');
      for (const ex of allEx) {
        if (ex.workout) {
          const cls = getExerciseClass(ex);
          const weight = DEFAULT_WEIGHTS[ex.name] || 20;
          const sets = [];
          for (let i = 0; i < cls.sets; i++) {
            sets.push({ type: 'working', weight, reps: cls.repRange[1] });
          }
          await DB.add('plan', {
            exerciseId: ex.id,
            exerciseName: ex.name,
            muscle: ex.muscle,
            workout: ex.workout,
            exerciseType: ex.type,
            sets,
            order: ex.order
          });
        }
      }
    }

    // Ensure microcycle setting exists
    const mc = await DB.get('settings', 'microcycle');
    if (!mc) {
      await DB.put('settings', { key: 'microcycle', value: { week: 1, startDate: new Date().toISOString().slice(0, 10) } });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// EXERCISE CLASS HELPER
// ═══════════════════════════════════════════════════════════════

function getExerciseClass(exercise) {
  const isLegs = exercise.muscle === 'Nogi';
  if (isLegs && exercise.type === 'main') return EXERCISE_CLASS_LEGS.main;
  if (isLegs && exercise.type === 'secondary') return EXERCISE_CLASS_LEGS.secondary;
  return EXERCISE_CLASS[exercise.type] || EXERCISE_CLASS.isolation;
}

// ═══════════════════════════════════════════════════════════════
// NEXT WORKOUT TYPE (A or B)
// Alternates based on last completed session
// ═══════════════════════════════════════════════════════════════

async function getNextWorkoutType() {
  const sessions = await DB.getAll('sessions');
  const completed = sessions.filter(s => s.completed).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (completed.length === 0) return 'A';
  return completed[0].workoutType === 'A' ? 'B' : 'A';
}

// ═══════════════════════════════════════════════════════════════
// SMART PROGRESSION ENGINE
//
// DETERMINISTIC RULES:
//
// ✅ PROGRESJA: ALL serie >= górny zakres → +weightStep
// ➖ UTRZYMAJ: serie w środku zakresu → ten sam ciężar
// ⬇️ REGRESJA: większość serii < dolny zakres → -2.5-5%
// ⚠️ FAILURE: RIR=0 → NIE zwiększaj następnym razem
//
// DELOAD (tydzień 4): -20% ciężaru, -30-50% serii
// ═══════════════════════════════════════════════════════════════

async function analyzeExerciseHistory(exerciseId, limit = 6) {
  const sessions = await DB.getAll('sessions');
  sessions.sort((a, b) => new Date(a.date) - new Date(b.date));

  const history = [];
  for (const s of sessions.slice(-(limit * 2))) {
    const allSets = await DB.getAllByIndex('sessionSets', 'sessionId', s.id);
    const exSets = allSets.filter(st => st.exerciseId === exerciseId);
    if (exSets.length === 0) continue;

    const rirs = exSets.filter(st => st.rir != null).map(st => st.rir);
    const avgRir = rirs.length > 0 ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
    const volume = exSets.reduce((sum, st) => sum + (st.weight || 0) * (st.reps || 0), 0);
    const avgWeight = exSets.reduce((sum, st) => sum + st.weight, 0) / exSets.length;
    const avgReps = exSets.reduce((sum, st) => sum + st.reps, 0) / exSets.length;

    history.push({
      sessionId: s.id,
      date: s.date,
      sets: exSets,
      avgRir,
      avgWeight,
      avgReps,
      volume,
      hadFailure: rirs.includes(0)
    });

    if (history.length >= limit) break;
  }
  return history;
}

function suggestWeight(exerciseName, exerciseType, muscle, history, isDeload = false) {
  const exInfo = { type: exerciseType, muscle };
  const cls = getExerciseClass(exInfo);
  const [repMin, repMax] = cls.repRange;
  const step = cls.weightStep;
  const numSets = cls.sets;

  // No history = use default weight
  if (history.length === 0) {
    const w = DEFAULT_WEIGHTS[exerciseName] || 20;
    return {
      weight: isDeload ? roundToStep(w * 0.8, step) : w,
      sets: isDeload ? Math.max(2, Math.ceil(numSets * 0.6)) : numSets,
      reps: `${repMin}-${repMax}`,
      reason: 'Pierwszy trening. Zacznij od tego ciężaru i skup się na technice.',
      direction: 'start',
      restTime: cls.restTime
    };
  }

  const last = history[history.length - 1];
  const lastWeight = last.sets[0]?.weight || DEFAULT_WEIGHTS[exerciseName] || 20;
  const lastReps = last.sets.map(s => s.reps);
  const lastAvgReps = lastReps.reduce((a, b) => a + b, 0) / lastReps.length;
  const hadFailure = last.hadFailure;

  let suggestedWeight = lastWeight;
  let direction = 'maintain';
  let reason = '';

  // ✅ PROGRESJA: ALL sets >= upper rep range
  const allHitMax = lastReps.every(r => r >= repMax);
  if (allHitMax && !hadFailure) {
    suggestedWeight = lastWeight + step;
    direction = 'up';
    reason = `Wszystkie serie >= ${repMax} powt. Czas na +${step}kg! (${lastWeight} → ${suggestedWeight}kg)`;
  }
  // ⚠️ FAILURE CONTROL: RIR=0 → don't increase
  else if (hadFailure) {
    suggestedWeight = lastWeight;
    direction = 'hold_failure';
    reason = `Ostatnio RIR=0 (porażka). Utrzymaj ${lastWeight}kg i popraw technikę.`;
  }
  // ⬇️ REGRESJA: majority < lower rep range
  else if (lastReps.filter(r => r < repMin).length > lastReps.length / 2) {
    const reduction = roundToStep(lastWeight * 0.05, step);
    suggestedWeight = Math.max(step, lastWeight - Math.max(reduction, step));
    direction = 'down';
    reason = `Większość serii < ${repMin} powt. Zmniejsz do ${suggestedWeight}kg i odbuduj.`;
  }
  // ➖ MAINTAIN: in range
  else {
    suggestedWeight = lastWeight;
    direction = 'maintain';
    const avgStr = lastAvgReps.toFixed(1);
    reason = `Śr. ${avgStr} powt. (cel: ${repMax}). Kontynuuj ${lastWeight}kg.`;
  }

  // Check stagnation (3+ sessions same weight, same reps)
  if (history.length >= 3 && direction === 'maintain') {
    const last3 = history.slice(-3);
    const allSameWeight = last3.every(h => h.sets[0]?.weight === lastWeight);
    const allSameReps = last3.every(h => {
      const avg = h.sets.reduce((a, s) => a + s.reps, 0) / h.sets.length;
      return Math.abs(avg - lastAvgReps) < 1;
    });
    if (allSameWeight && allSameReps) {
      reason = `Stagnacja (${lastWeight}kg × ~${Math.round(lastAvgReps)} × 3 sesje). Spróbuj microload +${step/2}kg lub zmień wariant.`;
      direction = 'stagnation';
    }
  }

  // DELOAD: -20% weight, ~60% sets
  if (isDeload) {
    suggestedWeight = roundToStep(suggestedWeight * 0.8, step);
    const deloadSets = Math.max(2, Math.ceil(numSets * 0.6));
    reason = `DELOAD: ${suggestedWeight}kg × ${deloadSets} serii. Regeneracja.`;
    return {
      weight: suggestedWeight,
      sets: deloadSets,
      reps: `${repMin}-${repMax}`,
      reason,
      direction: 'deload',
      restTime: cls.restTime
    };
  }

  return {
    weight: Math.max(0, suggestedWeight),
    sets: numSets,
    reps: `${repMin}-${repMax}`,
    reason,
    direction,
    restTime: cls.restTime
  };
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

// Legacy compat - checkProgression wrapper
function checkProgression(exerciseName, sessionSets) {
  // Not used in new system, kept for backward compat
  return null;
}

// ═══════════════════════════════════════════════════════════════
// MICROCYCLE: 3 tygodnie progresji + 1 tydzień DELOAD
// ═══════════════════════════════════════════════════════════════

async function getMicrocycleInfo() {
  const mc = await DB.get('settings', 'microcycle');
  if (!mc) return { week: 1, isDeload: false, sessionsThisWeek: 0, weekLabel: 'Tydzień 1/4' };

  const startDate = new Date(mc.value.startDate);
  const now = new Date();
  const daysDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  const weeksSinceStart = Math.floor(daysDiff / 7);
  const currentWeek = (weeksSinceStart % 4) + 1;
  const isDeload = currentWeek === 4;

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const sessions = await DB.getAll('sessions');
  const sessionsThisWeek = sessions.filter(s => s.date >= weekStartStr && s.completed).length;

  return {
    week: currentWeek,
    isDeload,
    sessionsThisWeek,
    weekLabel: isDeload ? 'DELOAD' : `Tydzień ${currentWeek}/4`
  };
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY MUSCLE VOLUME
// ═══════════════════════════════════════════════════════════════

async function getWeeklyMuscleVolume() {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  const sessions = await DB.getAll('sessions');
  const recentSessions = sessions.filter(s => s.date >= weekAgoStr && s.completed);

  const exercises = await DB.getAll('exercises');
  const exMap = {};
  exercises.forEach(e => { exMap[e.id] = e; });

  const muscleVolume = {};
  const muscleSets = {};

  for (const s of recentSessions) {
    const sets = await DB.getAllByIndex('sessionSets', 'sessionId', s.id);
    for (const st of sets) {
      const ex = exMap[st.exerciseId];
      if (!ex) continue;
      const muscle = ex.muscle;
      if (!muscleVolume[muscle]) { muscleVolume[muscle] = 0; muscleSets[muscle] = 0; }
      muscleVolume[muscle] += (st.weight || 0) * (st.reps || 0);
      muscleSets[muscle]++;
    }
  }

  return { volume: muscleVolume, sets: muscleSets };
}

// ═══════════════════════════════════════════════════════════════
// READINESS SCORE
// ═══════════════════════════════════════════════════════════════

function calculateReadiness(bodyStats) {
  if (!bodyStats) return 3;
  const sleep = bodyStats.sleep || 3;
  const stress = bodyStats.stress || 3;
  const soreness = bodyStats.soreness || 3;
  const score = (sleep + (6 - stress) + (6 - soreness)) / 3;
  return Math.round(Math.max(1, Math.min(5, score)));
}

function getReadinessLabel(score) {
  if (score <= 1) return { text: 'Bardzo źle', color: '#ef4444', emoji: '&#x1F634;' };
  if (score <= 2) return { text: 'Słabo', color: '#f97316', emoji: '&#x1F612;' };
  if (score <= 3) return { text: 'OK', color: '#f59e0b', emoji: '&#x1F610;' };
  if (score <= 4) return { text: 'Dobrze', color: '#22c55e', emoji: '&#x1F60A;' };
  return { text: 'Super!', color: '#10b981', emoji: '&#x1F525;' };
}

function getDeloadModifier(isDeload) {
  return isDeload ? 0.8 : 1.0;
}

// ═══════════════════════════════════════════════════════════════
// POST-WORKOUT ANALYSIS
// Generates smart insights after workout
// ═══════════════════════════════════════════════════════════════

function analyzeWorkoutPerformance(exerciseResults) {
  let progressed = 0;
  let maintained = 0;
  let regressed = 0;
  const tips = [];

  for (const r of exerciseResults) {
    if (r.direction === 'up') progressed++;
    else if (r.direction === 'down' || r.direction === 'hold_failure') regressed++;
    else maintained++;
  }

  const total = exerciseResults.length;
  const pct = Math.round((progressed / total) * 100);

  if (pct >= 70) {
    tips.push({ icon: '&#x1F525;', text: `Progres w ${progressed}/${total} ćwiczeniach (${pct}%) – <strong>bardzo dobry trening!</strong>` });
  } else if (pct >= 40) {
    tips.push({ icon: '&#x1F4AA;', text: `Progres w ${progressed}/${total} ćwiczeniach – <strong>solidny trening.</strong>` });
  } else if (progressed > 0) {
    tips.push({ icon: '&#x1F44D;', text: `Progres w ${progressed}/${total} ćwiczeniach. Reszta do poprawy następnym razem.` });
  } else {
    tips.push({ icon: '&#x26A0;', text: `Brak progresu. Sprawdź regenerację, sen i dietę.` });
  }

  if (regressed > 0) {
    tips.push({ icon: '&#x1F6D1;', text: `${regressed} ćwiczeń z regresem. Czy jesteś wystarczająco zregenerowany?` });
  }

  return { progressed, maintained, regressed, total, tips };
}
