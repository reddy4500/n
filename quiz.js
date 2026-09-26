// Practice (infinite AI questions) and Mock tests (NEET PG pattern, +4 / −1).
import { S, save, today } from './store.js';
import { generateQuestions, bankQuestions } from './questions.js';
import { recordAttempt } from './stats.js';
import { SUBJECTS, subjectMix, subjectName, byId, shuffle } from './syllabus.js';
import { esc, md, toast, loader, noKeyNotice, pct, icon, $ } from './ui.js';
import { speak } from './voice.js';
import { gemini, hasKey, langInstruction } from './gemini.js';
import { go, currentRoute } from './nav.js';
import { askMentor } from './mentor.js';
import { addCard } from './cards.js';
import { BANK } from './bank.js';

const L = 'ABCD';
export const Q = { p: null, m: null };
let root = null;
let timerId = null;

function rerender() {
  if (!root || !document.body.contains(root)) return;
  const r = currentRoute();
  if (r === 'practice') renderPractice(root);
  else if (r === 'mock') renderMock(root);
}

function qBody(q, a, reveal) {
  return `<div class="q-meta"><span class="tag p">${esc(subjectName(q.subject))}</span>${q.topic ? `<span class="tag">${esc(q.topic)}</span>` : ''}<span class="tag">${esc(q.difficulty || '')}</span></div>
  <div class="q-stem">${esc(q.stem)}</div>
  <div class="opts">${q.options.map((o, i) => {
    let cls = '';
    if (reveal && a != null) cls = i === q.answer ? 'right' : i === a ? 'wrong' : '';
    else if (a === i) cls = 'sel';
    return `<button class="opt ${cls}" data-opt="${i}" ${reveal && a != null ? 'disabled' : ''}><b>${L[i]}</b><span>${esc(o)}</span></button>`;
  }).join('')}</div>`;
}

const explainHTML = q => `<div class="explain"><strong>Answer: ${L[q.answer]}. ${esc(q.options[q.answer])}</strong>${md(q.explanation)}${q.pearl ? `<div class="pearl">High-yield: ${esc(q.pearl)}</div>` : ''}</div>`;

const readText = q => `${q.stem}. ${q.options.map((o, i) => `Option ${L[i]}: ${o}.`).join(' ')}`;

/* ---------------- PRACTICE ---------------- */

export function renderPractice(el) {
  root = el;
  const s = Q.p;
  if (!s) return drawPracticeSetup(el);
  if (s.ended) return drawPracticeSummary(el);
  drawPractice(el);
}

function drawPracticeSetup(el) {
  const n = S.mistakes.length;
  el.innerHTML = `${hasKey() ? '' : noKeyNotice()}
  <div class="card">
    <div class="card-head"><h3>AI question generator</h3><span class="tag p">Unlimited dynamic MCQs</span></div>
    <div class="grid g2">
      <label class="field">Subject<select id="pSub"><option value="">All subjects (weighted mix)</option>${SUBJECTS.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
      <label class="field">Topic<select id="pTopic"><option value="">Any high-yield topic</option></select></label>
      <label class="field">Custom topic (optional)<input id="pCustom" type="text" placeholder="e.g. Hypertension in pregnancy" /></label>
      <label class="field">Difficulty<select id="pDiff"><option value="mixed">Mixed</option><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="hard">Hard</option></select></label>
      <label class="field">Style<select id="pStyle"><option value="mixed">Mixed</option><option value="clinical">Clinical vignettes</option><option value="recall">One-liners</option></select></label>
    </div>
    <div class="row" style="margin-top:14px"><button class="btn primary" id="pStart" ${hasKey() ? '' : 'disabled'}>Start AI practice</button><button class="btn" id="pOffline">Offline quick quiz</button></div>
  </div>
  <div class="card">
    <div class="card-head"><h3>Review your mistakes</h3><span class="tag ${n ? 'bad' : ''}">${n} saved</span></div>
    <p class="muted small">Every question you get wrong is saved here. Answer it correctly twice to clear it.</p>
    <button class="btn" id="pReview" ${n ? '' : 'disabled'}>Start review</button>
  </div>
  <div class="card"><h3>Voice tips</h3><p class="muted small">Tap the mic and say <kbd>start quiz on pharmacology</kbd>, <kbd>option B</kbd>, <kbd>next</kbd>, <kbd>explain</kbd>, <kbd>read question</kbd>. Telugu: <kbd>తరువాత</kbd> (next), <kbd>వివరించు</kbd> (explain), <kbd>చదువు</kbd> (read).</p></div>`;
  const sub = $('#pSub', el), top = $('#pTopic', el);
  sub.onchange = () => {
    const s = byId[sub.value];
    top.innerHTML = '<option value="">Any high-yield topic</option>' + (s ? s.topics.map(t => `<option>${esc(t)}</option>`).join('') : '');
  };
  $('#pStart', el).onclick = () => startPractice({ subject: sub.value, topic: $('#pCustom', el).value.trim() || top.value, difficulty: $('#pDiff', el).value, style: $('#pStyle', el).value, source: 'ai' });
  $('#pOffline', el).onclick = () => startPractice({ subject: sub.value, source: 'bank' });
  $('#pReview', el).onclick = () => startPractice({ source: 'review' });
}

