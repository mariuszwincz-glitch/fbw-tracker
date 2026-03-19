// MOSQUITO BOOSTER – IndexedDB wrapper & data + Smart Training Engine
const DB_NAME = 'mosquito-booster';
const DB_VERSION = 3;

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
        // NEW in v3: body stats (sleep, stress, soreness, readiness)
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
  'Kaptury': '#14b8a6'
};

// Set types
const SET_TYPES = {
  warmup: { label: 'Rozgrzewka', short: 'R', color: '#6b7280' },
  activation: { label: 'Aktywacja', short: 'A', color: '#f59e0b' },
  working: { label: 'Robocza', short: 'W', color: '#3b82f6' },
  max: { label: 'MAX', short: 'M', color: '#ef4444' }
};

// RIR scale descriptions
const RIR_LABELS = {
  0: 'Porażka',
  1: 'Ostatni powt.',
  2: 'Jeszcze 2',
  3: 'Jeszcze 3',
  4: 'Lekko',
  5: 'Bardzo lekko'
};

// ═══════════════════════════════════════════════════════════════
// EXERCISE CLASSIFICATION: COMPOUND vs ISOLATION
// Compound = wielostawowe (większe skoki ciężaru, niższy zakres powt.)
// Isolation = jednostawowe (mniejsze skoki, wyższy zakres powt.)
// ═══════════════════════════════════════════════════════════════
const COMPOUND_EXERCISES = [
  'Bench Press', 'Wyciskanie hantli na ławce', 'Wyciskanie na skosie',
  'Wiosłowanie', 'Wiosłowanie hantlą', 'Ściąganie drążka', 'Ściąganie wąskim chwytem', 'Podciąganie',
  'Wyciskanie hantli siedząc', 'Wyciskanie sztangi stojąc', 'Arnoldki',
  'Leg Press', 'Przysiad ze sztangą', 'Hack Squat', 'Goblet Squat',
  'Dipy', 'Maszyna na klatkę', 'Maszyna na plecy', 'Maszyna na barki'
];

