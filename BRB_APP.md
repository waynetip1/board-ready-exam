# Board Ready Beauty — PassBoard App Context for Claude Code

## WHAT THIS IS

**PassBoard** is a React-based Texas cosmetology written exam prep app built by Board Ready Beauty LLC.

- **Product name:** PassBoard (marketed as "Written Exam Prep" on the website)
- **Price:** $27 launch / $47 permanent (website sells via WooCommerce; app access granted post-purchase)
- **Status:** BUILT AND DEPLOYED on Vercel
- **Auth:** WordPress WooCommerce accounts via Simple JWT Login plugin

---

## REPO STRUCTURE

```
board-ready-exam/
├── BRB_APP.md              ← this file
├── package.json            ← React 18, Vite 4
├── vite.config.js          ← root: src/, outDir: ../dist
├── vercel.json             ← API rewrites: /api/* → /api/$1
├── api/
│   ├── auth.js             ← Vercel serverless: WordPress JWT auth
│   ├── grade.js            ← Vercel serverless: Claude API grading
│   └── studyguide.js       ← Vercel serverless: Claude API study guide
├── src/
│   ├── index.html
│   ├── main.jsx            ← ReactDOM.createRoot entry point
│   ├── App.jsx             ← All UI components (single file)
│   ├── examEngine.js       ← Exam building logic, topic proportions
│   ├── questions.js        ← 400-question bank
│   ├── legal.js            ← Terms of Service + Privacy Policy text
│   └── styles.css          ← All styles (CSS variables, components)
└── files/
    └── MARKETING.md        ← Verified facts, ad copy, email sequences
```

---

## TECH STACK

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite 4 |
| Hosting | Vercel (serverless functions in /api/) |
| Auth | WordPress Simple JWT Login → /api/auth.js |
| AI Grading | Claude API claude-sonnet-4-20250514 → /api/grade.js |
| AI Study Guide | Claude API claude-sonnet-4-20250514 → /api/studyguide.js |
| State/Storage | localStorage (all exam history, user session, settings) |
| Payments | WooCommerce + Stripe (on boardreadybeauty.com) |
| Env var | ANTHROPIC_API_KEY (set in Vercel environment) |

---

## BRAND SYSTEM (in styles.css)

```css
:root {
  --rose:        #8B2040;   /* primary — headings, CTAs, badges */
  --rose-light:  #C0506A;   /* hover states */
  --rose-pale:   #F9D8E6;   /* selected answer bg */
  --rose-bg:     #FDF6F8;   /* page background */
  --text:        #2d1a1f;   /* primary text */
  --text-muted:  #7a5560;   /* secondary text */
  --white:       #ffffff;
  --border:      #ecd5db;
  --success:     #2d7a4f;
  --success-bg:  #e8f5ee;
}
```

**Fonts:** Playfair Display (headings) + Inter (body)
**Logo:** https://boardreadybeauty.com/wp-content/uploads/2026/03/brbLOGO.png

---

## EXAM ENGINE (examEngine.js)

### Topic Proportions — 100-question full exam
```js
export const TOPIC_PROPORTIONS = {
  "Sanitation & Infection Control": 15,
  "Hair Care & Chemistry":          15,
  "Scalp & Hair Disorders":          8,
  "Skin Care & Anatomy":            10,
  "Nail Care":                       8,
  "Chemical Services":              10,
  "Texas TDLR Laws & Regulations":  10,
  "Coloring & Lightening":           8,
  "Haircutting & Styling":           8,
  "Anatomy & Physiology":            8,
}
// Total: 100 — matches PSI exam weighting
// NOTE: The comment in examEngine.js says "120-question" — this is WRONG.
// The code and proportions are correct at 100 questions.
```

### Exam Modes
| Mode | Questions | Timer | Limit |
|---|---|---|---|
| Pre-Test Diagnostic | 20 (2 per topic) | None | Unlimited |
| Full Practice Exam | 100 (proportional) | 90 min | 10 per purchase |
| Topic Test | All Qs for that topic | None | Unlimited |

`MAX_FULL_EXAMS = 10` — enforced client-side via brb_history count

### Key Functions
- `buildFullExam(difficulty)` — proportional draw, shuffled questions + answer choices
- `buildPreTest()` — 2 per topic, shuffled
- `buildTopicTest(topic)` — all questions for topic, shuffled
- `shuffleChoices(q)` — shuffles A/B/C/D options, tracks new correct index
- `filterByDifficulty(questions, difficulty)` — sorts by id (easy = low ids, hard = high ids)
- `getAdaptiveReinforcement(wrongQuestions, allQuestions)` — 1 reinforcement Q per wrong topic