export function startPractice(cfg) {
  if (cfg.source === 'ai' && !hasKey()) cfg.source = 'bank';
  Q.p = { cfg, qs: [], idx: 0, ans: {}, loading: false, ended: false, correct: 0, done: 0, used: new Set() };
  if (cfg.source === 'review') {
    Q.p.qs = shuffle(S.mistakes.map(m => ({ ...m })));
    if (!Q.p.qs.length) { toast('No saved mistakes yet — great!'); Q.p = null; }
  } else loadMore();
  if (currentRoute() === 'practice') rerender(); else go('practice');
}

async function loadMore(n = 5) {
  const s = Q.p;
  if (!s || s.loading || s.exhausted) return;
  s.loading = true;
  const { cfg } = s;
  try {
    let qs;
    if (cfg.source === 'ai') {
      const subjects = cfg.subject ? Array(n).fill(cfg.subject) : subjectMix(n);
      qs = await generateQuestions({ subjects, topic: cfg.topic, difficulty: cfg.difficulty, style: cfg.style });
    } else {
      qs = bankQuestions(BANK.length, cfg.subject).filter(q => !s.used.has(q.id)).slice(0, n);
      if (cfg.subject) qs = qs.filter(q => q.subject === cfg.subject);
      if (!qs.length) s.exhausted = true;
    }
    if (Q.p !== s) return;
    qs.forEach(q => s.used.add(q.id));
    const waiting = !s.qs[s.idx];
    s.qs.push(...qs);
    s.loading = false;
    if (waiting) rerender();
    return;
  } catch (e) {
    if (Q.p !== s) return;
    toast(`${e.message} Using the offline bank for now.`, 'bad', 5000);
    cfg.source = 'bank';
    s.loading = false;
    return loadMore(n);
  } finally { s.loading = false; }
}

function drawPractice(el) {
  const s = Q.p, q = s.qs[s.idx];
  if (!q) {
    if (s.cfg.source === 'review' || s.exhausted) { s.ended = true; return drawPracticeSummary(el); }
    el.innerHTML = loader('Generating fresh NEET PG questions with AI…');
    if (!s.loading) loadMore();
    return;
  }
  const a = s.ans[s.idx], answered = a != null;
  const label = s.cfg.source === 'review' ? 'Mistake review' : s.cfg.source === 'ai' ? 'AI practice' : 'Offline bank';
  el.innerHTML = `<div class="row" style="margin-bottom:12px"><span class="tag p">${label}</span><span class="muted small">Q${s.idx + 1}${s.cfg.source === 'review' ? ' of ' + s.qs.length : ''} · ${s.correct}/${s.done} correct</span><span class="spacer"></span><button class="btn sm" id="qRead">${icon('speaker')} Read</button><button class="btn sm" id="qEnd">End session</button></div>
  <div class="card">${qBody(q, a, true)}
    ${answered ? explainHTML(q) : ''}
    <div id="qExtra">${q.te ? `<div class="explain">${md(q.te)}</div>` : ''}</div>
    <div class="row end" style="margin-top:14px">${answered
      ? `<button class="btn sm" id="qTe">Explain in Telugu</button><button class="btn sm" id="qAsk">Ask mentor</button><button class="btn sm" id="qCard">+ Flashcard</button><button class="btn primary" id="qNext">Next →</button>`
      : '<span class="muted small">Tap an option or say "option B"</span>'}</div>
  </div>`;
  el.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => answerPractice(+b.dataset.opt));
  $('#qRead', el).onclick = () => speak(answered ? readText(q) + ' ' + q.explanation : readText(q));
  $('#qEnd', el).onclick = () => { s.ended = true; rerender(); };
  if (answered) {
    $('#qNext', el).onclick = () => nextPractice();
    $('#qAsk', el).onclick = () => askMentor(`Help me understand this NEET PG question.\n\nQ: ${q.stem}\nOptions: ${q.options.map((o, i) => `${L[i]}) ${o}`).join('; ')}\nCorrect: ${L[q.answer]}) ${q.options[q.answer]}\nI chose: ${L[a]}) ${q.options[a]}\n\nExplain the concept, give a mnemonic, and related high-yield facts.`);
    $('#qCard', el).onclick = () => { addCard({ front: q.stem, back: `${q.options[q.answer]}\n\n${q.pearl || ''}`, subject: q.subject }); toast('Added to flashcards', 'ok'); };
    $('#qTe', el).onclick = () => teluguExplain(q);
  }
}

