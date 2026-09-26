// Daily agent: morning briefing + plan, question of the day, evening check-in, reminders.
import { S, save, today } from './store.js';
import { gemini, hasKey, langInstruction } from './gemini.js';
import { summaryForAI, weakAreas, recordAttempt, daysLeft, markActive, totals } from './stats.js';
import { generateQuestions, bankQuestions } from './questions.js';
import { SUBJECTS, subjectMix, subjectName } from './syllabus.js';
import { esc, md, toast, loader, noKeyNotice, fmtMin, $ } from './ui.js';
import { speak } from './voice.js';
import { currentRoute, go } from './nav.js';

let root = null, busy = { plan: false, qotd: false, check: false };
const L = 'ABCD';

export function renderDaily(el) {
  root = el;
  const t = today(), plan = S.plans[t], j = S.journal.find(x => x.date === t);
  const hour = new Date().getHours();
  const done = plan ? plan.tasks.filter(x => x.done).length : 0;
  el.innerHTML = `${hasKey() ? '' : noKeyNotice()}
  <div class="card hero">
    <div class="card-head"><div><h2 style="margin:0">${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}${S.settings.name ? ', Dr. ' + esc(S.settings.name) : ''}</h2>
    <div class="muted">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}${daysLeft() !== null ? ` · ${daysLeft()} days to NEET PG` : ''}</div></div>
    <div class="row"><button class="btn" id="dBrief">${plan ? 'Hear briefing' : 'Start my day'}</button></div></div>
  </div>
  <div class="grid g2 section">
    <div class="card">
      <div class="card-head"><h3>Today's plan</h3>${plan ? `<span class="tag p">${done}/${plan.tasks.length} done</span>` : ''}</div>
      <div id="dPlan">${busy.plan ? loader('Your AI coach is planning your day…') : plan ? planHTML(plan) : '<p class="muted">Tap <b>Start my day</b> and your AI coach will build today\'s plan from your weak areas, backlog and exam countdown.</p>'}</div>
      ${plan ? '<div class="row" style="margin-top:10px"><button class="btn sm" id="dRegen">Regenerate plan</button></div>' : ''}
    </div>
    <div class="card"><div class="card-head"><h3>Question of the day</h3></div><div id="dQotd">${qotdHTML()}</div></div>
  </div>
  <div class="card section">
    <div class="card-head"><h3>Evening check-in</h3>${j ? '<span class="tag ok">Done today</span>' : ''}</div>
    ${j ? `<p class="muted small">${j.hours}h studied · mood ${j.mood}/5</p><div class="explain">${md(j.feedback || '')}</div>` : `
    <div class="grid g2">
      <label class="field">Hours studied today<input id="jH" type="number" min="0" max="18" step="0.5" value="${(totals().todayMin / 60).toFixed(1)}" /></label>
      <label class="field">Mood / energy<select id="jM"><option value="5">5 — great</option><option value="4" selected>4 — good</option><option value="3">3 — okay</option><option value="2">2 — low</option><option value="1">1 — exhausted</option></select></label>
      <label class="field">What went well?<textarea id="jG" placeholder="Finished Pharma ANS, 80 MCQs"></textarea></label>
      <label class="field">What was hard?<textarea id="jD" placeholder="Couldn't remember biostatistics formulas"></textarea></label>
    </div>
    <div class="row" style="margin-top:10px"><button class="btn primary" id="jSave">${busy.check ? 'Reviewing…' : 'Submit check-in'}</button></div>`}
  </div>
  <div class="card"><h3>Past 7 check-ins</h3>${S.journal.length ? `<div class="table-wrap"><table><tr><th>Date</th><th>Hours</th><th>Mood</th><th>Went well</th><th>Hard</th></tr>${S.journal.slice(-7).reverse().map(x => `<tr><td>${x.date}</td><td>${x.hours}</td><td>${x.mood}/5</td><td>${esc(x.good || '-')}</td><td>${esc(x.hard || '-')}</td></tr>`).join('')}</table></div>` : '<p class="muted small">No check-ins yet.</p>'}</div>`;

  $('#dBrief', el).onclick = () => (plan ? speak(briefingText(plan)) : morningBriefing(true));
  $('#dRegen', el)?.addEventListener('click', () => morningBriefing(false, true));
  el.querySelectorAll('[data-task]').forEach(cb => cb.onchange = () => { plan.tasks[+cb.dataset.task].done = cb.checked; if (cb.checked) markActive(); save(); renderDaily(el); });
  $('#jSave', el)?.addEventListener('click', () => eveningCheckin({ hours: +$('#jH', el).value || 0, mood: +$('#jM', el).value, good: $('#jG', el).value.trim(), hard: $('#jD', el).value.trim() }));
  bindQotd(el);
}

