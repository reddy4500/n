import { S, save, today } from './store.js';
import { SUBJECTS, subjectName } from './syllabus.js';

export function markActive() {
  const t = today();
  if (S.streak.last === t) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  S.streak.count = S.streak.last === today(y) ? S.streak.count + 1 : 1;
  S.streak.last = t;
  save();
}

export function currentStreak() {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return (S.streak.last === today() || S.streak.last === today(y)) ? S.streak.count : 0;
}

export function recordAttempt(q, correct, mode = 'practice') {
  S.attempts.push({ s: q.subject, t: q.topic || '', c: correct ? 1 : 0, ts: Date.now(), m: mode });
  if (!correct) addMistake(q);
  else if (mode === 'review') resolveMistake(q.id);
  markActive();
  save();
}

export function addMistake(q) {
  if (S.mistakes.some(m => m.id === q.id)) return;
  S.mistakes.push({ ...q, due: Date.now() + 86400000, box: 0 });
}
export function resolveMistake(id) {
  const m = S.mistakes.find(x => x.id === id);
  if (!m) return;
  m.box++;
  if (m.box >= 2) S.mistakes = S.mistakes.filter(x => x.id !== id);
  else m.due = Date.now() + 3 * 86400000;
}

export function addStudyMinutes(min) {
  const t = today();
  S.studyLog[t] = (S.studyLog[t] || 0) + min;
  markActive();
  save();
}

export function subjectStats(sinceDays = 0) {
  const since = sinceDays ? Date.now() - sinceDays * 86400000 : 0;
  const out = Object.fromEntries(SUBJECTS.map(s => [s.id, { n: 0, c: 0 }]));
  for (const a of S.attempts) {
    if (a.ts < since || !out[a.s]) continue;
    out[a.s].n++; out[a.s].c += a.c;
  }
  return out;
}

export function weakAreas(k = 5) {
  const map = {};
  for (const a of S.attempts) {
    const key = `${a.s}|${a.t}`;
    (map[key] ||= { s: a.s, t: a.t, n: 0, c: 0 });
    map[key].n++; map[key].c += a.c;
  }
  return Object.values(map).filter(x => x.n >= 3)
    .map(x => ({ ...x, acc: x.c / x.n }))
    .sort((a, b) => a.acc - b.acc || b.n - a.n)
    .slice(0, k);
}

export function totals() {
  const n = S.attempts.length, c = S.attempts.reduce((a, x) => a + x.c, 0);
  const t = today();
  const todayN = S.attempts.filter(a => today(new Date(a.ts)) === t);
  return { n, c, acc: n ? c / n : 0, todayN: todayN.length, todayC: todayN.reduce((a, x) => a + x.c, 0), todayMin: S.studyLog[t] || 0 };
}

export function daysLeft() {
  if (!S.settings.examDate) return null;
  const d = new Date(S.settings.examDate + 'T09:00:00');
  return Math.max(0, Math.ceil((d - Date.now()) / 86400000));
}

// Compact context the AI agent uses to personalise guidance.
export function summaryForAI() {
  const t = totals();
  const ss = subjectStats();
  const subj = Object.entries(ss).filter(([, v]) => v.n).map(([id, v]) => `${subjectName(id)} ${Math.round((v.c / v.n) * 100)}% (${v.n}q)`).join('; ');
  const untouched = SUBJECTS.filter(s => !ss[s.id].n).map(s => s.name).join(', ');
  const weak = weakAreas(6).map(w => `${subjectName(w.s)} – ${w.t || 'mixed'} ${Math.round(w.acc * 100)}%`).join('; ');
  const lastMock = S.mocks.at(-1);
  const recentJ = S.journal.slice(-3).map(j => `${j.date}: ${j.hours}h, mood ${j.mood}/5, struggles: ${j.hard || '-'}`).join(' | ');
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return S.studyLog[today(d)] || 0; }).reduce((a, b) => a + b, 0);
  return [
    `Student name: ${S.settings.name || 'Doctor'}`,
    `Today: ${today()}. Exam date: ${S.settings.examDate || 'not set'}${daysLeft() !== null ? ` (${daysLeft()} days left)` : ''}. Target study hours/day: ${S.settings.dailyHours}.`,
    `Questions attempted: ${t.n}, overall accuracy ${Math.round(t.acc * 100)}%. Today: ${t.todayN} questions, ${Math.round(t.todayMin)} focused minutes. Last 7 days focused minutes: ${Math.round(week)}. Streak: ${currentStreak()} days.`,
    `Subject accuracy: ${subj || 'no data yet'}.`,
    `Not yet practised: ${untouched || 'none'}.`,
    `Weakest topics: ${weak || 'not enough data'}.`,
    `Pending mistakes to review: ${S.mistakes.length}. Flashcards due: ${S.cards.filter(c => c.due <= Date.now()).length}.`,
    lastMock ? `Last mock (${lastMock.date}): ${lastMock.score}/${lastMock.max}, ${lastMock.correct} correct, ${lastMock.wrong} wrong of ${lastMock.total}.` : 'No mock test taken yet.',
    recentJ ? `Recent check-ins: ${recentJ}` : '',
  ].filter(Boolean).join('\n');
}