async function teluguExplain(q) {
  const box = $('#qExtra');
  if (!hasKey()) return toast('Add a Gemini API key in Settings for Telugu explanations.', 'bad');
  if (box) box.innerHTML = loader('తెలుగులో వివరిస్తున్నాను…');
  try {
    q.te = await gemini({ prompt: `Explain this NEET PG MCQ in simple Telugu (Telugu script), keeping medical terms in English. Cover why the answer is correct, why others are wrong, and one memory tip. Max 150 words.\n\nQ: ${q.stem}\nOptions: ${q.options.join(' | ')}\nCorrect: ${q.options[q.answer]}\nExplanation: ${q.explanation}`, temperature: 0.5 });
    rerender();
    speak(q.te);
  } catch (e) { toast(e.message, 'bad'); if (box) box.innerHTML = ''; }
}

export function answerPractice(i, viaVoice = false) {
  const s = Q.p, q = s?.qs[s.idx];
  if (!q || s.ended || s.ans[s.idx] != null) return false;
  s.ans[s.idx] = i;
  const ok = i === q.answer;
  s.done++; if (ok) s.correct++;
  recordAttempt(q, ok, s.cfg.source === 'review' ? 'review' : 'practice');
  rerender();
  if (viaVoice || S.settings.handsFree) speak(ok ? `Correct! ${q.pearl || ''}` : `Incorrect. The answer is option ${L[q.answer]}, ${q.options[q.answer]}. ${q.pearl || ''}`);
  if (s.cfg.source !== 'review' && s.qs.length - s.idx <= 3) loadMore();
  return true;
}

export function nextPractice(viaVoice = false) {
  const s = Q.p;
  if (!s || s.ended) return false;
  s.idx++;
  rerender();
  if (s.cfg.source !== 'review' && s.qs.length - s.idx <= 3) loadMore();
  const q = s.qs[s.idx];
  if (q && (viaVoice || S.settings.handsFree)) speak(readText(q));
  return true;
}

function drawPracticeSummary(el) {
  const s = Q.p;
  el.innerHTML = `<div class="card center">
    <h2>Session complete</h2>
    <p class="muted">${s.done} answered · ${s.correct} correct · ${pct(s.correct, s.done)}% accuracy</p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="btn primary" id="sNew">New session</button><button class="btn" id="sRev" ${S.mistakes.length ? '' : 'disabled'}>Review mistakes (${S.mistakes.length})</button><a class="btn" href="#/home">Dashboard</a></div>
  </div>`;
  $('#sNew', el).onclick = () => { Q.p = null; rerender(); };
  $('#sRev', el).onclick = () => startPractice({ source: 'review' });
}

/* ---------------- MOCK TEST ---------------- */

export function renderMock(el) {
  root = el;
  const m = Q.m;
  if (!m) return drawMockSetup(el);
  if (m.result) return drawMockResult(el);
  drawMock(el);
}