---

## QUESTION BANK (questions.js)

**400 questions total:**

| Topic | Count |
|---|---|
| Sanitation & Infection Control | 60 |
| Hair Care & Chemistry | 60 |
| Scalp & Hair Disorders | 32 |
| Skin Care & Anatomy | 40 |
| Nail Care | 32 |
| Chemical Services | 40 |
| Texas TDLR Laws & Regulations | 40 |
| Coloring & Lightening | 32 |
| Haircutting & Styling | 32 |
| Anatomy & Physiology | 32 |

**Question structure:**
```js
{
  id: 1,                          // sequential integer, unique
  topic: "Sanitation & Infection Control",
  question: "Question text?",
  options: ["A text", "B text", "C text", "D text"],  // always 4
  correct: 0                      // index of correct answer (0-3)
}
```

**Unique exam combinations:** 2.72 × 10^97 (with answer shuffling: 1.15 × 10^263)

---

## API ROUTES (Vercel Serverless)

### POST /api/auth
Authenticates against WordPress via Simple JWT Login plugin.
- **Input:** `{ email, password }`
- **Calls:** boardreadybeauty.com/wp-json/simple-jwt-login/v1/auth + /wp-json/wp/v2/users/me
- **Returns:** `{ jwt, userId, name }`
- **Requires:** Simple JWT Login WordPress plugin installed + configured

### POST /api/grade
Grades a completed exam. Scoring is done server-side; Claude adds explanations.
- **Input:** `{ answers: {0: 2, 1: 0, ...}, questions: [...] }`
- **Pass threshold in app: 75%** (real PSI exam is 70% — intentionally higher bar)
- **Claude call:** up to 20 wrong answers → explanations + quick study guide
- **Model:** claude-sonnet-4-20250514, max_tokens: 4000
- **Returns:** `{ score, correct, total, passed, weakTopics, topicBreakdown, explanations[], studyGuide{} }`
- **Fallback:** if Claude fails, returns server-calculated results with generic tips

### POST /api/studyguide
Generates comprehensive personalized study guide.
- **Input:** `{ topicStats, overallPct, examCount, totalAnswered }`
- **Model:** claude-sonnet-4-20250514, max_tokens: 16000
- **System prompt:** forces JSON-only response (no markdown, no preamble)
- **Returns:** `{ guide: { intro, howToUseThisGuide, sections[], studySchedule, examDayTips[], finalNotes } }`
- **Unlocked only after:** 1+ full exams completed

**Guide section structure:**
```js
{
  topic: "string",
  mastery: "Strong|Developing|Needs Work",
  score: 85,
  plainEnglishOverview: "string",
  whyItMatters: "string",
  keyConcepts: [{ concept, explanation, analogy, memoryTrick, examAlert }],
  examWarnings: ["string"],
  reference: "string",   // e.g. "TDLR Rule 83.100 / Milady Ch.5"
  selfCheck: [{ question, answer }]
}
```

---

## APP SCREENS & STATE (App.jsx)

### Screen Flow
```
login → (terms modal on first login) → dashboard
dashboard → exam → grading → results → dashboard
dashboard → stats
dashboard → studyguide
```

### All Screens
| Screen | Component | Notes |
|---|---|---|
| login | Login | Email + password → /api/auth |
| dashboard | Dashboard | Exam mode cards, settings toggles, history banner |
| exam | ExamScreen | Active exam — question nav, timer, feedback |
| grading | Grading | Spinner while /api/grade runs (~30 sec) |
| results | Results | Score badge, explanations, quick study guide |
| stats | StatsPage | History, topic bars, score trend chart |
| studyguide | StudyGuidePage | AI guide, PDF download |

### localStorage Keys (all app state)
| Key | Type | Description |
|---|---|---|
| brb_user | object | `{ email, name, jwt }` |
| brb_terms_accepted | object | `{ version, date }` — gates TermsModal |
| brb_feedback | boolean | Real-time feedback mode |
| brb_difficulty | string | easy / standard / hard |
| brb_adaptive | boolean | Adaptive reinforcement mode |
| brb_session | object | In-progress full exam: `{ answers, current, timeLeft, confirmed, questions }` |
| brb_history | array | All completed exams: `{ score, passed, correct, total, type, topic, date, topicBreakdown }` |
| brb_topic_attempts | object | `{ "Topic Name": count }` |
| brb_study_guide | object | Cached guide from /api/studyguide |

---

## FEATURES

