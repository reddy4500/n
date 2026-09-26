import { S, save, uid } from './store.js';
import { gemini } from './gemini.js';
import { BANK } from './bank.js';
import { byId, subjectName, shuffle } from './syllabus.js';

const SYSTEM = `You are a senior NEET PG question setter who writes questions in the NBEMS style.
- Write single-best-answer MCQs with exactly 4 options and one unambiguous correct answer.
- Prefer short clinical vignettes and "most common / drug of choice / investigation of choice / next best step" formats seen in recent NEET PG papers; include image-free recall and concept questions too.
- Facts must be accurate per standard Indian references (Robbins, Harrison, Bailey & Love, KD Tripathi, Park's PSM, Williams/DC Dutta, Ghai/Nelson, Dhingra, Khurana, Maheshwari, Reddy FMT) and current Indian national guidelines.
- Explanations: 3–5 sentences — why the answer is right and why each distractor is wrong. Never refer to option letters or positions (options will be shuffled).
- "pearl": one crisp high-yield line to remember.
Return JSON only.`;

function normalise(raw, fallbackSubject, topic) {
  const list = Array.isArray(raw) ? raw : raw?.questions || [];
  const out = [];
  for (const q of list) {
    const options = (q.options || []).map(o => String(o).replace(/^\s*[A-D][).:\-]\s+/i, '').trim());
    const ans = Number(q.answer ?? q.correct ?? q.answerIndex);
    if (!q.stem && !q.question) continue;
    if (options.length !== 4 || !(ans >= 0 && ans <= 3)) continue;
    // shuffle options so the answer position is random
    const order = shuffle([0, 1, 2, 3]);
    const subj = byId[q.subject] ? q.subject : (Object.values(byId).find(s => s.name.toLowerCase() === String(q.subject || '').toLowerCase())?.id || fallbackSubject);
    out.push({
      id: 'ai-' + uid(),
      subject: subj,
      topic: q.topic || topic || '',
      difficulty: q.difficulty || 'moderate',
      stem: String(q.stem || q.question).trim(),
      options: order.map(i => options[i]),
      answer: order.indexOf(ans),
      explanation: q.explanation || '',
      pearl: q.pearl || q.highYield || '',
      src: 'ai',
    });
  }
  return out;
}

/**
 * Generate fresh MCQs with Gemini.
 * @param {{subjects:string[], topic?:string, difficulty?:string, style?:string}} o  subjects: one id per question
 */
export async function generateQuestions({ subjects, topic = '', difficulty = 'mixed', style = 'mixed', signal }) {
  const n = subjects.length;
  const avoid = S.seen.slice(-40).map(s => `- ${s}`).join('\n');
  const prompt = `Create ${n} NEW NEET PG MCQs.
Subjects, one per question in this order: ${subjects.map(subjectName).join(', ')}.
${topic ? `Topic focus: ${topic}.` : 'Spread across high-yield topics; vary them.'}
Difficulty: ${difficulty === 'mixed' ? 'mix of easy, moderate and hard (NEET PG level)' : difficulty}.
Style: ${style === 'clinical' ? 'mostly clinical vignettes' : style === 'recall' ? 'mostly one-liner recall questions' : 'mix of clinical vignettes and one-liners'}.
Do not repeat these recently asked stems:
${avoid || '- (none)'}

JSON schema:
{"questions":[{"subject":"<subject name>","topic":"<specific topic>","difficulty":"easy|moderate|hard","stem":"...","options":["...","...","...","..."],"answer":<0-3 index of correct option>,"explanation":"...","pearl":"..."}]}`;
  const raw = await gemini({ system: SYSTEM, prompt, json: true, temperature: 0.95, signal });
  const qs = normalise(raw, subjects[0], topic);
  qs.forEach((q, i) => { if (!byId[q.subject]) q.subject = subjects[i] || subjects[0]; });
  if (!qs.length) throw new Error('No valid questions returned. Try again.');
  S.seen.push(...qs.map(q => q.stem.slice(0, 90)));
  save();
  return qs;
}

export function bankQuestions(n, subject) {
  let pool = BANK.filter(q => !subject || q.subject === subject);
  if (!pool.length) pool = BANK;
  return shuffle(pool.map(q => {
    const order = shuffle([0, 1, 2, 3]);
    return { ...q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
  })).slice(0, n);
}