function drawMockSetup(el) {
  const opts = [25, 50, 100, 200];
  el.innerHTML = `${hasKey() ? '' : noKeyNotice()}
  <div class="card">
    <div class="card-head"><h3>Grand test (NEET PG pattern)</h3><span class="tag">+4 correct · −1 wrong</span></div>
    <p class="muted small">Questions are distributed across all 19 subjects by approximate NEET PG weightage and generated fresh by AI each time. Full length: 200 questions in 210 minutes.</p>
    <div class="row" style="margin:12px 0">${opts.map(n => `<label class="check"><input type="radio" name="mc" value="${n}" ${n === 50 ? 'checked' : ''}/> ${n} Q · ${Math.round(n * 1.05)} min</label>`).join('')}</div>
    <button class="btn primary" id="mStart">Start mock test</button>
    ${hasKey() ? '' : `<p class="muted small">Without a key, the mock uses the ${BANK.length}-question offline bank.</p>`}
  </div>
  <div class="card"><h3>Previous mocks</h3>${S.mocks.length ? `<div class="table-wrap"><table><tr><th>Date</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Accuracy</th></tr>${S.mocks.slice().reverse().map(r => `<tr><td>${r.date}</td><td>${r.score}/${r.max}</td><td>${r.correct}</td><td>${r.wrong}</td><td>${pct(r.correct, r.attempted)}%</td></tr>`).join('')}</table></div>` : '<p class="empty">No mocks yet. Take your first one!</p>'}</div>`;
  $('#mStart', el).onclick = () => startMock(+el.querySelector('input[name=mc]:checked').value);
}

export function startMock(count = 50) {
  const ai = hasKey();
  if (!ai) count = Math.min(count, BANK.length);
  const subjects = subjectMix(count);
  const m = { subjects, qs: new Array(count).fill(null), idx: 0, ans: {}, marked: {}, start: null, dur: Math.round(count * 1.05) * 60000, loaded: 0, result: null, confirm: false };
  Q.m = m;
  if (!ai) {
    const qs = bankQuestions(count);
    qs.forEach((q, i) => { m.qs[i] = q; m.subjects[i] = q.subject; });
    m.loaded = count; m.start = Date.now(); startTimer();
  } else generateMock(m);
  if (currentRoute() === 'mock') rerender(); else go('mock');
}

async function generateMock(m) {
  for (let i = 0; i < m.qs.length; i += 10) {
    if (Q.m !== m || m.result) return;
    const subs = m.subjects.slice(i, i + 10);
    let qs = [];
    try { qs = await generateQuestions({ subjects: subs }); }
    catch { try { qs = await generateQuestions({ subjects: subs }); } catch (e) { toast(`${e.message} Filling with offline questions.`, 'bad', 5000); } }
    if (Q.m !== m || m.result) return;
    for (let j = 0; j < subs.length; j++) m.qs[i + j] = qs[j] || bankQuestions(1, subs[j])[0];
    m.loaded = Math.min(m.qs.length, i + 10);
    if (!m.start) { m.start = Date.now(); startTimer(); rerender(); }
    else updatePalette();
  }
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    const m = Q.m;
    if (!m || m.result || !m.start) { clearInterval(timerId); return; }
    const left = m.dur - (Date.now() - m.start);
    const t = document.getElementById('mTimer');
    if (t) { t.textContent = fmtClock(left); t.classList.toggle('low', left < 5 * 60000); }
    if (left <= 0) { toast('Time up! Submitting your test.'); submitMock(); }
  }, 1000);
}
const fmtClock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

function paletteHTML(m) {
  return m.qs.map((q, i) => `<button data-go="${i}" class="${m.ans[i] != null ? 'ans' : ''} ${m.marked[i] ? 'mark' : ''} ${i === m.idx ? 'cur' : ''}" ${q ? '' : 'disabled'}>${i + 1}</button>`).join('');
}
function updatePalette() {
  const p = document.getElementById('mPalette');
  const m = Q.m;
  if (!p || !m) return;
  p.innerHTML = paletteHTML(m);
  p.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { m.idx = +b.dataset.go; rerender(); });
  const l = document.getElementById('mLoaded');
  if (l) l.textContent = m.loaded < m.qs.length ? `Generating ${m.loaded}/${m.qs.length}…` : '';
}

