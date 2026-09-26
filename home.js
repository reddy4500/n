import { S, today } from './store.js';
import { totals, subjectStats, weakAreas, currentStreak, daysLeft } from './stats.js';
import { SUBJECTS, subjectName } from './syllabus.js';
import { esc, pct, fmtMin, noKeyNotice, $ } from './ui.js';
import { hasKey } from './gemini.js';
import { startPractice, startMock } from './quiz.js';
import { morningBriefing } from './daily.js';

export function renderHome(el) {
  const t = totals(), ss = subjectStats(), weak = weakAreas(5), plan = S.plans[today()];
  const dl = daysLeft();
  const cardsDue = S.cards.filter(c => c.due <= Date.now()).length;
  const practised = SUBJECTS.filter(s => ss[s.id].n);
  el.innerHTML = `${hasKey() ? '' : noKeyNotice()}
  <div class="card hero">
    <h2 style="margin-bottom:4px">${S.settings.name ? `Welcome back, Dr. ${esc(S.settings.name)}` : 'Welcome, Doctor'}</h2>
    <p class="muted">${dl !== null ? `<b>${dl} days</b> to NEET PG. ` : ''}${plan ? `Today's plan: ${plan.tasks.filter(x => x.done).length}/${plan.tasks.length} tasks done.` : 'Start your day to get an AI-built plan.'}</p>
    <div class="row" style="margin-top:12px">
      <button class="btn" id="hDay">${plan ? 'Open today\'s plan' : 'Start my day'}</button>
      <button class="btn" id="hPractice">Quick 10 MCQs</button>
      <button class="btn" id="hMock">Mini mock (25)</button>
      <a class="btn" href="#/mentor">Talk to Guru</a>
    </div>
  </div>
  <div class="grid g4 section">
    <div class="card stat"><div class="label">Streak</div><div class="value">${currentStreak()} ${currentStreak() === 1 ? 'day' : 'days'}</div><div class="sub">Keep it alive today</div></div>
    <div class="card stat"><div class="label">Questions solved</div><div class="value">${t.n}</div><div class="sub">${t.todayN} today</div></div>
    <div class="card stat"><div class="label">Accuracy</div><div class="value">${pct(t.c, t.n)}%</div><div class="sub">${t.todayN ? pct(t.todayC, t.todayN) + '% today' : 'overall'}</div></div>
    <div class="card stat"><div class="label">Focused today</div><div class="value">${fmtMin(t.todayMin)}</div><div class="sub">target ${S.settings.dailyHours}h</div></div>
  </div>
  <div class="grid g2 section">
    <div class="card"><div class="card-head"><h3>Subject accuracy</h3><a class="small" href="#/plan">Details</a></div>
      ${practised.length ? practised.sort((a, b) => ss[a.id].c / ss[a.id].n - ss[b.id].c / ss[b.id].n).map(s => { const v = ss[s.id], a = pct(v.c, v.n); return `<div class="subj-row"><span>${esc(s.name.replace(/ \(.*\)/, ''))}</span><div class="bar ${a >= 70 ? 'ok' : a >= 50 ? 'warn' : 'bad'}"><i style="width:${a}%"></i></div><span>${a}%</span></div>`; }).join('') : '<p class="empty">Solve a few questions to see your subject-wise accuracy.</p>'}
    </div>
    <div>
      <div class="card"><div class="card-head"><h3>Focus areas</h3></div>
        ${weak.length ? weak.map((w, i) => `<div class="row" style="padding:5px 0"><span>${esc(subjectName(w.s))}${w.t ? ` · <span class="muted">${esc(w.t)}</span>` : ''}</span><span class="spacer"></span><span class="tag bad">${Math.round(w.acc * 100)}%</span><button class="btn sm" data-weak="${i}">Practise</button></div>`).join('') : '<p class="muted small">Your weakest topics will appear here after ~3 attempts per topic.</p>'}
      </div>
      <div class="card"><div class="card-head"><h3>Due for review</h3></div>
        <div class="row"><a class="btn sm" href="#/practice">${S.mistakes.length} mistakes</a><a class="btn sm" href="#/cards">${cardsDue} flashcards</a></div>
      </div>
    </div>
  </div>`;
  $('#hDay', el).onclick = () => morningBriefing(false);
  $('#hPractice', el).onclick = () => startPractice({ subject: '', source: 'ai', difficulty: 'mixed', style: 'mixed' });
  $('#hMock', el).onclick = () => startMock(25);
  el.querySelectorAll('[data-weak]').forEach(b => b.onclick = () => { const w = weak[+b.dataset.weak]; startPractice({ subject: w.s, topic: w.t, source: 'ai', difficulty: 'mixed', style: 'mixed' }); });
}
