import { questions } from './questions.js'

// Topic proportions for 120-question full exam (must sum to 120)
export const TOPIC_PROPORTIONS = {
  "Sanitation & Infection Control": 18,
  "Hair Care & Chemistry": 18,
  "Scalp & Hair Disorders": 10,
  "Skin Care & Anatomy": 12,
  "Nail Care": 10,
  "Chemical Services": 12,
  "Texas TDLR Laws & Regulations": 12,
  "Coloring & Lightening": 10,
  "Haircutting & Styling": 10,
  "Anatomy & Physiology": 8,
}

export const TOPICS = Object.keys(TOPIC_PROPORTIONS)

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
  const newCorrect = indices.indexOf(q.correct)
  return { ...q, options: newOptions, correct: newCorrect, _originalId: q.id }
}

// Build a full exam from the bank (proportional, shuffled)
export function buildFullExam() {
  const pool = {}
  TOPICS.forEach(t => {
    pool[t] = shuffle(questions.filter(q => q.topic === t))
  })
  const selected = []
  TOPICS.forEach(t => {
    const count = TOPIC_PROPORTIONS[t]
    pool[t].slice(0, count).forEach(q => selected.push(shuffleChoices(q)))
  })
  return shuffle(selected)
}

// Build a pre-test: 2 questions per topic = 20 questions (shuffled)
export function buildPreTest() {
  const selected = []
  TOPICS.forEach(t => {
    const topicQs = shuffle(questions.filter(q => q.topic === t))
    topicQs.slice(0, 2).forEach(q => selected.push(shuffleChoices(q)))
  })
  return shuffle(selected)
}

// Build a topic test: all questions for that topic, shuffled
export function buildTopicTest(topic) {
  return shuffle(questions.filter(q => q.topic === topic)).map(shuffleChoices)
}