function drawMock(el) {
  const m = Q.m;
  if (!m.start) { el.innerHTML = loader('Preparing your mock test — generating the first questions…'); return; }
  const q = m.qs[m.idx];
  const answered = Object.keys(m.ans).length;
  el.innerHTML = `<div class="row" style="margin-bottom:12px"><span class="timer" id="mTimer">${fmtClock(m.dur - (Date.now() - m.start))}</span><span class="muted small">${answered}/${m.qs.length} answered</span><span class="muted small" id="mLoaded"></span><span class="spacer"></span><button class="btn sm ${m.confirm ? 'primary' : ''}" id="mSubmit">${m.confirm ? 'Confirm submit' : 'Submit test'}</button></div>
  <div class="grid" style="grid-template-columns:minmax(0,1fr)">
    <div class="card">${q ? `<div class="muted small">Question ${m.idx + 1} of ${m.qs.length}</div>${qBody(q, m.ans[m.idx], false)}` : loader('Generating this question…')}
      <div class="row"><button class="btn sm" id="mPrev" ${m.idx ? '' : 'disabled'}>← Prev</button><button class="btn sm" id="mMark">${m.marked[m.idx] ? 'Unmark' : 'Mark for review'}</button><button class="btn sm" id="mClear">Clear</button><span class="spacer"></span><button class="btn primary sm" id="mNext" ${m.idx < m.qs.length - 1 ? '' : 'disabled'}>Save & next →</button></div>
    </div>
    <div class="card"><div class="card-head"><h3>Question palette</h3><span class="muted small">Filled = answered · outlined = marked</span></div><div class="palette" id="mPalette"></div></div>
  </div>`;
  updatePalette();
  el.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => answerMock(+b.dataset.opt));
  $('#mPrev', el).onclick = () => { m.idx--; m.confirm = false; rerender(); };
  $('#mNext', el).onclick = () => nextMock();
  $('#mMark', el).onclick = () => { m.marked[m.idx] = !m.marked[m.idx]; rerender(); };
  $('#mClear', el).onclick = () => { delete m.ans[m.idx]; rerender(); };
  $('#mSubmit', el).onclick = () => { if (m.confirm) submitMock(); else { m.confirm = true; rerender(); setTimeout(() => { if (Q.m === m && m.confirm && !m.result) { m.confirm = false; rerender(); } }, 4000); } };
}

export function answerMock(i) {
  const m = Q.m;
  if (!m || m.result || !m.qs[m.idx]) return false;
  m.ans[m.idx] = i; rerender(); return true;
}
export function nextMock() {
  const m = Q.m;
  if (!m || m.result || m.idx >= m.qs.length - 1) return false;
  m.idx++; m.confirm = false; rerender(); return true;
}

export function submitMock() {
  const m = Q.m;
  if (!m || m.result) return;
  clearInterval(timerId);
  const bySubject = {};
  let correct = 0, wrong = 0;
  m.qs.forEach((q, i) => {
    if (!q) return;
    const b = (bySubject[q.subject] ||= { n: 0, c: 0, w: 0 });
    b.n++;
    const a = m.ans[i];
    if (a == null) return;
    const ok = a === q.answer;
    if (ok) { correct++; b.c++; } else { wrong++; b.w++; }
    recordAttempt(q, ok, 'mock');
  });
  const total = m.qs.length;
  m.result = { date: today(), total, attempted: correct + wrong, correct, wrong, score: correct * 4 - wrong, max: total * 4, bySubject, minutes: Math.round((Date.now() - m.start) / 60000) };
  S.mocks.push(m.result);
  save();
  rerender();
}