const planHTML = p => `${p.greeting ? `<p>${esc(p.greeting)}</p>` : ''}<ul class="tasks">${p.tasks.map((t, i) => `<li class="${t.done ? 'done' : ''}"><input type="checkbox" data-task="${i}" ${t.done ? 'checked' : ''}/><span>${esc(t.text)} ${t.minutes ? `<span class="tag">${fmtMin(t.minutes)}</span>` : ''}</span></li>`).join('')}</ul>${p.tip ? `<p class="small" style="margin-top:10px"><b>Tip:</b> ${esc(p.tip)}</p>` : ''}${p.motivation ? `<p class="small muted"><i>${esc(p.motivation)}</i></p>` : ''}`;

const briefingText = p => `${p.greeting || ''} Here is your plan for today. ${p.tasks.map((t, i) => `${i + 1}. ${t.text}`).join('. ')}. ${p.tip ? 'Tip: ' + p.tip : ''} ${p.motivation || ''}`;

function fallbackPlan() {
  const weak = weakAreas(3);
  const hrs = S.settings.dailyHours || 8;
  const subs = weak.length ? weak.map(w => subjectName(w.s) + (w.t ? ` – ${w.t}` : '')) : subjectMix(3).map(subjectName);
  return {
    greeting: `Let's make today count${S.settings.name ? ', Dr. ' + S.settings.name : ''}!`,
    tasks: [
      { text: `Revise ${subs[0]} (theory + notes)`, minutes: Math.round(hrs * 60 * 0.3) },
      { text: `Practise 40 MCQs on ${subs[0]}`, minutes: 60 },
      { text: `Revise ${subs[1] || subs[0]}`, minutes: Math.round(hrs * 60 * 0.2) },
      { text: `Practise 30 MCQs on ${subs[2] || subs[0]}`, minutes: 45 },
      { text: `Review saved mistakes (${S.mistakes.length}) and due flashcards`, minutes: 30 },
      { text: 'Evening check-in and plan tomorrow', minutes: 10 },
    ],
    tip: 'Use active recall: close the book and write what you remember before checking.',
    motivation: 'Consistency beats intensity. One focused day at a time.',
  };
}

export async function morningBriefing(voice = false, force = false) {
  const t = today();
  if (S.plans[t] && !force) { if (voice) speak(briefingText(S.plans[t])); if (currentRoute() !== 'daily') go('daily'); return; }
  if (busy.plan) return;
  if (currentRoute() !== 'daily') go('daily');
  let plan;
  if (!hasKey()) plan = fallbackPlan();
  else {
    busy.plan = true; if (root) renderDaily(root);
    try {
      const r = await gemini({
        system: `You are a NEET PG daily study coach. ${langInstruction()} Return JSON only.`,
        prompt: `Build today's study plan for this student. Use their weak areas, untouched subjects, mistakes backlog, days left to exam and target hours. Include: 1–2 revision blocks, MCQ practice targets (with numbers), a flashcard/mistake review block, short breaks, and one mock test if appropriate (e.g. weekly). Total time close to their target hours. Tasks must be concrete ("Revise Pathology – Neoplasia: hallmarks, tumour markers; then 40 MCQs").\n\n${summaryForAI()}\n\nJSON: {"greeting":"1 short line","tasks":[{"text":"","minutes":0,"subject":""}],"tip":"one study technique tip","motivation":"one short line"}`,
        json: true, temperature: 0.8,
      });
      plan = { greeting: r.greeting || '', tasks: (r.tasks || []).map(x => ({ text: x.text, minutes: +x.minutes || 0, subject: x.subject || '', done: false })), tip: r.tip || '', motivation: r.motivation || '' };
      if (!plan.tasks.length) plan = fallbackPlan();
    } catch (e) { toast(e.message + ' Showing a basic plan.', 'bad'); plan = fallbackPlan(); }
    finally { busy.plan = false; }
  }
  S.plans[t] = plan; save();
  if (root && currentRoute() === 'daily') renderDaily(root);
  if (voice || S.settings.voiceReplies) speak(briefingText(plan));
}

