// AI Mentor: conversational coach with memory of your progress. Voice in + voice out.
import { S, save } from './store.js';
import { gemini, hasKey, langInstruction } from './gemini.js';
import { summaryForAI } from './stats.js';
import { esc, md, toast, noKeyNotice, $ } from './ui.js';
import { speak, stopSpeaking } from './voice.js';
import { go, currentRoute } from './nav.js';

let root = null, busy = false;

const CHIPS_EN = [
  'Make me a 7-day plan for my weakest subjects',
  'Give me 10 high-yield one-liners for Pharmacology',
  'Mnemonic for cranial nerve nuclei',
  'How should I revise PSM in the last month?',
  'I feel demotivated today',
  'Explain the ECG changes in hyperkalaemia',
];
const CHIPS_TE = [
  'నా weak subjects కి 7 రోజుల plan ఇవ్వు',
  'Pathology high-yield points చెప్పు',
  'ఈ రోజు motivation తక్కువగా ఉంది',
  'Last month revision ఎలా చేయాలి?',
];

function system() {
  return `You are "Guru", a warm, sharp NEET PG mentor and daily study companion for an Indian MBBS graduate.
- Teach with accuracy (standard Indian references, current NEET PG/NBEMS pattern and national guidelines). If unsure, say so.
- Be concise: short paragraphs, bullets, mnemonics, tables in text. Prefer high-yield exam-oriented points.
- Personalise using the student's live progress below; point out weak areas, suggest next actions inside this app (Practice, Mock test, Flashcards, Daily plan).
- Support wellbeing: encourage breaks, sleep and realistic goals. If the student expresses serious distress, respond with care and suggest talking to someone they trust or a professional helpline (e.g. Tele-MANAS 14416 in India).
- ${langInstruction()}

STUDENT PROGRESS (live):
${summaryForAI()}`;
}

export function renderMentor(el) {
  root = el;
  const chips = S.settings.lang === 'te' ? CHIPS_TE : CHIPS_EN;
  el.innerHTML = `${hasKey() ? '' : noKeyNotice()}
  <div class="card chat">
    <div class="card-head"><h3>Guru — your AI mentor</h3><div class="row"><button class="btn sm" id="cStop">Stop voice</button><button class="btn sm danger" id="cClear">Clear chat</button></div></div>
    <div class="msgs" id="msgs"></div>
    <div class="chips">${chips.map(c => `<button class="chip">${esc(c)}</button>`).join('')}</div>
    <form class="composer" id="cForm">
      <textarea id="cInput" rows="1" placeholder="${S.settings.lang === 'te' ? 'ఏదైనా అడగండి… (Enter to send)' : 'Ask anything — concepts, strategy, doubts… (Enter to send)'}"></textarea>
      <button class="btn primary" type="submit">Send</button>
    </form>
  </div>`;
  drawMsgs();
  const input = $('#cInput', el);
  $('#cForm', el).onsubmit = e => { e.preventDefault(); const t = input.value.trim(); if (t) { input.value = ''; sendMessage(t); } };
  input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#cForm', el).requestSubmit(); } };
  el.querySelectorAll('.chip').forEach(c => c.onclick = () => sendMessage(c.textContent));
  $('#cClear', el).onclick = () => { S.chat = []; save(); drawMsgs(); };
  $('#cStop', el).onclick = () => stopSpeaking();
}

function drawMsgs(typing = false) {
  const box = document.getElementById('msgs');
  if (!box) return;
  if (!S.chat.length && !typing) {
    box.innerHTML = `<div class="msg model">${md(S.settings.lang === 'te'
      ? `నమస్తే ${S.settings.name ? 'Dr. ' + S.settings.name : 'Doctor'}! నేను మీ NEET PG mentor **Guru**. Concepts, doubts, study plan, motivation — ఏదైనా అడగండి. Mic నొక్కి మాట్లాడవచ్చు కూడా.`
      : `Hi ${S.settings.name ? 'Dr. ' + S.settings.name : 'Doctor'}! I'm **Guru**, your NEET PG mentor. Ask me about concepts, doubts, strategy or motivation — or tap the mic and just talk.`)}</div>`;
    return;
  }
  box.innerHTML = S.chat.map(m => `<div class="msg ${m.role}">${m.role === 'user' ? esc(m.text).replace(/\n/g, '<br>') : md(m.text)}</div>`).join('')
    + (typing ? '<div class="msg model"><span class="typing"><i></i><i></i><i></i></span></div>' : '');
  box.scrollTop = box.scrollHeight;
}

export async function sendMessage(text, { voice = false } = {}) {
  if (busy) return;
  if (!hasKey()) { toast('Add your Gemini API key in Settings to chat with the mentor.', 'bad'); return; }
  S.chat.push({ role: 'user', text, ts: Date.now() });
  save();
  busy = true;
  drawMsgs(true);
  try {
    const history = S.chat.slice(-20).map(m => ({ role: m.role, text: m.text }));
    const reply = await gemini({ system: system(), messages: history, temperature: 0.7 });
    S.chat.push({ role: 'model', text: reply, ts: Date.now() });
    save();
    if (voice || S.settings.voiceReplies) speak(reply);
  } catch (e) {
    toast(e.message, 'bad');
    S.chat.pop(); save();
  } finally {
    busy = false;
    drawMsgs();
  }
}

// Open the mentor and send a message (used from quizzes, daily, voice).
export function askMentor(text, opts) {
  if (currentRoute() !== 'mentor') go('mentor');
  setTimeout(() => sendMessage(text, opts), 50);
}