function drawMockResult(el) {
  const m = Q.m, r = m.result;
  el.innerHTML = `<div class="grid g4">
    <div class="card stat"><div class="label">Score</div><div class="value">${r.score}</div><div class="sub">out of ${r.max}</div></div>
    <div class="card stat"><div class="label">Correct</div><div class="value" style="color:var(--ok)">${r.correct}</div><div class="sub">${pct(r.correct, r.attempted)}% accuracy</div></div>
    <div class="card stat"><div class="label">Wrong</div><div class="value" style="color:var(--bad)">${r.wrong}</div><div class="sub">−${r.wrong} marks</div></div>
    <div class="card stat"><div class="label">Unattempted</div><div class="value">${r.total - r.attempted}</div><div class="sub">${r.minutes} min used</div></div>
  </div>
  <div class="card section"><div class="card-head"><h3>Subject-wise</h3></div><div class="table-wrap"><table><tr><th>Subject</th><th>Qs</th><th>Correct</th><th>Wrong</th><th>Accuracy</th></tr>
    ${Object.entries(r.bySubject).sort((a, b) => b[1].n - a[1].n).map(([id, v]) => `<tr><td>${esc(subjectName(id))}</td><td>${v.n}</td><td>${v.c}</td><td>${v.w}</td><td>${pct(v.c, v.c + v.w)}%</td></tr>`).join('')}</table></div></div>
  <div class="card"><div class="card-head"><h3>AI performance analysis</h3><button class="btn sm" id="mAnalyse">${m.analysis ? 'Regenerate' : 'Analyse my mock'}</button></div><div id="mAn">${m.analysis ? md(m.analysis) : '<p class="muted small">Get a personalised breakdown of strengths, weak areas and a 3-day fix-it plan.</p>'}</div></div>
  <div class="card"><h3>Review answers</h3>${m.qs.map((q, i) => q ? `<details style="margin:8px 0"><summary>${i + 1}. <span class="tag ${m.ans[i] == null ? '' : m.ans[i] === q.answer ? 'ok' : 'bad'}">${m.ans[i] == null ? 'Skipped' : m.ans[i] === q.answer ? 'Correct' : 'Wrong'}</span> ${esc(q.stem.slice(0, 90))}…</summary>${qBody(q, m.ans[i] ?? -1, true)}${explainHTML(q)}</details>` : '').join('')}</div>
  <div class="row"><button class="btn primary" id="mNew">New mock</button><a class="btn" href="#/practice">Review mistakes</a></div>`;
  $('#mNew', el).onclick = () => { Q.m = null; rerender(); };
  $('#mAnalyse', el).onclick = async () => {
    if (!hasKey()) return toast('Add a Gemini API key in Settings for AI analysis.', 'bad');
    $('#mAn', el).innerHTML = loader('Analysing…');
    try {
      m.analysis = await gemini({
        system: `You are an expert NEET PG coach. ${langInstruction()}`,
        prompt: `Analyse this mock test result and give: 1) overall verdict with rank-band estimate caveat, 2) strongest and weakest subjects, 3) negative-marking strategy advice, 4) a concrete 3-day fix-it plan. Be concise with bullet points.\n\nMock: ${JSON.stringify({ ...r, bySubject: Object.fromEntries(Object.entries(r.bySubject).map(([k, v]) => [subjectName(k), v])) })}\n\nStudent profile:\n${(await import('./stats.js')).summaryForAI()}`,
        temperature: 0.6,
      });
      rerender();
    } catch (e) { toast(e.message, 'bad'); $('#mAn', el).innerHTML = ''; }
  };
}

/* ---------------- Voice hooks ---------------- */
export function quizVoice(cmd) {
  const r = currentRoute();
  if (r === 'practice' && Q.p && !Q.p.ended) {
    const q = Q.p.qs[Q.p.idx];
    if (cmd.type === 'option') return answerPractice(cmd.i, true);
    if (cmd.type === 'next') return nextPractice(true);
    if (cmd.type === 'read' && q) { speak(readText(q)); return true; }
    if (cmd.type === 'explain' && q) {
      if (Q.p.ans[Q.p.idx] == null) { speak('Answer first, then I will explain.'); return true; }
      if (S.settings.lang === 'te') teluguExplain(q); else speak(`The answer is ${q.options[q.answer]}. ${q.explanation}`);
      return true;
    }
    if (cmd.type === 'stop') { Q.p.ended = true; rerender(); return true; }
  }
  if (r === 'mock' && Q.m && !Q.m.result) {
    const q = Q.m.qs[Q.m.idx];
    if (cmd.type === 'option') { answerMock(cmd.i); speak(`Marked option ${L[cmd.i]}`); return true; }
    if (cmd.type === 'next') return nextMock();
    if (cmd.type === 'prev' && Q.m.idx > 0) { Q.m.idx--; rerender(); return true; }
    if (cmd.type === 'read' && q) { speak(readText(q)); return true; }
    if (cmd.type === 'submit') { submitMock(); return true; }
  }
  return false;
}

export const quizActive = () => (currentRoute() === 'practice' && Q.p && !Q.p.ended && Q.p.qs[Q.p.idx]) || (currentRoute() === 'mock' && Q.m && !Q.m.result && Q.m.qs[Q.m.idx]);
