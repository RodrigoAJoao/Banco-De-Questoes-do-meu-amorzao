/**
 * Storage module using IndexedDB for persistent data storage.
 * Replaces localStorage to handle large data (images) without the 5MB size limit.
 * IndexedDB allows storage of GBs of data per origin.
 */

const DB_NAME = 'VestibularQuestoesDB';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('questions')) {
        db.createObjectStore('questions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('attempts')) {
        db.createObjectStore('attempts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Questions CRUD ──────────────────────────────────────────────

export async function saveQuestions(questions: any[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('questions', 'readwrite');
  const store = tx.objectStore('questions');

  store.clear();
  for (const q of questions) {
    if (q && q.id) store.put(q);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadQuestions(): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction('questions', 'readonly');
  const store = tx.objectStore('questions');
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => { db.close(); resolve(request.result || []); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

// ─── Attempts CRUD ──────────────────────────────────────────────

export async function saveAttempts(attempts: any[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('attempts', 'readwrite');
  const store = tx.objectStore('attempts');

  store.clear();
  for (const a of attempts) {
    if (a && a.id) store.put(a);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadAttempts(): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction('attempts', 'readonly');
  const store = tx.objectStore('attempts');
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => { db.close(); resolve(request.result || []); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

// ─── Settings (profile, colors, etc.) ───────────────────────────

export async function loadAllSettings(): Promise<Record<string, any>> {
  const db = await openDB();
  const tx = db.transaction('settings', 'readonly');
  const store = tx.objectStore('settings');
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      const settings: Record<string, any> = {};
      for (const item of request.result || []) {
        settings[item.key] = item.value;
      }
      resolve(settings);
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function saveAllSettings(settings: Record<string, any>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');

  for (const [key, value] of Object.entries(settings)) {
    store.put({ key, value });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ─── Migration from localStorage ────────────────────────────────

export async function migrateFromLocalStorage(): Promise<boolean> {
  const migrated = localStorage.getItem('vestibular_migrated_to_idb');
  if (migrated === 'true') return false;

  let hadData = false;

  try {
    // Migrate questions
    const questionsStr = localStorage.getItem('vestibular_questions');
    if (questionsStr) {
      try {
        const questions = JSON.parse(questionsStr);
        if (Array.isArray(questions) && questions.length > 0) {
          await saveQuestions(questions.filter((q: any) => q && q.id));
          hadData = true;
        }
      } catch (e) {
        console.warn('Failed to parse questions during migration', e);
      }
    }

    // Migrate attempts
    const attemptsStr = localStorage.getItem('vestibular_attempts');
    if (attemptsStr) {
      try {
        const attempts = JSON.parse(attemptsStr);
        if (Array.isArray(attempts) && attempts.length > 0) {
          await saveAttempts(attempts.filter((a: any) => a && a.id));
          hadData = true;
        }
      } catch (e) {
        console.warn('Failed to parse attempts during migration', e);
      }
    }

    // Migrate settings
    const settingsKeys = [
      'vestibular_userName', 'vestibular_userPhoto', 'vestibular_bgImage',
      'vestibular_primaryColor', 'vestibular_secondaryColor', 'vestibular_accentColor',
      'vestibular_statsColor', 'vestibular_statsBgColor'
    ];

    const settings: Record<string, any> = {};
    for (const fullKey of settingsKeys) {
      const value = localStorage.getItem(fullKey);
      if (value !== null) {
        const shortKey = fullKey.replace('vestibular_', '');
        settings[shortKey] = value;
        hadData = true;
      }
    }

    if (Object.keys(settings).length > 0) {
      await saveAllSettings(settings);
    }

    // Mark as migrated and clean up localStorage
    localStorage.setItem('vestibular_migrated_to_idb', 'true');

    const keysToRemove = [
      'vestibular_questions', 'vestibular_attempts',
      ...settingsKeys
    ];
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    if (hadData) {
      console.log('✅ Migration from localStorage to IndexedDB complete');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Don't mark as migrated so it retries next load
  }

  return hadData;
}

// ─── Import helper ──────────────────────────────────────────────

export async function importAllData(data: {
  questions?: any[];
  attempts?: any[];
  settings?: Record<string, any>;
  profile?: Record<string, any>;
}): Promise<void> {
  if (data.questions && Array.isArray(data.questions)) {
    const valid = data.questions.filter((q: any) => q && q.id);
    await saveQuestions(valid);
  }
  if (data.attempts && Array.isArray(data.attempts)) {
    const valid = data.attempts.filter((a: any) => a && a.id);
    await saveAttempts(valid);
  }

  // Handle both new format (settings) and old format (profile)
  const settingsData: Record<string, any> = { ...(data.settings || {}) };
  if (data.profile) {
    for (const [key, value] of Object.entries(data.profile)) {
      if (value !== undefined && value !== null) {
        settingsData[key] = value;
      }
    }
  }

  if (Object.keys(settingsData).length > 0) {
    await saveAllSettings(settingsData);
  }
}
