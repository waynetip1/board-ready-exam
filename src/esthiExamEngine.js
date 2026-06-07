import { esthiQuestions } from './esthi-questions.js'

// Topic proportions for full esthetician exam — PSI Texas Esthetician Written Exam (75 questions)
// PSI distribution aligned to official topic weights
export const ESTHI_TOPIC_PROPORTIONS = {
  "Texas TDLR Laws & Regulations": 11,
  "Infection Control & Sanitation": 15,
  "Nail Structure & Analysis":       5,
  "Nail Care":                      14,
  "Skin Care":                       8,
  "Facial Treatments":              11,
  "Hair Removal":                    7,
  "Facial Makeup":                   4,
}
// Total: 11+15+5+14+8+11+7+4 = 75 ✓ (scaled proportionally from the original 100-weight distribution)

export const ESTHI_TOPICS = Object.keys(ESTHI_TOPIC_PROPORTIONS)

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

// Build a full 75-question esthi exam (proportional, shuffled)
export function buildEsthiExam() {
  const selected = []
  ESTHI_TOPICS.forEach(t => {
    const pool = shuffle(esthiQuestions.filter(q => q.topic === t))
    const count = ESTHI_TOPIC_PROPORTIONS[t]
    pool.slice(0, count).forEach(q => selected.push(shuffleChoices(q)))
  })
  return shuffle(selected)
}

// Build a pre-test: 2 questions per topic = 16 questions
export function buildEsthiPreTest() {
  const selected = []
  ESTHI_TOPICS.forEach(t => {
    const pool = shuffle(esthiQuestions.filter(q => q.topic === t))
    pool.slice(0, 2).forEach(q => selected.push(shuffleChoices(q)))
  })
  return shuffle(selected)
}

// Focused topic test: up to 20 questions per attempt (non-overlapping across 3 attempts)
export const ESTHI_TOPIC_TEST_COUNT = 20
export const ESTHI_MAX_TOPIC_EXAMS = 3

export function buildEsthiTopicTest(topic, attemptIndex = 0) {
  const pool = [...esthiQuestions.filter(q => q.topic === topic)].sort((a, b) => a.id - b.id)
  const start = attemptIndex * ESTHI_TOPIC_TEST_COUNT
  const slice = pool.slice(start, start + ESTHI_TOPIC_TEST_COUNT)
  return shuffle(slice).map(shuffleChoices)
}

// Adaptive reinforcement: for each missed question, find another from same topic
export function getEsthiAdaptiveReinforcement(wrongQuestions) {
  const reinforcement = []
  const wrongTopics = [...new Set(wrongQuestions.map(q => q.topic))]
  wrongTopics.forEach(topic => {
    const topicPool = esthiQuestions.filter(q => q.topic === topic)
    const wrongIds = wrongQuestions.filter(q => q.topic === topic).map(q => q._originalId || q.id)
    const available = topicPool.filter(q => !wrongIds.includes(q.id))
    if (available.length > 0) {
      reinforcement.push(shuffleChoices(available[Math.floor(Math.random() * available.length)]))
    }
  })
  return reinforcement
}
