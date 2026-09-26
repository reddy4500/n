// App shell: router, navigation, global voice mic, keyboard shortcuts, reminders, PWA.
import { S } from './store.js';
import { icon, toast } from './ui.js';
import { currentRoute, go } from './nav.js';
import { currentStreak, daysLeft } from './stats.js';
import { applyTheme } from './theme.js';
import { startListening, stopListening, isListening, canListen } from './voice.js';
import { handleCommand } from './commands.js';
import { renderHome } from './home.js';
import { renderPractice, renderMock, quizVoice, quizActive } from './quiz.js';
import { renderMentor } from './mentor.js';
import { renderDaily, checkReminders } from './daily.js';
import { renderCards } from './cards.js';
import { renderPlan } from './plan.js';
import { renderSettings } from './settings.js';

const ROUTES = {
  home: { title: 'Home', icon: 'home', render: renderHome },
  daily: { title: 'Daily Coach', icon: 'daily', render: renderDaily },
  practice: { title: 'Practice', icon: 'practice', render: renderPractice },
  mock: { title: 'Mock Test', icon: 'mock', render: renderMock },
  mentor: { title: 'AI Mentor', icon: 'mentor', render: renderMentor },
  cards: { title: 'Flashcards', icon: 'cards', render: renderCards },
  plan: { title: 'Planner', icon: 'plan', render: renderPlan },
  settings: { title: 'Settings', icon: 'settings', render: renderSettings },
};

const view = document.getElementById('view');

function renderNav(active) {
  const links = Object.entries(ROUTES).map(([k, r]) => `<a href="#/${k}" class="${k === active ? 'active' : ''}">${icon(r.icon)}<span>${r.title}</span></a>`).join('');
  document.getElementById('nav').innerHTML = links;
  document.getElementById('bottomNav').innerHTML = links;
  document.getElementById('sidebarFoot').innerHTML = S.settings.apiKey ? 'AI: Gemini connected' : '<a href="#/settings">Add Gemini key</a> to enable AI';
}

function renderPills() {
  const st = currentStreak(), dl = daysLeft();
  document.getElementById('streakPill').textContent = st ? `${st}-day streak` : '';
  document.getElementById('countdownPill').textContent = dl !== null ? `${dl} days to exam` : '';
}

function route() {
  let r = currentRoute();
  if (!ROUTES[r]) { r = 'home'; history.replaceState(null, '', '#/home'); }
  renderNav(r);
  renderPills();
  document.getElementById('pageTitle').textContent = ROUTES[r].title;
  try { ROUTES[r].render(view); }
  catch (e) { console.error(e); view.innerHTML = `<div class="card"><h3>Something went wrong</h3><p class="muted">${e.message}</p></div>`; }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
window.addEventListener('settings-changed', () => { renderNav(currentRoute()); renderPills(); });

/* ---- Voice mic ---- */
const fab = document.getElementById('micFab');
const bar = document.getElementById('voiceBar');
const barText = document.getElementById('voiceText');
let hideT;
function showBar(text, keep = false) {
  bar.hidden = false; barText.textContent = text;
  clearTimeout(hideT);
  if (!keep) hideT = setTimeout(() => { if (!isListening()) bar.hidden = true; }, 2500);
}
function onState(s) {
  if (s.error) { toast(s.error, 'bad'); fab.classList.remove('on'); bar.hidden = true; return; }
  if (s.on === true) { fab.classList.add('on'); showBar(S.settings.lang === 'te' ? 'వింటున్నాను…' : 'Listening…', true); }
  if (s.on === false) { fab.classList.remove('on'); if (!barText.dataset.result) bar.hidden = true; }
  if (s.interim) showBar(s.interim, true);
}
function onText(text) {
  const res = handleCommand(text);
  barText.dataset.result = '1';
  showBar(`“${text}” → ${res}`);
  setTimeout(() => { delete barText.dataset.result; }, 2600);
}
function toggleMic() {
  if (!canListen) { toast('Voice input needs Chrome or Edge (desktop or Android).', 'bad'); return; }
  if (isListening()) stopListening();
  else startListening({ continuous: !!S.settings.handsFree, onText, onState });
}
fab.addEventListener('click', toggleMic);

/* ---- Keyboard shortcuts ---- */
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'm') { e.preventDefault(); toggleMic(); return; }
  if (!quizActive()) return;
  if (['1', '2', '3', '4', 'a', 'b', 'c', 'd'].includes(k)) { e.preventDefault(); quizVoice({ type: 'option', i: '1234'.includes(k) ? +k - 1 : 'abcd'.indexOf(k) }); }
  else if (k === 'n' || k === 'arrowright') { e.preventDefault(); quizVoice({ type: 'next' }); }
  else if (k === 'p' || k === 'arrowleft') { e.preventDefault(); quizVoice({ type: 'prev' }); }
});

/* ---- Reminders & PWA ---- */
setInterval(checkReminders, 30000);
setTimeout(checkReminders, 3000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed', err));
  navigator.serviceWorker.addEventListener?.('message', e => { if (e.data?.route) go(e.data.route); });
}

applyTheme();
if (!location.hash) history.replaceState(null, '', S.settings.apiKey ? '#/home' : '#/settings');
route();
if (!S.settings.apiKey) setTimeout(() => toast('Welcome! Add your free Gemini API key to unlock the AI agent.', '', 5000), 400);
