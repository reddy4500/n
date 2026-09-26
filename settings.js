import { S, save, exportData, importData, resetAll, today } from './store.js';
import { gemini } from './gemini.js';
import { esc, toast, download, $ } from './ui.js';
import { canListen, canSpeak, speak } from './voice.js';
import { applyTheme } from './theme.js';

export function renderSettings(el) {
  const s = S.settings;
  el.innerHTML = `
  <div class="card"><h3>Profile</h3><div class="grid g2">
    <label class="field">Your name<input type="text" data-k="name" value="${esc(s.name)}" placeholder="e.g. Reddy" /></label>
    <label class="field">NEET PG exam date<input type="date" data-k="examDate" value="${esc(s.examDate)}" /></label>
    <label class="field">Target study hours / day<input type="number" min="1" max="16" data-k="dailyHours" value="${s.dailyHours}" /></label>
    <label class="field">Language (voice + mentor)<select data-k="lang"><option value="en" ${s.lang === 'en' ? 'selected' : ''}>English</option><option value="te" ${s.lang === 'te' ? 'selected' : ''}>తెలుగు + English (Telugu)</option></select></label>
  </div></div>

  <div class="card"><h3>AI engine — Google Gemini</h3>
    <p class="muted small">Get a free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">aistudio.google.com/app/apikey</a>. The key is stored only in this browser and sent only to Google's Gemini API. Never commit it to GitHub.</p>
    <div class="grid g2">
      <label class="field">API key<input type="password" data-k="apiKey" value="${esc(s.apiKey)}" placeholder="AIza…" autocomplete="off" /></label>
      <label class="field">Model<input type="text" data-k="model" list="models" value="${esc(s.model)}" /><datalist id="models"><option value="gemini-2.5-flash"><option value="gemini-2.5-flash-lite"><option value="gemini-2.5-pro"></datalist></label>
    </div>
    <div class="row" style="margin-top:10px"><button class="btn" id="sTest">Test connection</button><span class="muted small" id="sTestOut"></span></div>
  </div>

  <div class="card"><h3>Voice</h3>
    <p class="muted small">Voice input: ${canListen ? 'supported' : '<b>not supported in this browser</b> — use Chrome/Edge on Android or desktop'}. Spoken replies: ${canSpeak ? 'supported' : 'not supported'}. For Telugu speech output, install a Telugu voice (Android: Google Speech Services → Telugu).</p>
    <label class="check"><input type="checkbox" data-k="voiceReplies" ${s.voiceReplies ? 'checked' : ''}/> Speak mentor and coach replies aloud</label>
    <label class="check"><input type="checkbox" data-k="handsFree" ${s.handsFree ? 'checked' : ''}/> Hands-free mode (keep listening; reads questions and results aloud)</label>
    <label class="field" style="max-width:260px;margin-top:8px">Speech rate<input type="range" min="0.6" max="1.6" step="0.1" data-k="rate" value="${s.rate}" /></label>
    <button class="btn sm" id="sVoice" style="margin-top:8px">Test voice</button>
  </div>

  <div class="card"><h3>Daily reminders</h3>
    <p class="muted small">Notifications appear while the app (or installed app) is open in the background.</p>
    <label class="check"><input type="checkbox" data-k="reminders" ${s.reminders ? 'checked' : ''}/> Enable morning briefing and evening check-in reminders</label>
    <div class="grid g2" style="margin-top:8px">
      <label class="field">Morning briefing<input type="time" data-k="morningTime" value="${esc(s.morningTime)}" /></label>
      <label class="field">Evening check-in<input type="time" data-k="eveningTime" value="${esc(s.eveningTime)}" /></label>
    </div>
  </div>

  <div class="card"><h3>Appearance</h3>
    <label class="field" style="max-width:260px">Theme<select data-k="theme"><option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Match system</option><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option></select></label>
  </div>

  <div class="card"><h3>Your data</h3>
    <p class="muted small">All progress is saved in this browser. Export a backup to move to another device.</p>
    <div class="row"><button class="btn" id="sExport">Export backup</button><label class="btn">Import backup<input type="file" id="sImport" accept=".json" hidden /></label><button class="btn danger" id="sReset">Reset progress</button></div>
  </div>

  <div class="card"><h3>Voice commands</h3>
    <div class="table-wrap"><table>
      <tr><th>Say (English)</th><th>Telugu</th><th>Does</th></tr>
      <tr><td>good morning / daily briefing</td><td>శుభోదయం / ఈ రోజు ప్లాన్</td><td>AI builds and reads today's plan</td></tr>
      <tr><td>start quiz on pathology</td><td>pathology క్విజ్ ప్రారంభించు</td><td>Starts AI practice for a subject</td></tr>
      <tr><td>start mock test</td><td>మాక్ టెస్ట్ ప్రారంభించు</td><td>Starts a 50-question mock</td></tr>
      <tr><td>option A / B / C / D, answer C</td><td>ఏ / బీ / సీ / డీ, ఒకటి…నాలుగు</td><td>Answers the current question</td></tr>
      <tr><td>next / previous</td><td>తరువాత / వెనక్కి</td><td>Moves between questions</td></tr>
      <tr><td>read question / repeat</td><td>చదువు / మళ్ళీ</td><td>Reads the question aloud</td></tr>
      <tr><td>explain</td><td>వివరించు</td><td>Explains the answer</td></tr>
      <tr><td>review flashcards, show answer, good / hard / again</td><td>ఫ్లాష్ కార్డ్స్</td><td>Hands-free flashcards</td></tr>
      <tr><td>start timer / stop timer</td><td>టైమర్ ప్రారంభించు / ఆపు</td><td>Pomodoro focus timer</td></tr>
      <tr><td>evening check-in / good night</td><td>శుభరాత్రి</td><td>Opens the check-in</td></tr>
      <tr><td>open mentor / home / settings…</td><td>హోమ్, సెట్టింగ్స్</td><td>Navigation</td></tr>
      <tr><td>stop</td><td>ఆపు</td><td>Stops speaking</td></tr>
      <tr><td colspan="3">Anything else is sent to Guru, your AI mentor, as a question.</td></tr>
    </table></div>
    <p class="muted small">Keyboard: press <kbd>M</kbd> for the mic, <kbd>1</kbd>–<kbd>4</kbd> to answer, <kbd>N</kbd> for next.</p>
  </div>`;

  el.querySelectorAll('[data-k]').forEach(inp => {
    const ev = inp.type === 'text' || inp.type === 'password' ? 'input' : 'change';
    inp.addEventListener(ev, async () => {
      const k = inp.dataset.k;
      let v = inp.type === 'checkbox' ? inp.checked : inp.value;
      if (['dailyHours', 'rate'].includes(k)) v = Number(v);
      if (k === 'apiKey' || k === 'model') v = String(v).trim();
      S.settings[k] = v;
      save();
      if (k === 'theme') applyTheme();
      if (k === 'reminders' && v && 'Notification' in window && Notification.permission !== 'granted') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') { toast('Notifications were blocked by the browser.', 'bad'); S.settings.reminders = false; inp.checked = false; save(); }
      }
      if (ev === 'change') toast('Saved');
      window.dispatchEvent(new Event('settings-changed'));
    });
  });
  $('#sTest', el).onclick = async () => {
    const out = $('#sTestOut', el);
    out.textContent = 'Testing…';
    try { const r = await gemini({ prompt: 'Reply with exactly: Connected. Best wishes for NEET PG!', temperature: 0 }); out.textContent = '✓ ' + r.slice(0, 80); }
    catch (e) { out.textContent = '✗ ' + e.message; }
  };
  $('#sVoice', el).onclick = () => speak(S.settings.lang === 'te' ? 'నమస్తే డాక్టర్! మీ NEET PG ప్రయాణంలో నేను తోడుంటాను.' : 'Hello Doctor! I am Guru, your NEET PG study companion.');
  $('#sExport', el).onclick = () => download(`neetpg-backup-${today()}.json`, exportData());
  $('#sImport', el).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { importData(await f.text()); toast('Backup restored', 'ok'); location.reload(); }
    catch { toast('Invalid backup file', 'bad'); }
  };
  let armed = false;
  $('#sReset', el).onclick = e => {
    if (!armed) { armed = true; e.target.textContent = 'Tap again to confirm'; setTimeout(() => { armed = false; e.target.textContent = 'Reset progress'; }, 4000); return; }
    resetAll(true); toast('Progress reset'); location.reload();
  };
}
