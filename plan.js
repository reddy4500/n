// Study planner: exam countdown, weightage vs your accuracy, AI master plan, Pomodoro focus timer.
import { S, save } from './store.js';
import { gemini, hasKey, langInstruction } from './gemini.js';
import { SUBJECTS } from './syllabus.js';
import { subjectStats, summaryForAI, daysLeft, addStudyMinutes } from './stats.js';
import { esc, md, toast, loader, noKeyNotice, pct, fmtMin, $ } from './ui.js';
import { speak } from './voice.js';
import { today } from './store.js';

let root = null, busy = false;
const P = { mode: 'focus', focus: 25, brk: 5, endAt: 0, left: 25 * 60, running: false, timer: null };

export function renderPlan(el) {
  root = el;
  const ss = subjectStats();
  const dl = daysLeft();
  el.innerHTML = `${hasKey() ? '' : noKeyNotice()}
  <div class="grid g2">
    <div class="card center"><h3>Focus timer</h3>
      <div class="row" style="justify-content:center"><span class="tag ${P.mode === 'focus' ? 'p' : 'ok'}">${P.mode === 'focus' ? 'Focus' : 'Break'}</span></div>
      <div class="pomo" id="pomo">${clock()}</div>
      <div class="row" style="justify-content:center">
        <select id="pLen" style="width:auto">${[25, 45, 50, 90].map(m => `<option value="${m}" ${m === P.focus ? 'selected' : ''}>${m} min focus</option>`).join('')}</select>
        <button class="btn primary" id="pGo">${P.running ? 'Pause' : 'Start'}</button><button class="btn" id="pReset">Reset</button>
      </div>
      <p class="muted small">Today: ${fmtMin(S.studyLog[today()] || 0)} focused. Completed focus blocks are added to your study log automatically.</p>
    </div>
    <div class="card"><h3>Exam countdown</h3>
      ${dl !== null ? `<div class="stat"><div class="value">${dl} days</div><div class="sub">to NEET PG (${esc(S.settings.examDate)}) · ~${Math.round(dl * (S.settings.dailyHours || 8))} study hours available</div></div>` : '<p class="muted">Set your exam date in <a href="#/settings">Settings</a> to unlock the countdown and a date-aware plan.</p>'}
      <div style="margin-top:10px"><h3>Last 14 days</h3>${heat()}</div>
    </div>
  </div>
  <div class="card section"><div class="card-head"><h3>Master plan until the exam</h3><button class="btn sm primary" id="mpGo">${S.masterPlan ? 'Regenerate' : 'Generate with AI'}</button></div>
    <div id="mpOut">${busy ? loader('Designing your roadmap…') : S.masterPlan ? md(S.masterPlan.text) + `<p class="muted small">Generated ${esc(S.masterPlan.date)}</p>` : '<p class="muted small">Get a phase-wise roadmap (first reading, revisions, grand tests) based on your exam date, hours and weak areas.</p>'}</div></div>
  <div class="card"><h3>Subject weightage vs your accuracy</h3><p class="muted small">Approximate questions per subject in the 200-question paper (varies each year).</p>
    <div class="table-wrap"><table><tr><th>Subject</th><th>~Qs</th><th>Attempted</th><th>Accuracy</th><th style="width:30%"></th></tr>
    ${SUBJECTS.map(s => { const v = ss[s.id], a = pct(v.c, v.n); return `<tr><td>${esc(s.name)}</td><td>${s.w}</td><td>${v.n}</td><td>${v.n ? a + '%' : '-'}</td><td><div class="bar ${!v.n ? '' : a >= 70 ? 'ok' : a >= 50 ? 'warn' : 'bad'}"><i style="width:${v.n ? a : 0}%"></i></div></td></tr>`; }).join('')}
    </table></div></div>`;

  $('#pGo', el).onclick = () => (P.running ? pausePomo() : startPomo());
  $('#pReset', el).onclick = () => resetPomo();
  $('#pLen', el).onchange = e => { P.focus = +e.target.value; resetPomo(); };
  $('#mpGo', el).onclick = masterPlan;
}

function heat() {
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return [today(d), S.studyLog[today(d)] || 0]; });
  const max = Math.max(60, ...days.map(d => d[1]));
  return `<div style="display:flex;gap:4px;align-items:flex-end;height:70px">${days.map(([d, m]) => `<div title="${d}: ${fmtMin(m)}" style="flex:1;background:var(--primary);opacity:${m ? 0.35 + 0.65 * (m / max) : 0.08};height:${Math.max(6, (m / max) * 70)}px;border-radius:4px"></div>`).join('')}</div>`;
}

async function masterPlan() {
  if (!hasKey()) return toast('Add your Gemini API key in Settings.', 'bad');
  busy = true; renderPlan(root);
  try {
    const text = await gemini({
      system: `You are an expert NEET PG strategist. ${langInstruction()}`,
      prompt: `Create a phase-wise master plan from today until the exam for this student. Include: phases with date ranges, subject order (prioritise high-weightage and weak subjects, pair heavy with light), daily hour split (new reading / revision / MCQs), number of revisions, grand test schedule (weekly, then twice weekly in the last 6 weeks), and the final 15-day strategy. Use headings and bullets, be concrete and realistic.\n\n${summaryForAI()}`,
      temperature: 0.6,
    });
    S.masterPlan = { text, date: today() }; save();
  } catch (e) { toast(e.message, 'bad'); }
  busy = false;
  if (root) renderPlan(root);
}

/* Pomodoro */
const clock = () => { const s = Math.max(0, Math.round(P.left)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function tick() {
  P.left = (P.endAt - Date.now()) / 1000;
  const el = document.getElementById('pomo');
  if (el) el.textContent = clock();
  document.title = P.running ? `${clock()} · ${P.mode === 'focus' ? 'Focus' : 'Break'} — NEET PG AI` : 'NEET PG AI Agent';
  if (P.left <= 0) {
    clearInterval(P.timer); P.running = false;
    if (P.mode === 'focus') {
      addStudyMinutes(P.focus);
      P.mode = 'break'; P.left = (P.focus >= 50 ? 10 : P.brk) * 60;
      speak('Great focus session! Take a short break. Stretch and drink water.');
      toast(`Focus block done — ${P.focus} min logged`, 'ok');
    } else {
      P.mode = 'focus'; P.left = P.focus * 60;
      speak('Break over. Ready for the next focus session?');
    }
    if (root?.isConnected) renderPlan(root);
  }
}
export function startPomo() {
  if (P.running) return;
  P.endAt = Date.now() + P.left * 1000; P.running = true;
  clearInterval(P.timer); P.timer = setInterval(tick, 1000);
  if (root?.isConnected) renderPlan(root);
}
export function pausePomo() {
  if (!P.running) return;
  clearInterval(P.timer); P.running = false; P.left = (P.endAt - Date.now()) / 1000;
  document.title = 'NEET PG AI Agent';
  if (root?.isConnected) renderPlan(root);
}
function resetPomo() {
  clearInterval(P.timer); P.running = false; P.mode = 'focus'; P.left = P.focus * 60;
  document.title = 'NEET PG AI Agent';
  if (root?.isConnected) renderPlan(root);
}