function isCompound(exerciseName) {
  return COMPOUND_EXERCISES.some(c => exerciseName.toLowerCase().includes(c.toLowerCase()));
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT EXERCISES
// ═══════════════════════════════════════════════════════════════
const DEFAULT_EXERCISES = [
  // Klatka
  { name: 'Bench Press', muscle: 'Klatka', equipment: 'sztanga', compound: true },
  { name: 'Wyciskanie hantli na ławce', muscle: 'Klatka', equipment: 'hantle', compound: true },
  { name: 'Maszyna na klatkę', muscle: 'Klatka', equipment: 'maszyna', compound: true },
  { name: 'Rozpiętki wyciąg', muscle: 'Klatka', equipment: 'wyciąg', compound: false },
  { name: 'Wyciskanie na skosie', muscle: 'Klatka', equipment: 'sztanga/hantle', compound: true },
  // Plecy
  { name: 'Wiosłowanie', muscle: 'Plecy', equipment: 'sztanga', compound: true },
  { name: 'Ściąganie drążka', muscle: 'Plecy', equipment: 'wyciąg', compound: true },
  { name: 'Wiosłowanie hantlą', muscle: 'Plecy', equipment: 'hantle', compound: true },
  { name: 'Maszyna na plecy', muscle: 'Plecy', equipment: 'maszyna', compound: true },
  { name: 'Podciąganie', muscle: 'Plecy', equipment: 'drążek', compound: true },
  { name: 'Ściąganie wąskim chwytem', muscle: 'Plecy', equipment: 'wyciąg', compound: true },
  // Barki
  { name: 'Wyciskanie hantli siedząc', muscle: 'Barki', equipment: 'hantle', compound: true },
  { name: 'Wznosy boczne', muscle: 'Barki', equipment: 'hantle', compound: false },
  { name: 'Maszyna na barki', muscle: 'Barki', equipment: 'maszyna', compound: true },
  { name: 'Wyciskanie sztangi stojąc', muscle: 'Barki', equipment: 'sztanga', compound: true },
  { name: 'Wznosy boczne wyciąg', muscle: 'Barki', equipment: 'wyciąg', compound: false },
  { name: 'Arnoldki', muscle: 'Barki', equipment: 'hantle', compound: true },
  // Nogi
  { name: 'Leg Press', muscle: 'Nogi', equipment: 'maszyna', compound: true },
  { name: 'Przysiad ze sztangą', muscle: 'Nogi', equipment: 'sztanga', compound: true },
  { name: 'Hack Squat', muscle: 'Nogi', equipment: 'maszyna', compound: true },
  { name: 'Wyprosty nóg', muscle: 'Nogi', equipment: 'maszyna', compound: false },
  { name: 'Uginanie nóg leżąc', muscle: 'Nogi', equipment: 'maszyna', compound: false },
  { name: 'Goblet Squat', muscle: 'Nogi', equipment: 'hantle/kettlebell', compound: true },
  // Triceps
  { name: 'Rope Pushdown', muscle: 'Triceps', equipment: 'wyciąg', compound: false },
  { name: 'Francuskie wyciskanie', muscle: 'Triceps', equipment: 'sztanga EZ', compound: false },
  { name: 'Dipy', muscle: 'Triceps', equipment: 'poręcze', compound: true },
  { name: 'Maszyna na triceps', muscle: 'Triceps', equipment: 'maszyna', compound: false },
  { name: 'Pushdown prosty drążek', muscle: 'Triceps', equipment: 'wyciąg', compound: false },
  // Biceps
  { name: 'Curl hantlami', muscle: 'Biceps', equipment: 'hantle', compound: false },
  { name: 'Modlitewnik', muscle: 'Biceps', equipment: 'sztanga EZ', compound: false },
  { name: 'Curl na wyciągu', muscle: 'Biceps', equipment: 'wyciąg', compound: false },
  { name: 'Maszyna na biceps', muscle: 'Biceps', equipment: 'maszyna', compound: false },
  { name: 'Curl młotkowy', muscle: 'Biceps', equipment: 'hantle', compound: false },
  // Kaptury
  { name: 'Szrugsy', muscle: 'Kaptury', equipment: 'hantle', compound: false },
  { name: 'Szrugsy sztangą', muscle: 'Kaptury', equipment: 'sztanga', compound: false },
  { name: 'Szrugsy na maszynie', muscle: 'Kaptury', equipment: 'maszyna', compound: false }
];

// ═══════════════════════════════════════════════════════════════
// EXPERT FBW PLAN (Full Body Workout, 3x/tydzien)
// ═══════════════════════════════════════════════════════════════
const DEFAULT_PLAN = [
  {
    exerciseName: 'Leg Press', muscle: 'Nogi',
    sets: [
      { type: 'warmup', weight: 60, reps: 12 },
      { type: 'activation', weight: 90, reps: 6 },
      { type: 'working', weight: 120, reps: 8 },
      { type: 'working', weight: 120, reps: 8 },
      { type: 'max', weight: 120, reps: null }
    ]
  },
  {
    exerciseName: 'Bench Press', muscle: 'Klatka',
    sets: [
      { type: 'warmup', weight: 40, reps: 12 },
      { type: 'activation', weight: 50, reps: 6 },
      { type: 'working', weight: 60, reps: 8 },
      { type: 'working', weight: 60, reps: 8 },
      { type: 'max', weight: 60, reps: null }
    ]
  },
  {
    exerciseName: 'Wiosłowanie', muscle: 'Plecy',
    sets: [
      { type: 'warmup', weight: 35, reps: 12 },
      { type: 'working', weight: 50, reps: 8 },
      { type: 'working', weight: 50, reps: 8 },
      { type: 'max', weight: 50, reps: null }
    ]
  },
  {
    exerciseName: 'Wyciskanie hantli siedząc', muscle: 'Barki',
    sets: [
      { type: 'warmup', weight: 8, reps: 12 },
      { type: 'working', weight: 14, reps: 8 },
      { type: 'working', weight: 14, reps: 8 },
      { type: 'max', weight: 14, reps: null }
    ]
  },
  {
    exerciseName: 'Ściąganie drążka', muscle: 'Plecy',
    sets: [
      { type: 'working', weight: 50, reps: 10 },
      { type: 'working', weight: 50, reps: 10 },
      { type: 'max', weight: 50, reps: null }
    ]
  },
  {
    exerciseName: 'Wznosy boczne', muscle: 'Barki',
    sets: [
      { type: 'working', weight: 8, reps: 15 },
      { type: 'working', weight: 8, reps: 15 },
      { type: 'max', weight: 8, reps: null }
    ]
  },
  {
    exerciseName: 'Rope Pushdown', muscle: 'Triceps',
    sets: [
      { type: 'working', weight: 25, reps: 12 },
      { type: 'working', weight: 25, reps: 12 },
      { type: 'max', weight: 25, reps: null }
    ]
  },
  {
    exerciseName: 'Curl hantlami', muscle: 'Biceps',
    sets: [
      { type: 'working', weight: 10, reps: 12 },
      { type: 'working', weight: 10, reps: 12 },
      { type: 'max', weight: 10, reps: null }
    ]
  }
];

// Seed database on first launch
async function seedDatabase() {
  const exCount = await DB.count('exercises');
  if (exCount === 0) {
    for (const ex of DEFAULT_EXERCISES) {
      await DB.add('exercises', ex);
    }
    const exercises = await DB.getAll('exercises');
    for (const planItem of DEFAULT_PLAN) {
      const ex = exercises.find(e => e.name === planItem.exerciseName);
      await DB.add('plan', {
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscle: planItem.muscle,
        sets: planItem.sets,
        order: DEFAULT_PLAN.indexOf(planItem)
      });
    }
    await DB.put('settings', { key: 'restTime', value: 180 });
    await DB.put('settings', { key: 'dietGoal', value: { kcal: [2400, 2600], protein: [140, 160], fat: [60, 90], carbs: [250, 350] } });
    // Initialize microcycle at week 1
    await DB.put('settings', { key: 'microcycle', value: { week: 1, startDate: new Date().toISOString().slice(0, 10) } });
  } else {
    const existing = await DB.getAll('exercises');
    const existingNames = existing.map(e => e.name);
    for (const ex of DEFAULT_EXERCISES) {
      if (!existingNames.includes(ex.name)) {
        await DB.add('exercises', ex);
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
// SMART TRAINING ENGINE
// Inteligentna progresja z uwzglednieniem RIR, wolumenu, zmeczenia
// ═══════════════════════════════════════════════════════════════

// Analyze exercise history: returns last N sessions' data for an exercise
// Each entry: { sets: [...], avgRir, maxWeight, maxReps, volume, date }
async function analyzeExerciseHistory(exerciseId, limit = 5) {
  const sessions = await DB.getAll('sessions');
  sessions.sort((a, b) => new Date(a.date) - new Date(b.date));

  const history = [];
  for (const s of sessions.slice(-limit * 2)) { // check more sessions to find enough
    const allSets = await DB.getAllByIndex('sessionSets', 'sessionId', s.id);
    const exSets = allSets.filter(st => st.exerciseId === exerciseId);
    if (exSets.length === 0) continue;

    const workingSets = exSets.filter(st => st.type === 'working' || st.type === 'max');
    const rirs = exSets.filter(st => st.rir != null).map(st => st.rir);
    const avgRir = rirs.length > 0 ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
    const maxSet = exSets.find(st => st.type === 'max') || workingSets[workingSets.length - 1];
    const volume = exSets.reduce((sum, st) => sum + (st.weight || 0) * (st.reps || 0), 0);

    history.push({
      sessionId: s.id,
      date: s.date,
      sets: exSets,
      workingSets,
      avgRir,
      maxWeight: maxSet?.weight || 0,
      maxReps: maxSet?.reps || 0,
      volume
    });

    if (history.length >= limit) break;
  }
  return history;
}

// ═══════════════════════════════════════════════════════════════
// SMART WEIGHT SUGGESTION
//
// Algorytm oparty na zasadach:
// 1. Analizuje ostatnie 3 treningi danego cwiczenia
// 2. Bierze pod uwage RIR (closeness to failure)
// 3. Rozna logika dla compound vs isolation
//
// COMPOUND:
//   zakres robocze: 6-8 powt.
//   jesli MAX >= 8 + RIR <= 2 przez 2 sesje -> +2.5 kg (2.5-5%)
//   jesli MAX < 5 lub RIR = 0 przez 3 sesje -> -2.5 kg (deload)
//   jesli RIR > 2 przy pelnym zakresie -> najpierw zwieksz powt.
//
// ISOLATION:
//   zakres robocze: 10-15 powt.
//   jesli MAX >= 15 + RIR <= 2 przez 2 sesje -> +1-2 kg
//   jesli MAX < 8 lub RIR = 0 przez 3 sesje -> -1-2 kg
//   jesli RIR > 2 -> zwieksz powt. zamiast ciezaru
//
// READINESS adjustment:
//   jesli readiness < 3 (slepy, stress) -> -5% suggested weight
//   jesli readiness = 5 -> mozliwe +2.5% extra
// ═══════════════════════════════════════════════════════════════

function suggestWeight(exerciseName, history, readiness = null) {
  if (history.length === 0) return null;

  const compound = isCompound(exerciseName);
  const repTarget = compound ? 8 : 15;
  const repMin = compound ? 5 : 8;
  const weightStep = compound ? 2.5 : 2;

  const last = history[history.length - 1];
  const lastMaxSet = last.sets.find(s => s.type === 'max') || last.workingSets[last.workingSets.length - 1];
  if (!lastMaxSet) return null;

  const currentWeight = lastMaxSet.weight;
  const currentReps = lastMaxSet.reps;
  const lastRir = lastMaxSet.rir != null ? lastMaxSet.rir : (last.avgRir != null ? last.avgRir : 2);

  let suggestedWeight = currentWeight;
  let suggestedReps = null;
  let reason = '';
  let direction = 'maintain';

  // Check last 2 sessions for progression
  if (history.length >= 2) {
    const prev = history[history.length - 2];
    const prevMax = prev.sets.find(s => s.type === 'max') || prev.workingSets[prev.workingSets.length - 1];
    const prevRir = prevMax?.rir != null ? prevMax.rir : (prev.avgRir != null ? prev.avgRir : 2);

    // PROGRESSION UP: both sessions hit rep target with low RIR
    if (currentReps >= repTarget && (prevMax?.reps || 0) >= repTarget && lastRir <= 2 && prevRir <= 2) {
      suggestedWeight = currentWeight + weightStep;
      suggestedReps = compound ? '6-8' : '10-12';
      reason = `${currentReps} powt. @ RIR ${lastRir} przez 2 sesje. Czas na +${weightStep}kg!`;
      direction = 'up';
    }
    // HIGH RIR: increase reps first, not weight
    else if (currentReps >= repTarget && lastRir > 2) {
      suggestedWeight = currentWeight;
      suggestedReps = `${repTarget}+`;
      reason = `RIR ${lastRir} = jeszcze rezerwa. Najpierw wiecej powt. przy ${currentWeight}kg, potem zwieksz ciężar.`;
      direction = 'reps_first';
    }
    // VOLUME DROP: working sets dropped significantly
    else if (last.workingSets.length > 0 && prev.workingSets.length > 0) {
      const lastAvg = last.workingSets.reduce((s, x) => s + x.reps, 0) / last.workingSets.length;
      const prevAvg = prev.workingSets.reduce((s, x) => s + x.reps, 0) / prev.workingSets.length;
      if (lastAvg < prevAvg - 2 && lastRir <= 1) {
        suggestedWeight = currentWeight;
        reason = `Spadek powt. (${lastAvg.toFixed(0)} vs ${prevAvg.toFixed(0)}). Powtorz ciężar, popraw objętość.`;
        direction = 'fatigue';
      }
    }
  }

  // Check last 3 sessions for deload
  if (history.length >= 3 && direction === 'maintain') {
    const last3Max = history.slice(-3).map(h => {
      const ms = h.sets.find(s => s.type === 'max') || h.workingSets[h.workingSets.length - 1];
      return ms;
    }).filter(Boolean);

    // All below min reps = needs deload
    if (last3Max.every(s => s.reps < repMin)) {
      suggestedWeight = currentWeight - weightStep;
      suggestedReps = compound ? '8-10' : '12-15';
      reason = `Powt. < ${repMin} przez 3 sesje. Deload: -${weightStep}kg i odbuduj formę.`;
      direction = 'down';
    }

    // All same = stagnation
    if (last3Max.length >= 3 && last3Max.every(s => s.weight === last3Max[0].weight && s.reps === last3Max[0].reps)) {
      suggestedWeight = currentWeight;
      reason = `${currentWeight}kg x${currentReps} × 3 sesje = stagnacja. Sprobuj wariant lub microload +1.25kg.`;
      direction = 'stagnation';
    }
  }

  // RIR = 0 consistently = too heavy
  if (history.length >= 2) {
    const recentRirs = history.slice(-2).map(h => {
      const ms = h.sets.find(s => s.type === 'max') || h.workingSets[h.workingSets.length - 1];
      return ms?.rir;
    }).filter(r => r != null);
    if (recentRirs.length >= 2 && recentRirs.every(r => r === 0)) {
      suggestedWeight = currentWeight - weightStep;
      reason = `RIR 0 przez 2 sesje = za ciężko. Zmniejsz o ${weightStep}kg dla bezpiecznej progresji.`;
      direction = 'down';
    }
  }

  // Readiness adjustment
  if (readiness != null && suggestedWeight > 0) {
    if (readiness <= 2) {
      const adj = Math.round(suggestedWeight * 0.05 / weightStep) * weightStep;
      if (adj > 0) {
        suggestedWeight -= adj;
        reason += ` (Zmeczenie: -${adj}kg)`;
      }
    } else if (readiness >= 5 && direction === 'up') {
      // Feeling great = can push a bit more
      reason += ' (Swietna forma!)';
    }
  }

  if (direction === 'maintain' && !reason) {
    reason = `Kontynuuj ${currentWeight}kg. Cel: ${repTarget} powt. z RIR 1-2.`;
  }

  return {
    weight: Math.max(0, suggestedWeight),
    reps: suggestedReps,
    reason,
    direction,
    currentWeight,
    currentReps
  };
}

// Legacy progression check (for dashboard display)
function checkProgression(exerciseName, sessionSets) {
  if (sessionSets.length < 2) return null;

  const compound = isCompound(exerciseName);
  const maxRepTarget = compound ? 8 : 15;
  const minRepDanger = compound ? 5 : 10;
  const weightStep = compound ? 2.5 : 2;

  const lastTwo = sessionSets.slice(-2);
  const maxSets = lastTwo.map(session => {
    const maxSet = session.find(s => s.type === 'max');
    return maxSet || null;
  }).filter(Boolean);

  if (maxSets.length < 2) return null;

  const currentWeight = maxSets[maxSets.length - 1].weight;
  const currentReps = maxSets[maxSets.length - 1].reps;
  const lastRir = maxSets[maxSets.length - 1].rir;

  // PROGRESSION UP with RIR awareness
  if (maxSets.every(s => s.reps >= maxRepTarget)) {
    // If RIR > 2, suggest more reps first
    if (lastRir != null && lastRir > 2) {
      return {
        suggest: true,
        direction: 'reps_first',
        newWeight: currentWeight,
        message: `${maxRepTarget}+ powt. ale RIR ${lastRir}. Dodaj powtórzenia, potem ciężar.`
      };
    }
    return {
      suggest: true,
      direction: 'up',
      newWeight: currentWeight + weightStep,
      message: `MAX >= ${maxRepTarget} powt. przez 2 sesje! +${weightStep}kg (${currentWeight} -> ${currentWeight + weightStep}kg)`
    };
  }

  // DELOAD DOWN
  if (sessionSets.length >= 3) {
    const lastThreeMax = sessionSets.slice(-3).map(session => {
      const ms = session.find(s => s.type === 'max');
      return ms || null;
    }).filter(Boolean);

    if (lastThreeMax.length >= 3 && lastThreeMax.every(s => s.reps < minRepDanger)) {
      return {
        suggest: true,
        direction: 'down',
        newWeight: currentWeight - weightStep,
        message: `MAX < ${minRepDanger} powt. przez 3 sesje. -${weightStep}kg i odbuduj (${currentWeight} -> ${currentWeight - weightStep}kg)`
      };
    }
  }

  // STAGNATION
  if (sessionSets.length >= 4) {
    const lastFourMax = sessionSets.slice(-4).map(session => {
      const ms = session.find(s => s.type === 'max');
      return ms || null;
    }).filter(Boolean);

    if (lastFourMax.length >= 4) {
      const allSame = lastFourMax.every(s =>
        s.weight === lastFourMax[0].weight && s.reps === lastFourMax[0].reps
      );
      if (allSame) {
        return {
          suggest: true,
          direction: 'stagnation',
          newWeight: currentWeight,
          message: `${currentWeight}kg x${currentReps} × 4 sesje. Sprobuj wariant lub microload +1.25kg`
        };
      }
    }
  }

  // WORKING SETS FATIGUE
  if (sessionSets.length >= 2) {
    const lastSession = sessionSets[sessionSets.length - 1];
    const prevSession = sessionSets[sessionSets.length - 2];
    const lastWorking = lastSession.filter(s => s.type === 'working');
    const prevWorking = prevSession.filter(s => s.type === 'working');

    if (lastWorking.length > 0 && prevWorking.length > 0) {
      const lastAvgReps = lastWorking.reduce((sum, s) => sum + s.reps, 0) / lastWorking.length;
      const prevAvgReps = prevWorking.reduce((sum, s) => sum + s.reps, 0) / prevWorking.length;

      if (lastAvgReps < prevAvgReps - 2 && lastAvgReps < (compound ? 6 : 8)) {
        return {
          suggest: true,
          direction: 'fatigue',
          newWeight: currentWeight,
          message: `Serie robocze spadly (sr. ${lastAvgReps.toFixed(0)} vs ${prevAvgReps.toFixed(0)} powt.). Rozważ deload lub dłuższe przerwy.`
        };
      }
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// MICROCYCLE MANAGEMENT
// 3 tygodnie progresji + 1 tydzień deload = 1 mezocykl
// ═══════════════════════════════════════════════════════════════

async function getMicrocycleInfo() {
  const mc = await DB.get('settings', 'microcycle');
  if (!mc) return { week: 1, isDeload: false, sessionsThisWeek: 0 };

  const startDate = new Date(mc.value.startDate);
  const now = new Date();
  const daysDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  const weeksSinceStart = Math.floor(daysDiff / 7);
  const currentWeek = (weeksSinceStart % 4) + 1;
  const isDeload = currentWeek === 4;

  // Count sessions this week
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
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
// WEEKLY VOLUME PER MUSCLE GROUP
// Liczy sumaryczną pracę (kg × powt.) per mięsień z ostatnich 7 dni
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
      if (st.type === 'working' || st.type === 'max') muscleSets[muscle]++;
    }
  }

  return { volume: muscleVolume, sets: muscleSets };
}

// ═══════════════════════════════════════════════════════════════
// READINESS SCORE
// Oblicza gotowość do treningu na podstawie snu, stresu, bolesnosci
// Skala 1-5 (1 = bardzo zle, 5 = super)
// ═══════════════════════════════════════════════════════════════

function calculateReadiness(bodyStats) {
  if (!bodyStats) return 3; // default neutral
  const sleep = bodyStats.sleep || 3;
  const stress = bodyStats.stress || 3;
  const soreness = bodyStats.soreness || 3;
  // sleep is positive (higher = better), stress and soreness are negative (lower = better)
  // Normalize: sleep stays, stress/soreness are inverted
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

// Deload weight modifier
function getDeloadModifier(isDeload) {
  return isDeload ? 0.85 : 1.0; // -15% during deload week
}