### Real-Time Feedback Mode
- Toggle on Dashboard (default: OFF)
- "Confirm Answer" button appears after selecting an option
- After confirm: FeedbackOverlay shows correct/wrong, explanation, Next button
- Question nav map shows green (correct) / red (wrong) per confirmed question

### Adaptive Mode
- Toggle on Dashboard (default: OFF)
- Tracks wrong answers during exam session
- After last question: generates reinforcement round from `getAdaptiveReinforcement()`
- Shows "Adaptive" label and blue progress bar during reinforcement phase

### Difficulty Levels
- Easy: foundational questions (lower ids per topic)
- Standard: random shuffle (default, recommended)
- Hard: nuanced questions (higher ids per topic)

### Question Navigation Map
- `QuestionNav` component — numbered grid buttons
- Toggled by "Map" button in exam topbar
- Color states: rose (current), green (confirmed correct), red (confirmed wrong), rose-pale (answered), grey (unanswered)

### Save & Resume
- Full exams auto-save to brb_session every state change
- Dashboard shows "Exam in progress" banner with Resume / New Exam buttons
- Resume loads saved questions, answers, timer state

### Study Guide PDF
- `downloadPDF()` builds full HTML doc in memory
- Opens new tab → triggers window.print()
- Fallback: downloads as BRB-Study-Guide.html if popup blocked
- Print CSS: hides nav/buttons, preserves section layout
- Includes: cover page, scores, all topic sections with concepts/warnings/self-check/schedule

### Exam Limit
- MAX_FULL_EXAMS = 10 per purchase
- Counted from brb_history (type === 'full')
- Over-limit alert directs to support@boardreadybeauty.com

---

## LEGAL (legal.js)

- **Terms version:** 1.0, April 2026
- **Product name in legal:** "PassBoard" (not Board Ready Beauty Written Exam Prep)
- **Entity:** Board Ready Beauty LLC, Princeton, Texas
- **Pass Guarantee:** 7-day window, must complete 1 full exam scoring below 75%, must have sat for and failed real PSI exam
- **Refund contact:** support@boardreadybeauty.com
- **Governing law:** Texas, Collin County
- **Data storage disclosure:** exam history lives in localStorage (not on BRB servers)
- **AI disclaimer:** Claude AI may contain errors; not professional advice

---

## MARKETING (files/MARKETING.md)

### Verified Facts
- TDLR FY2025 pass rate: **49.05%** (10,463 passed / 21,331 attempts)
- Source: tdlr.texas.gov/barbering-and-cosmetology/individuals/exam-statistics.htm
- Real exam: 100 questions, **70% to pass**
- PassBoard internal pass threshold: **75%** (higher bar than real exam)

### Tagline
"Study smart. Pass first."

### Key Headlines
- "More Than Half of Texas Cosmetology Students Fail the Written Exam. Don't Be One of Them."
- "You didn't put in 1,000 hours of school to get stopped by a written test."

### Email Sequence (3 emails — built in MARKETING.md, not yet in Brevo)
1. Immediate — access link, start with Pre-Test
2. Day 3 — check-in, nudge to start
3. Day 6 — Pass Guarantee window closing tomorrow

---

## KNOWN ISSUES / DISCREPANCIES

| Issue | Detail |
|---|---|
| Comment bug in examEngine.js | Says "120-question" in comment — code is correct at 100 |
| Pass threshold mismatch | App uses 75% pass; real PSI uses 70% — intentional, document this for users |
| Font inconsistency | styles.css uses `Inter` as body font; website uses `DM Sans` — these differ |
| Color inconsistency | App `--rose: #8B2040`; website `--brb-rose: #c8185a` — different rose values |

---

## WHAT IS NOT YET BUILT

- Brevo email welcome sequence (3-email sequence written in MARKETING.md, not loaded into Brevo)
- WooCommerce Bookings for class scheduling (Phase 2)
- Florida market expansion ($57 pricing)
- Board Ready Kit WooCommerce product ($125)
- Contractor educator system

---

## DEPLOYMENT

- **Platform:** Vercel
- **Build:** `vite build` → dist/
- **API:** Serverless functions in /api/ (Node.js)
- **Env var required:** `ANTHROPIC_API_KEY` in Vercel project settings
- **WordPress dependency:** Simple JWT Login plugin on boardreadybeauty.com

---

## PEOPLE & ROLES

| Person | Role |
|---|---|
| Wayne | Tech lead — builds everything, all technical decisions |
| Teresa | Educator — validates exam content, teaches practical classes, brand face |
| Claude API | AI grading (grade.js) + study guide generation (studyguide.js) |
