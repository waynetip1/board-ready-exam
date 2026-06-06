import { barberQuestions } from './barber-questions.js'

// Topic proportions for full barber exam — PSI Texas Class A Barber Written Exam (75 questions)
// PSI distribution aligned to official topic weights
export const BARBER_TOPIC_PROPORTIONS = {
  "Infection Control & Sanitation": 19,   // ~25%
  "Haircutting & Hair Styling":     19,   // ~25%
  "Chemical Waving & Relaxing":     10,   // ~13%
  "Haircoloring":                   10,   // ~13%
  "Texas TDLR Laws & Regulations":   7,   // ~9%
  "Shampooing & Conditioning":       5,   // ~7%
  "Nail Care & Skin Care":           5,   // ~7%
}
// Total: 19+19+10+10+7+5+5 = 75 ✓

export const BARBER_TOPICS = Object.keys(BARBER_TOPIC_PROPORTIONS)

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Shuffle answer choices while tracking the new correct index
function shuffleChoices(q) {
  const indices = shuffle([0, 1, 2, 3])
  const newOptions = indices.map(i => q.options[i])
  const newOptions_es = indices.map(i => q.options_es[i])
  const newCorrect = indices.indexOf(q.correct)
  return { ...q, options: newOptions, options_es: newOptions_es, correct: newCorrect, _originalId: q.id }
}

// Build a full 75-question barber exam (proportional, shuffled)
export function buildBarberExam() {
  const selected = []
  BARBER_TOPICS.forEach(t => {
    const pool = shuffle(barberQuestions.filter(q => q.topic === t))
    const count = BARBER_TOPIC_PROPORTIONS[t]
    pool.slice(0, count).forEach(q => selected.push(shuffleChoices(q)))
  })
  return shuffle(selected)
}

// Build a pre-test: 2 questions per topic = 14 questions
export function buildBarberPreTest() {
  const selected = []
  BARBER_TOPICS.forEach(t => {
    const pool = shuffle(barberQuestions.filter(q => q.topic === t))
    pool.slice(0, 2).forEach(q => selected.push(shuffleChoices(q)))
  })
  return shuffle(selected)
}

// Focused topic test: up to 20 questions per attempt (non-overlapping across 3 attempts)
export const BARBER_TOPIC_TEST_COUNT = 20
export const BARBER_MAX_TOPIC_EXAMS = 3

export function buildBarberTopicTest(topic, attemptIndex = 0) {
  const pool = [...barberQuestions.filter(q => q.topic === topic)].sort((a, b) => a.id - b.id)
  const start = attemptIndex * BARBER_TOPIC_TEST_COUNT
  const slice = pool.slice(start, start + BARBER_TOPIC_TEST_COUNT)
  return shuffle(slice).map(shuffleChoices)
}

// Adaptive reinforcement: for each missed question, find another from same topic
export function getBarberAdaptiveReinforcement(wrongQuestions) {
  const reinforcement = []
  const wrongTopics = [...new Set(wrongQuestions.map(q => q.topic))]
  wrongTopics.forEach(topic => {
    const topicPool = barberQuestions.filter(q => q.topic === topic)
    const wrongIds = wrongQuestions.filter(q => q.topic === topic).map(q => q._originalId || q.id)
    const available = topicPool.filter(q => !wrongIds.includes(q.id))
    if (available.length > 0) {
      reinforcement.push(shuffleChoices(available[Math.floor(Math.random() * available.length)]))
    }
  })
  return reinforcement
}
