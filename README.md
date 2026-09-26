# NEET PG AI Agent

An AI study companion for NEET PG that runs in your browser and is hosted free on GitHub Pages. It uses Google Gemini to generate fresh MCQs, run mock tests, and coach you every day. You can talk to it in **English or Telugu**.

No server, no sign-up, no build step. Your progress stays in your own browser, and your API key is sent only to Google's Gemini API.

## Features

| Module | What it does |
|---|---|
| **Daily Coach** | *Start my day* builds a plan from your weak areas, mistake backlog, exam countdown and target hours, then reads it aloud. Includes a question of the day, an evening check-in with AI feedback, a 7-day journal, and morning/evening reminder notifications. |
| **Practice** | Unlimited AI-generated MCQs (NBEMS style) by subject, topic, difficulty and style (clinical vignettes or one-liners). Shows an explanation and a high-yield pearl after each answer. *Explain in Telugu*, *Ask mentor* and *+ Flashcard* on every question. Wrong answers are saved automatically for review. |
| **Mock Test** | 25, 50, 100 or 200 questions (200 Q in 210 min), spread across 19 subjects by approximate weightage. Timer, question palette, mark-for-review, +4/−1 scoring, subject-wise breakdown and an AI performance analysis. |
| **AI Mentor "Guru"** | A chat mentor that knows your live stats. Ask it about concepts, mnemonics, strategy or motivation. Voice in, voice out. |
| **Flashcards** | AI-generated high-yield decks with SM-2 spaced repetition. Works hands-free by voice. |
| **Planner** | Pomodoro focus timer (auto-logs study time), 14-day study graph, an AI master plan up to exam day, and subject weightage vs. your accuracy. |
| **Voice commands** | English (en-IN) and Telugu (te-IN), e.g. “good morning”, “start quiz on pharmacology”, “option B”, “next”, “explain”, “start timer”. Anything else goes to the mentor. Hands-free mode keeps the mic on and reads questions aloud. |
| **Works offline** | Installable PWA with a built-in 30-question offline bank for when you have no key or no network. |

## Deploy on GitHub Pages (5 minutes)

1. Create a new repository on GitHub, e.g. `neetpg-ai-agent` (it can be public or private, if your plan supports Pages for private repos).
2. Upload all files in this folder, keeping the folder structure. You can drag and drop them on the GitHub web page, or use:
   ```bash
   git init
   git add .
   git commit -m "NEET PG AI Agent"
   git branch -M main
   git remote add origin https://github.com/<your-username>/neetpg-ai-agent.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) publishes the site on every push. After about a minute your app is live at
   `https://<your-username>.github.io/neetpg-ai-agent/`
5. Open the site and go to **Settings**. Paste your free Gemini key from <https://aistudio.google.com/app/apikey>, set your exam date and name, and pick **English** or **Telugu**.
6. On your phone, open the site in Chrome, then choose **⋮ → Add to Home screen** to install it as an app.

> **Never put your API key in the code or commit it to GitHub.** Enter it only in the app's Settings page. It is stored in your browser's localStorage. As extra protection, you can restrict the key in Google AI Studio or Cloud Console to the Generative Language API.

## Run locally

Any static server works (ES modules don't load from `file://`):

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Voice commands

| English | Telugu | Action |
|---|---|---|
| good morning / daily briefing | శుభోదయం / ఈ రోజు ప్లాన్ | Build and read today's plan |
| start quiz on pathology (add “hard” or “easy”) | pathology క్విజ్ ప్రారంభించు | AI practice for that subject |
| start mock test 100 | మాక్ టెస్ట్ ప్రారంభించు | Mock test |
| review mistakes | తప్పులు | Mistake review |
| option A / answer C / one…four | ఏ / బీ / సీ / డీ / ఒకటి…నాలుగు | Answer |
| next / previous / submit | తరువాత / వెనక్కి / సబ్మిట్ | Navigate the quiz |
| read question / repeat | చదువు / మళ్ళీ | Read aloud |
| explain | వివరించు | Explanation (in Telugu if Telugu is selected) |
| show answer, again / hard / good / easy | జవాబు, మళ్ళీ / కష్టం / బాగుంది / సులభం | Flashcards |
| start timer / stop timer | టైమర్ ప్రారంభించు / ఆపు | Pomodoro |
| good night / check in | శుభరాత్రి | Evening check-in |
| open mentor / settings / home | — | Navigation |
| stop | ఆపు | Stop speaking |

Keyboard shortcuts: **M** toggles the mic, **1–4** or **A–D** answer, **N** or → goes to the next question, **P** or ← goes back.

Voice recognition works best in **Chrome or Edge** (desktop and Android). Safari and Firefox support is limited. To hear Telugu replies, install a Telugu text-to-speech voice (Android: *Settings → Text-to-speech → Google → Install voice data → Telugu*).

## Customise

- **Your own questions:** add them to `js/bank.js` in the same format. They are used offline and as a fallback.
- **Syllabus and weightage:** `js/syllabus.js` lists the 19 subjects, their topics, and approximate question counts.
- **Mentor personality:** edit the `system()` prompt in `js/mentor.js`.
- **Question style:** edit `SYSTEM` in `js/questions.js`.
- **Model:** choose it in Settings. The default is `gemini-2.5-flash`. You can type any Gemini model name Google offers.

## Project structure

```
index.html              App shell
css/styles.css          Styles (light/dark, mobile-first)
js/app.js               Router, mic button, shortcuts, reminders
js/gemini.js            Gemini REST client
js/questions.js         AI MCQ generation + offline bank access
js/quiz.js              Practice + mock test engine
js/mentor.js            AI mentor chat
js/daily.js             Daily coach: briefing, plan, QOTD, check-in, reminders
js/cards.js             Flashcards + spaced repetition
js/plan.js              Planner, master plan, Pomodoro
js/voice.js             Speech recognition + text-to-speech
js/commands.js          Voice command parser (EN + TE)
js/stats.js             Streaks, accuracy, weak areas, AI context
js/store.js             localStorage persistence, export/import
js/syllabus.js          Subjects, topics, weightage
js/bank.js              Offline question bank
sw.js, manifest.webmanifest   PWA (installable, offline shell)
.github/workflows/deploy.yml  GitHub Pages deployment
```

## Important notes

- AI-generated questions can occasionally be wrong. Cross-check doubtful facts with standard textbooks, and use this app alongside your main question bank, not in place of it.
- The subject weightage is approximate. NBEMS does not publish an official subject split, and it changes each year.
- The Gemini free tier has rate limits. If you see a rate-limit message, wait a minute. A full 200-question mock uses about 20 AI requests.
- Take care of yourself: sleep, breaks and exercise help recall. If you are struggling emotionally, talk to someone you trust or call Tele-MANAS at **14416** (India, free, 24×7).

## License

MIT
