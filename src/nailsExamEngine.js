import { nailsQuestions } from './nails-questions.js'

// Topic proportions for full nails exam — PSI Texas Manicurist Written Exam (60 questions)
// PSI distribution aligned to official topic weights
export const NAILS_TOPIC_PROPORTIONS = {
  "Texas TDLR Laws & Regulations":  9,
  "Infection Control & Sanitation": 15,
  "Nail Structure & Analysis":       9,
  "Nail Care":                      18,
  "Skin Care":                       9,
}
// Total: 9+15+9+18+9 = 60 ✓

export const NAILS_TOPICS = Object.keys(NAILS_TOPIC_PROPORTIONS)

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

// Build a full 60-question nails exam (proportional, shuffled)
export function buildNailsExam() {
  const selected = []
  NAILS_TOPICS.forEach(t => {
    const pool = shuffle(nailsQuestions.filter(q => q.topic === t))
    const count = NAILS_TOPIC_PROPORTIONS[t]
    pool.slice(0, count).forEach(q => selected.push(shuffleChoices(q)))
  })
  return shuffle(selected)
}

// Build a pre-test: 2 questions per topic = 10 questions
export function buildNailsPreTest() {
  const selected = []
  NAILS_TOPICS.forEach(t => {
    const pool = shuffle(nailsQuestions.filter(q => q.topic === t))
    pool.slice(0, 2).forEach(q => selected.push(shuffleChoices(q)))
  })
  return shuffle(selected)
}

// Focused topic test: up to 20 questions per attempt (non-overlapping across 3 attempts)
export const NAILS_TOPIC_TEST_COUNT = 20
export const NAILS_MAX_TOPIC_EXAMS = 3

export function buildNailsTopicTest(topic, attemptIndex = 0) {
  const pool = [...nailsQuestions.filter(q => q.topic === topic)].sort((a, b) => a.id - b.id)
  const start = attemptIndex * NAILS_TOPIC_TEST_COUNT
  const slice = pool.slice(start, start + NAILS_TOPIC_TEST_COUNT)
  return shuffle(slice).map(shuffleChoices)
}

// Adaptive reinforcement: for each missed question, find another from same topic
export function getNailsAdaptiveReinforcement(wrongQuestions) {
  const reinforcement = []
  const wrongTopics = [...new Set(wrongQuestions.map(q => q.topic))]
  wrongTopics.forEach(topic => {
    const topicPool = nailsQuestions.filter(q => q.topic === topic)
    const wrongIds = wrongQuestions.filter(q => q.topic === topic).map(q => q._originalId || q.id)
    const available = topicPool.filter(q => !wrongIds.includes(q.id))
    if (available.length > 0) {
      reinforcement.push(shuffleChoices(available[Math.floor(Math.random() * available.length)]))
    }
  })
  return reinforcement
}
