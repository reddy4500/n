// Voice command router (English + Telugu). Anything unrecognised goes to the AI mentor.
import { go, currentRoute } from './nav.js';
import { findSubject } from './syllabus.js';
import { quizVoice, quizActive, startPractice, startMock } from './quiz.js';
import { cardsVoice } from './cards.js';
import { morningBriefing } from './daily.js';
import { startPomo, pausePomo } from './plan.js';
import { askMentor } from './mentor.js';
import { speak, stopSpeaking } from './voice.js';
import { S } from './store.js';

const OPT = {
  a: 0, ay: 0, eh: 0, 'ఏ': 0, 'ఎ': 0, one: 0, '1': 0, first: 0, 'ఒకటి': 0, 'ఒకటో': 0,
  b: 1, bee: 1, bi: 1, 'బీ': 1, 'బి': 1, two: 1, '2': 1, second: 1, 'రెండు': 1, 'రెండో': 1,
  c: 2, see: 2, sea: 2, si: 2, 'సీ': 2, 'సి': 2, three: 2, '3': 2, third: 2, 'మూడు': 2, 'మూడో': 2,
  d: 3, dee: 3, di: 3, 'డీ': 3, 'డి': 3, four: 3, '4': 3, fourth: 3, 'నాలుగు': 3, 'నాలుగో': 3,
};
const PAGES = [
  ['home', ['home', 'dashboard', 'హోమ్']], ['practice', ['practice', 'ప్రాక్టీస్']], ['mock', ['mock', 'మాక్']],
  ['mentor', ['mentor', 'guru', 'chat', 'గురు']], ['daily', ['daily', 'today', 'రోజు']], ['cards', ['flashcard', 'flash card', 'cards', 'ఫ్లాష్']],
  ['plan', ['planner', 'plan', 'timer', 'ప్లాన్']], ['settings', ['settings', 'setting', 'సెట్టింగ్']],
];

const say = (en, te) => speak(S.settings.lang === 'te' && te ? te : en);

export function handleCommand(raw) {
  const t = ' ' + raw.toLowerCase().replace(/[.,!?।"]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const has = (...w) => w.some(x => t.includes(x));
  const words = t.trim().split(' ');
  const route = currentRoute();

  // 1. Answer option (only when a question is on screen)
  if (quizActive()) {
    const explicit = words.findIndex(w => ['option', 'answer', 'ఆప్షన్', 'జవాబు', 'సమాధానం'].includes(w));
    const cand = explicit >= 0 ? words[explicit + 1] : words.length <= 2 ? words[words.length - 1] : null;
    if (cand && cand in OPT && (explicit >= 0 || words.length <= 2)) { quizVoice({ type: 'option', i: OPT[cand] }); return `Option ${'ABCD'[OPT[cand]]}`; }
  }

  // 2. Timer
  if (has('timer', 'pomodoro', 'టైమర్', 'focus session')) {
    if (has('stop', 'pause', 'ఆపు', 'ఆపండి')) { pausePomo(); say('Timer paused.', 'టైమర్ ఆపాను.'); return 'Timer paused'; }
    go('plan'); setTimeout(startPomo, 100); say('Focus timer started. All the best!', 'టైమర్ మొదలైంది. All the best!'); return 'Timer started';
  }

  // 3. Stop talking
  if (/^ ?(stop|stop speaking|quiet|silence|ఆపు|ఆపండి|చాలు) ?$/.test(t)) { stopSpeaking(); return 'Stopped'; }

  // 4. Daily agent
  if (has('good morning', 'briefing', "today's plan", 'todays plan', 'plan my day', 'start my day', 'శుభోదయం', 'గుడ్ మార్నింగ్', 'ఈ రోజు ప్లాన్', 'ఈరోజు ప్లాన్')) { morningBriefing(true); return 'Daily briefing'; }
  if (has('good night', 'check in', 'check-in', 'checkin', 'evening report', 'శుభరాత్రి', 'గుడ్ నైట్')) {
    go('daily');
    say('Let\'s do your evening check-in. Enter your hours and how the day went, then submit.', 'Evening check-in చేద్దాం. ఈ రోజు ఎన్ని గంటలు చదివారో, ఎలా జరిగిందో నమోదు చేయండి.');
    setTimeout(() => document.getElementById('jH')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    return 'Evening check-in';
  }

  // 5. Start mock / quiz / review
  const startish = has('start', 'begin', 'take', 'give me', 'ask me', 'let\'s', 'ప్రారంభ', 'మొదలు', 'ఇవ్వు', 'అడుగు', 'స్టార్ట్');
  if (has('mock', 'grand test', 'మాక్') && (startish || route !== 'mock')) {
    const n = (t.match(/\b(25|50|100|200)\b/) || [])[1];
    startMock(n ? +n : 50); return 'Starting mock test';
  }
  if (has('mistake', 'wrong questions', 'తప్పు')) { startPractice({ source: 'review' }); return 'Reviewing mistakes'; }
  if (has('quiz', 'questions', 'mcq', 'క్విజ్', 'ప్రశ్నలు') || (has('practice', 'ప్రాక్టీస్') && startish)) {
    const s = findSubject(t);
    startPractice({ subject: s?.id || '', source: 'ai', difficulty: has('hard', 'difficult', 'కష్ట') ? 'hard' : has('easy', 'సులభ') ? 'easy' : 'mixed', style: 'mixed' });
    say(`Starting ${s ? s.name : 'mixed'} practice.`, `${s ? s.name : 'Mixed'} practice మొదలు పెడుతున్నాను.`);
    return `Practice: ${s ? s.name : 'mixed'}`;
  }

  // 6. In-quiz controls
  if (quizActive()) {
    if (has(' next', 'skip', 'తరువాత', 'తర్వాత', 'నెక్స్ట్')) { quizVoice({ type: 'next' }); return 'Next'; }
    if (has('previous', ' back ', 'వెనక్కి', 'ముందుది')) { quizVoice({ type: 'prev' }); return 'Previous'; }
    if (has('explain', 'why', 'వివరించు', 'ఎందుకు', 'వివరణ')) { quizVoice({ type: 'explain' }); return 'Explaining'; }
    if (has('read', 'repeat', 'చదువు', 'మళ్ళీ', 'మళ్లీ')) { quizVoice({ type: 'read' }); return 'Reading'; }
    if (has('submit', 'సబ్మిట్')) { quizVoice({ type: 'submit' }); return 'Submitted'; }
    if (has('end session', 'finish', 'ముగించు')) { quizVoice({ type: 'stop' }); return 'Session ended'; }
  }

  // 7. Flashcards
  if (route === 'cards') {
    if (has('show answer', 'flip', 'answer', 'జవాబు')) { cardsVoice({ type: 'flip' }); return 'Answer'; }
    const g = has('again', 'మళ్ళీ') ? 0 : has('hard', 'కష్టం') ? 3 : has('easy', 'సులభం') ? 5 : has('good', 'బాగుంది') ? 4 : null;
    if (g !== null && words.length <= 3) { cardsVoice({ type: 'grade', q: g }); return 'Graded'; }
    if (has('read', 'చదువు')) { cardsVoice({ type: 'read' }); return 'Reading'; }
  }

  // 8. Navigation
  if (has('open', 'go to', 'show', 'తెరువు', 'చూపించు') || words.length <= 2) {
    for (const [r, keys] of PAGES) if (keys.some(k => t.includes(k))) { go(r); return `Opening ${r}`; }
  }

  // 9. Everything else → mentor
  askMentor(raw.trim(), { voice: true });
  return 'Asking Guru…';
}
