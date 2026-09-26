// Flashcards with SM-2 spaced repetition; AI can generate decks for any topic.
import { S, save, uid } from './store.js';
import { gemini, hasKey } from './gemini.js';
import { SUBJECTS, subjectName, byId } from './syllabus.js';
import { esc, md, toast, loader, noKeyNotice, $ } from './ui.js';
import { speak } from './voice.js';
import { markActive } from './stats.js';

let root = null, tab = 'review', flipped = false;

export function addCard({ front, back, subject = '' }) {
  S.cards.push({ id: uid(), front, back, subject, ef: 2.5, interval: 0, reps: 0, due: Date.now() });
  save();
}

const due = () => S.cards.filter(c => c.due <= Date.now()).sort((a, b) => a.due - b.due);

function grade(card, q) { // q: 0 again, 3 hard, 4 good, 5 easy
  if (q < 3) { card.reps = 0; card.interval = 0; card.due = Date.now() + 10 * 60000; }
  else {
    card.reps++;
    card.interval = card.reps === 1 ? 1 : card.reps === 2 ? 3 : Math.round(card.interval * card.ef);
    if (q === 3) card.interval = Math.max(1, Math.round(card.interval * 0.8));
    card.due = Date.now() + card.interval * 86400000;
  }
  card.ef = Math.max(1.3, card.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  markActive();
  save();
}

export function renderCards(el) {
  root = el;
  const d = due();
  el.innerHTML = `<div class="row" style="margin-bottom:14px">
    <button class="btn ${tab === 'review' ? 'primary' : ''}" data-tab="review">Review (${d.length} due)</button>
    <button class="btn ${tab === 'gen' ? 'primary' : ''}" data-tab="gen">Generate with AI</button>
    <button class="btn ${tab === 'all' ? 'primary' : ''}" data-tab="all">All cards (${S.cards.length})</button></div>
    <div id="cBody"></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; flipped = false; renderCards(el); });
  const body = $('#cBody', el);
  if (tab === 'review') drawReview(body, d);
  else if (tab === 'gen') drawGen(body);
  else drawAll(body);
}

function drawReview(body, d) {
  const c = d[0];
  if (!c) { body.innerHTML = `<div class="card empty">No cards due. ${S.cards.length ? 'Come back later or generate more.' : 'Generate your first deck with AI or add cards from practice questions.'}</div>`; return; }
  body.innerHTML = `<div class="card">
    <div class="q-meta">${c.subject ? `<span class="tag p">${esc(subjectName(c.subject))}</span>` : ''}<span class="tag">${d.length} due</span></div>
    <div class="flash ${flipped ? 'flipped' : ''}" id="flash"><div class="flash-inner">
      <div class="flash-face front">${esc(c.front)}</div>
      <div class="flash-face back"><div>${md(c.back)}</div></div>
    </div></div>
    <div class="row" style="justify-content:center;margin-top:14px">${flipped
      ? `<button class="btn" data-g="0">Again</button><button class="btn" data-g="3">Hard</button><button class="btn primary" data-g="4">Good</button><button class="btn" data-g="5">Easy</button>`
      : `<button class="btn primary" id="flip">Show answer</button><button class="btn" id="say">Read aloud</button>`}</div>
  </div>`;
  $('#flash', body).onclick = () => { flipped = !flipped; renderCards(root); };
  if (flipped) body.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { grade(c, +b.dataset.g); flipped = false; renderCards(root); });
  else { $('#flip', body).onclick = () => { flipped = true; renderCards(root); }; $('#say', body).onclick = () => speak(c.front); }
}

function drawGen(body) {
  body.innerHTML = `${hasKey() ? '' : noKeyNotice()}<div class="card"><h3>Generate a high-yield deck</h3>
    <div class="grid g3">
      <label class="field">Subject<select id="gSub">${SUBJECTS.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
      <label class="field">Topic<input id="gTopic" type="text" placeholder="e.g. Antitubercular drugs" /></label>
      <label class="field">Cards<select id="gN"><option>10</option><option selected>15</option><option>25</option></select></label>
    </div>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="gGo">Generate</button></div><div id="gOut"></div></div>
    <div class="card"><h3>Add your own card</h3><div class="grid g2"><label class="field">Front<textarea id="mF"></textarea></label><label class="field">Back<textarea id="mB"></textarea></label></div><button class="btn" id="mAdd" style="margin-top:10px">Add card</button></div>`;
  $('#gGo', body).onclick = async () => {
    if (!hasKey()) return toast('Add your Gemini API key in Settings.', 'bad');
    const subject = $('#gSub', body).value, topic = $('#gTopic', body).value.trim() || byId[subject].topics.join(', ');
    const n = +$('#gN', body).value;
    $('#gOut', body).innerHTML = loader('Creating flashcards…');
    try {
      const raw = await gemini({
        system: 'You create accurate, exam-focused NEET PG flashcards from standard Indian textbooks. JSON only.',
        prompt: `Create ${n} high-yield flashcards for ${subjectName(subject)} — ${topic}. Front: a crisp question or cue (max 20 words). Back: the answer with one key supporting fact (max 40 words). Prioritise frequently asked NEET PG facts, "most common", drug of choice, investigation of choice, classic signs, numbers.\nJSON: {"cards":[{"front":"","back":""}]}`,
        json: true, temperature: 0.7,
      });
      const cards = (raw.cards || raw || []).filter(c => c.front && c.back);
      cards.forEach(c => addCard({ front: c.front, back: c.back, subject }));
      toast(`${cards.length} cards added`, 'ok');
      tab = 'review'; renderCards(root);
    } catch (e) { toast(e.message, 'bad'); $('#gOut', body).innerHTML = ''; }
  };
  $('#mAdd', body).onclick = () => {
    const f = $('#mF', body).value.trim(), b = $('#mB', body).value.trim();
    if (!f || !b) return toast('Fill both sides');
    addCard({ front: f, back: b }); toast('Card added', 'ok'); $('#mF', body).value = ''; $('#mB', body).value = '';
  };
}

function drawAll(body) {
  if (!S.cards.length) { body.innerHTML = '<div class="card empty">No cards yet.</div>'; return; }
  body.innerHTML = `<div class="card table-wrap"><table><tr><th>Front</th><th>Subject</th><th>Next due</th><th></th></tr>${S.cards.map(c => `<tr><td>${esc(c.front.slice(0, 100))}</td><td>${esc(subjectName(c.subject) || '-')}</td><td>${new Date(c.due).toLocaleDateString()}</td><td><button class="btn sm danger" data-del="${c.id}">Delete</button></td></tr>`).join('')}</table></div>`;
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.cards = S.cards.filter(c => c.id !== b.dataset.del); save(); renderCards(root); });
}

export function cardsVoice(cmd) {
  const c = due()[0];
  if (!c) return false;
  if (cmd.type === 'read') { speak(flipped ? c.back : c.front); return true; }
  if (cmd.type === 'flip' || cmd.type === 'explain') { flipped = true; renderCards(root); speak(c.back); return true; }
  if (cmd.type === 'grade') { grade(c, cmd.q); flipped = false; renderCards(root); const n = due()[0]; if (n) speak(n.front); return true; }
  return false;
}