function qotdHTML() {
  const d = S.qotd[today()];
  if (busy.qotd) return loader('Picking a question…');
  if (!d) return '<p class="muted small">One fresh high-yield question every day.</p><button class="btn" id="qGet">Get today\'s question</button>';
  const q = d.q, a = d.a;
  return `<div class="q-meta"><span class="tag p">${esc(subjectName(q.subject))}</span></div><div class="q-stem">${esc(q.stem)}</div>
  <div class="opts">${q.options.map((o, i) => `<button class="opt ${a != null ? (i === q.answer ? 'right' : i === a ? 'wrong' : '') : ''}" data-qo="${i}" ${a != null ? 'disabled' : ''}><b>${L[i]}</b><span>${esc(o)}</span></button>`).join('')}</div>
  ${a != null ? `<div class="explain">${md(q.explanation)}${q.pearl ? `<div class="pearl">${esc(q.pearl)}</div>` : ''}</div>` : ''}`;
}

function bindQotd(el) {
  $('#qGet', el)?.addEventListener('click', async () => {
    busy.qotd = true; $('#dQotd', el).innerHTML = qotdHTML();
    let q;
    try { q = hasKey() ? (await generateQuestions({ subjects: subjectMix(1), difficulty: 'moderate', style: 'clinical' }))[0] : bankQuestions(1)[0]; }
    catch (e) { toast(e.message, 'bad'); q = bankQuestions(1)[0]; }
    busy.qotd = false;
    S.qotd = { [today()]: { q, a: null } }; save();
    if (root) renderDaily(root);
  });
  el.querySelectorAll('[data-qo]').forEach(b => b.onclick = () => {
    const d = S.qotd[today()];
    d.a = +b.dataset.qo;
    recordAttempt(d.q, d.a === d.q.answer, 'qotd');
    save(); renderDaily(el);
  });
}

export async function eveningCheckin(entry) {
  if (busy.check) return;
  const t = today();
  const j = { date: t, ...entry, feedback: '' };
  busy.check = true;
  if (root) renderDaily(root);
  if (hasKey()) {
    try {
      const plan = S.plans[t];
      j.feedback = await gemini({
        system: `You are a caring but honest NEET PG coach doing an evening check-in. ${langInstruction()}`,
        prompt: `Evening check-in. Hours: ${j.hours}. Mood: ${j.mood}/5. Went well: ${j.good || '-'}. Hard: ${j.hard || '-'}.\nToday's plan: ${plan ? plan.tasks.map(x => `${x.done ? '[x]' : '[ ]'} ${x.text}`).join('; ') : 'none'}\n\n${summaryForAI()}\n\nReply in under 120 words: acknowledge effort, one specific fix for what was hard, and the top priority for tomorrow. If mood is low, include a brief wellbeing suggestion.`,
        temperature: 0.7,
      });
    } catch (e) { toast(e.message, 'bad'); }
  }
  if (!j.feedback) j.feedback = j.mood <= 2
    ? 'Well done for showing up on a tough day. Sleep 7–8 hours tonight, and start tomorrow with a light, easy win.'
    : `Good work today — ${j.hours} hours logged. Tomorrow, start with your weakest area first while your mind is fresh.`;
  busy.check = false;
  S.journal = S.journal.filter(x => x.date !== t);
  S.journal.push(j);
  markActive(); save();
  if (root && currentRoute() === 'daily') renderDaily(root);
  if (S.settings.voiceReplies) speak(j.feedback);
}

// Browser notifications for morning briefing / evening check-in (while the app or installed PWA is open).
export function checkReminders() {
  if (!S.settings.reminders || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), t = today();
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const n = (S.notified[t] ||= {});
  const fire = (title, body, route) => {
    const show = () => new Notification(title, { body, icon: 'icons/icon-192.png', tag: route });
    navigator.serviceWorker?.ready.then(reg => reg.showNotification(title, { body, icon: 'icons/icon-192.png', tag: route, data: { route } })).catch(show) ?? show();
  };
  if (!n.morning && hm >= S.settings.morningTime && !S.plans[t]) { n.morning = 1; fire('Good morning, Doctor!', 'Your AI coach is ready with today\'s NEET PG plan.', 'daily'); save(); }
  if (!n.evening && hm >= S.settings.eveningTime && !S.journal.some(x => x.date === t)) { n.evening = 1; fire('Evening check-in', 'How did today go? Log your study and get tomorrow\'s priority.', 'daily'); save(); }
  for (const k of Object.keys(S.notified)) if (k < t) delete S.notified[k];
}
