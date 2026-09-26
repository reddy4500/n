// Local-first persistent store (browser localStorage). Nothing leaves the device except calls to the Gemini API.
const KEY = 'neetpg-ai-agent:v1';

export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEFAULTS = () => ({
  settings: {
    name: '',
    apiKey: '',
    model: 'gemini-2.5-flash',
    lang: 'en',            // 'en' | 'te'
    examDate: '',
    dailyHours: 8,
    voiceReplies: true,
    handsFree: false,
    rate: 1,
    theme: 'auto',
    reminders: false,
    morningTime: '07:00',
    eveningTime: '21:30',
  },
  attempts: [],   // {s, t, c (0/1), ts, m (mode)}
  mistakes: [],   // question objects + {due, box}
  cards: [],      // {id, front, back, subject, ef, interval, reps, due}
  chat: [],       // {role:'user'|'model', text, ts}
  journal: [],    // {date, hours, mood, good, hard, feedback}
  plans: {},      // date -> {greeting, tasks:[{text, minutes, subject, done}], motivation, tip}
  masterPlan: null,
  mocks: [],      // results
  studyLog: {},   // date -> minutes
  streak: { last: '', count: 0 },
  seen: [],       // recent question stems (to avoid repeats)
  notified: {},   // date -> {morning, evening}
  qotd: {},       // date -> question
});

function merge(base, extra) {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return extra ?? base;
  const out = { ...base };
  for (const k of Object.keys(extra)) {
    out[k] = base && typeof base[k] === 'object' && !Array.isArray(base[k]) && base[k] !== null
      ? merge(base[k], extra[k]) : extra[k];
  }
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? merge(DEFAULTS(), JSON.parse(raw)) : DEFAULTS();
  } catch { return DEFAULTS(); }
}

export const S = load();

export function save() {
  if (S.attempts.length > 20000) S.attempts.splice(0, S.attempts.length - 20000);
  if (S.seen.length > 300) S.seen.splice(0, S.seen.length - 300);
  if (S.chat.length > 200) S.chat.splice(0, S.chat.length - 200);
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { console.warn('Save failed', e); }
}

export function resetAll(keepSettings = true) {
  const settings = S.settings;
  const fresh = DEFAULTS();
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh);
  if (keepSettings) S.settings = settings;
  save();
}

export function exportData() {
  const copy = JSON.parse(JSON.stringify(S));
  copy.settings.apiKey = '';           // never export the key
  return JSON.stringify(copy, null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  const key = S.settings.apiKey;
  const merged = merge(DEFAULTS(), data);
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, merged);
  if (!S.settings.apiKey) S.settings.apiKey = key;
  save();
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
