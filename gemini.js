// Minimal Google Gemini REST client (runs in the browser; key stays on this device).
import { S } from './store.js';

export class AIError extends Error {}
export const hasKey = () => !!S.settings.apiKey?.trim();

export function langInstruction() {
  return S.settings.lang === 'te'
    ? 'Reply in simple, friendly Telugu (తెలుగు script). Keep medical terms, drug names, investigations and exam keywords in English within the Telugu sentences.'
    : 'Reply in clear Indian English.';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * @param {object} o
 * @param {string} [o.system]   system instruction
 * @param {string} [o.prompt]   single user prompt
 * @param {{role:string,text:string}[]} [o.messages] conversation
 * @param {boolean} [o.json]    ask for JSON output and parse it
 */
export async function gemini({ system, prompt, messages, json = false, temperature = 0.8, signal } = {}) {
  const key = S.settings.apiKey?.trim();
  if (!key) throw new AIError('Add your free Gemini API key in Settings to use AI features.');
  const model = (S.settings.model || 'gemini-2.5-flash').trim();
  const contents = messages
    ? messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
    : [{ role: 'user', parts: [{ text: prompt }] }];
  const body = { contents, generationConfig: { temperature } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (json) body.generationConfig.responseMimeType = 'application/json';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      lastErr = new AIError('Network error — check your internet connection.');
      await sleep(800 * (attempt + 1));
      continue;
    }
    if (res.ok) {
      const data = await res.json();
      const cand = data.candidates?.[0];
      const text = (cand?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
      if (!text) throw new AIError(cand?.finishReason === 'SAFETY' ? 'The AI declined this request.' : 'Empty response from AI. Try again.');
      return json ? parseJSON(text) : text;
    }
    let msg = `AI error ${res.status}`;
    try { const e = await res.json(); msg = e.error?.message || msg; } catch {}
    if (res.status === 400 && /api key/i.test(msg)) throw new AIError('Your Gemini API key looks invalid. Check it in Settings.');
    if (res.status === 403) throw new AIError('API key not permitted (403). Create a new key at aistudio.google.com.');
    if (res.status === 404) throw new AIError(`Model "${model}" not found. Pick another model in Settings.`);
    lastErr = new AIError(res.status === 429 ? 'Rate limit reached on the free tier — wait a minute and try again.' : msg);
    if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
    throw lastErr;
  }
  throw lastErr;
}

export function parseJSON(t) {
  const clean = t.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(clean); } catch {}
  const m = clean.match(/[[{][\s\S]*[\]}]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  throw new AIError('AI returned an unreadable answer. Please try again.');
}
