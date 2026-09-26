// Speech recognition (voice commands) + speech synthesis (spoken replies). English (en-IN) and Telugu (te-IN).
import { S } from './store.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export const canSpeak = 'speechSynthesis' in window;

let rec = null, active = false, keep = false, speaking = false, token = 0;
let onText = null, onState = null;

function makeRec() {
  const r = new SR();
  r.lang = S.settings.lang === 'te' ? 'te-IN' : 'en-IN';
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;
  r.onresult = e => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t; else interim += t;
    }
    onState?.({ interim: interim || final });
    if (final.trim()) onText?.(final.trim());
  };
  r.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { keep = false; onState?.({ error: 'Microphone permission was denied.' }); }
    else if (!['no-speech', 'aborted'].includes(e.error)) onState?.({ error: `Voice error: ${e.error}` });
  };
  r.onend = () => {
    active = false;
    if (keep && !speaking) setTimeout(() => { if (keep && !speaking && !active) begin(); }, 250);
    else if (!keep && !speaking) onState?.({ on: false });
  };
  return r;
}

function begin() {
  try { rec = makeRec(); rec.start(); active = true; onState?.({ on: true }); }
  catch { active = false; }
}

export function startListening({ continuous = false, onText: t, onState: s } = {}) {
  if (!SR) { s?.({ error: 'Voice input is not supported in this browser. Use Chrome or Edge.' }); return; }
  onText = t; onState = s; keep = continuous;
  stopSpeaking();
  begin();
}

export function stopListening() {
  keep = false;
  try { rec?.abort(); } catch {}
  active = false;
  onState?.({ on: false });
}

export const isListening = () => active || keep;

function pickVoice(lang) {
  const v = speechSynthesis.getVoices().map(x => ({ x, l: x.lang.replace('_', '-').toLowerCase() }));
  if (lang === 'te-IN') return v.find(o => o.l.startsWith('te'))?.x || null;
  return (v.find(o => o.l === 'en-in') || v.find(o => o.l.startsWith('en-gb')) || v.find(o => o.l.startsWith('en')))?.x || null;
}

function chunk(text) {
  const parts = text.match(/[^.!?।\n]+[.!?।]?/g) || [text];
  const out = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > 200 && cur) { out.push(cur); cur = ''; }
    cur += p;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

export function speak(text) {
  if (!canSpeak || !text) return Promise.resolve();
  speechSynthesis.cancel();
  const my = ++token;
  const telugu = /[ఀ-౿]/.test(text);
  const lang = telugu ? 'te-IN' : 'en-IN';
  const voice = pickVoice(lang);
  if (active) { try { rec.abort(); } catch {} }
  speaking = true;
  const pieces = chunk(text.replace(/[*#_`>]/g, ''));
  return new Promise(resolve => {
    pieces.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = lang;
      if (voice) u.voice = voice;
      u.rate = Number(S.settings.rate) || 1;
      if (i === pieces.length - 1) {
        u.onend = u.onerror = () => {
          if (my !== token) return resolve();
          speaking = false;
          if (keep && !active) begin();
          resolve();
        };
      }
      speechSynthesis.speak(u);
    });
  });
}

export function stopSpeaking() {
  token++;
  if (canSpeak) speechSynthesis.cancel();
  speaking = false;
}

if (canSpeak) speechSynthesis.getVoices(); // warm up voice list
