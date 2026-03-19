// MOSQUITO BOOSTER – IndexedDB wrapper & data
const DB_NAME = 'mosquito-booster';
const DB_VERSION = 2;

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

// Muscle group colors
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

// Exercise type: compound vs isolation (affects progression thresholds)
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

// Default exercises - main + alternatives per muscle group
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
//
// Zasady:
// 1. Zaczynamy od najwiekszych ruchow zlozonych (nogi -> klatka -> plecy)
// 2. Naprzemiennie push/pull dla lepszej regeneracji
// 3. Compound: 6-8 powt. (sila + hipertrofia)
// 4. Isolation: 10-15 powt. (hipertrofia + pump)
// 5. Kazdy miesien: 6-10 serii/sesje x 3 = 18-30 serii/tydzien (optimum)
// 6. Rozgrzewka ZAWSZE przed ciezkim compoundem
//
// Objętość tygodniowa (przy 3x/tydz):
//   Nogi:    4 serii x 3 = 12/tydz + indirect z compound
//   Klatka:  4 serii x 3 = 12/tydz
//   Plecy:   7 serii x 3 = 21/tydz (gorna czesc pleców potrzebuje wiecej)
//   Barki:   6 serii x 3 = 18/tydz (OHP + wznosy + indirect z bench)
//   Triceps: 3 serii x 3 = 9/tydz + indirect z bench/OHP
//   Biceps:  3 serii x 3 = 9/tydz + indirect z wiosłowanie/sciaganie
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PLAN = [
  // 1. NOGI - Leg Press (glowny compound na nogi, zaczynamy od najwazniejszego)
  //    Rozgrzewka lekka -> aktywacja -> 2 ciezkie serie robocze -> MAX test
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

  // 2. KLATKA - Bench Press (glowny push poziomy)
  //    Rozgrzewka -> aktywacja -> 2 robocze -> MAX
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

  // 3. PLECY - Wiosłowanie (glowny pull poziomy - balansuje bench press)
  //    Rozgrzewka -> 2 robocze -> MAX
  {
    exerciseName: 'Wiosłowanie', muscle: 'Plecy',
    sets: [
      { type: 'warmup', weight: 35, reps: 12 },
      { type: 'working', weight: 50, reps: 8 },
      { type: 'working', weight: 50, reps: 8 },
      { type: 'max', weight: 50, reps: null }
    ]
  },

  // 4. BARKI - Wyciskanie hantli siedząc (glowny push pionowy)
  //    Rozgrzewka -> 2 robocze -> MAX
  {
    exerciseName: 'Wyciskanie hantli siedząc', muscle: 'Barki',
    sets: [
      { type: 'warmup', weight: 8, reps: 12 },
      { type: 'working', weight: 14, reps: 8 },
      { type: 'working', weight: 14, reps: 8 },
      { type: 'max', weight: 14, reps: null }
    ]
  },

  // 5. PLECY - Ściąganie drążka (pull pionowy - uzupelnia wiosłowanie)
  //    Bez rozgrzewki (plecy juz rozgrzane) -> 2 robocze -> MAX
  //    Wyzszy zakres powtorzen (10) bo drugie cwiczenie na plecy
  {
    exerciseName: 'Ściąganie drążka', muscle: 'Plecy',
    sets: [
      { type: 'working', weight: 50, reps: 10 },
      { type: 'working', weight: 50, reps: 10 },
      { type: 'max', weight: 50, reps: null }
    ]
  },

  // 6. BARKI - Wznosy boczne (izolacja glowy bocznej barku)
  //    Wyzszy zakres powt. (15) bo izolacja - pump i hipertrofia
  {
    exerciseName: 'Wznosy boczne', muscle: 'Barki',
    sets: [
      { type: 'working', weight: 8, reps: 15 },
      { type: 'working', weight: 8, reps: 15 },
      { type: 'max', weight: 8, reps: null }
    ]
  },

  // 7. TRICEPS - Rope Pushdown (izolacja - triceps juz pracował w bench i OHP)
  //    Zakres 12 powt. - izolacja na pump
  {
    exerciseName: 'Rope Pushdown', muscle: 'Triceps',
    sets: [
      { type: 'working', weight: 25, reps: 12 },
      { type: 'working', weight: 25, reps: 12 },
      { type: 'max', weight: 25, reps: null }
    ]
  },

  // 8. BICEPS - Curl hantlami (izolacja - biceps juz pracowal w wiosłowaniu i sciaganiu)
  //    Zakres 12 powt. - izolacja na pump
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
  } else {
    // Ensure alternatives exist (for users upgrading from old version)
    const existing = await DB.getAll('exercises');
    const existingNames = existing.map(e => e.name);
    for (const ex of DEFAULT_EXERCISES) {
      if (!existingNames.includes(ex.name)) {
        await DB.add('exercises', ex);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SMART PROGRESSION LOGIC
//
// Rozna logika dla compound vs isolation:
//
// COMPOUND (Bench, Squat, Row, OHP, Lat Pull):
//   - Cel seria MAX: 8 powtorzen
//   - Jesli MAX >= 8 przez 2 kolejne sesje -> +2.5 kg
//   - Jesli MAX < 5 przez 3 sesje -> -2.5 kg (deload)
//   - Jesli identyczny wynik 4+ sesji -> sugeruj zmiane
//
// ISOLATION (Wznosy, Pushdown, Curl, Szrugsy):
//   - Cel seria MAX: 15 powtorzen
//   - Jesli MAX >= 15 przez 2 kolejne sesje -> +1-2 kg
//   - Jesli MAX < 10 przez 3 sesje -> -1-2 kg
//   - Mniejsze skoki ciezaru bo mniejsze miesnie
//
// OGOLNE:
//   - Jesli serie robocze spadly o >2 powt. vs plan -> moze potrzebujesz deload
//   - Bierze pod uwage WSZYSTKIE serie, nie tylko MAX
// ═══════════════════════════════════════════════════════════════

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

  // --- PROGRESSION UP ---
  // Both last 2 MAX sets hit target reps -> ready to go up
  if (maxSets.every(s => s.reps >= maxRepTarget)) {
    return {
      suggest: true,
      direction: 'up',
      newWeight: currentWeight + weightStep,
      message: compound
        ? `MAX >= ${maxRepTarget} powt. przez 2 sesje! Dodaj ${weightStep} kg (${currentWeight} -> ${currentWeight + weightStep} kg)`
        : `MAX >= ${maxRepTarget} powt. przez 2 sesje! Dodaj ${weightStep} kg (${currentWeight} -> ${currentWeight + weightStep} kg)`
    };
  }

  // --- DELOAD DOWN ---
  // Last 3 sessions, MAX below danger zone -> suggest deload
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
        message: `MAX < ${minRepDanger} powt. przez 3 sesje. Zmniejsz o ${weightStep} kg i odbuduj (${currentWeight} -> ${currentWeight - weightStep} kg)`
      };
    }
  }

  // --- STAGNATION ---
  // Same weight and reps for 4+ sessions -> suggest change
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
          message: `Identyczny wynik ${currentWeight}kg x${currentReps} przez 4 sesje. Sprobuj wariant cwiczenia lub microload (+1.25 kg)`
        };
      }
    }
  }

  // --- WORKING SETS CHECK ---
  // If working sets dropped significantly vs plan, warn about fatigue
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
          message: `Serie robocze spadly (sr. ${lastAvgReps.toFixed(0)} vs ${prevAvgReps.toFixed(0)} powt.). Rozważ dłuższe przerwy lub lżejszy trening.`
        };
      }
    }
  }

  return null;
}
