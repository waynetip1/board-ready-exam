import { questions } from './questions.js'

// Topic proportions for 120-question full exam (must sum to 120)
// PSI Texas Cosmetology Operator Written Exam: 100 questions, 70% to pass
// Topic weights based on PSI Candidate Information Bulletin
export const TOPIC_PROPORTIONS = {
  "Sanitation & Infection Control": 15,
  "Hair Care & Chemistry": 15,
  "Scalp & Hair Disorders": 8,
  "Skin Care & Anatomy": 10,
  "Nail Care": 8,
  "Chemical Services": 10,
  "Texas TDLR Laws & Regulations": 10,
  "Coloring & Lightening": 8,
  "Haircutting & Styling": 8,
  "Anatomy & Physiology": 8,
}
// Verify: 15+15+8+10+8+10+10+8+8+8 = 100 ✓

export const TOPICS = Object.keys(TOPIC_PROPORTIONS)

// Exam cap per customer
export const MAX_FULL_EXAMS = 10

// Difficulty tiers - questions tagged by difficulty
// Easy: straightforward recall questions (ids 1-20 per topic cluster)
// Hard: nuanced, similar-answer, or multi-concept questions
export function filterByDifficulty(questions, difficulty) {
  if (difficulty === 'standard') return questions
  // Use question id modulo to simulate difficulty tiers
  // In a real system these would be tagged explicitly
  if (difficulty === 'easy') {
    // Prefer lower-numbered questions in each topic (more foundational)
    return questions.sort((a, b) => a.id - b.id)
  }
  if (difficulty === 'hard') {
    // Prefer higher-numbered questions (more nuanced)
    return questions.sort((a, b) => b.id - a.id)
  }
  return questions
}

// Adaptive mode helpers
export function getAdaptiveReinforcement(wrongQuestions, allQuestions) {
  // For each wrong question, find 1-2 questions on the same topic for reinforcement
  const reinforcement = []
  const wrongTopics = [...new Set(wrongQuestions.map(q => q.topic))]
  wrongTopics.forEach(topic => {
    const topicPool = allQuestions.filter(q => q.topic === topic)
    const wrongIds = wrongQuestions.filter(q => q.topic === topic).map(q => q.id)
    const available = topicPool.filter(q => !wrongIds.includes(q.id))
    if (available.length > 0) {
      reinforcement.push(shuffleChoices(available[Math.floor(Math.random() * available.length)]))
    }
  })
  return reinforcement
}

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

// Build a full exam from the bank (proportional, shuffled, with difficulty)
export function buildFullExam(difficulty = 'standard') {
  const pool = {}
  TOPICS.forEach(t => {
    const topicQs = questions.filter(q => q.topic === t)
    pool[t] = shuffle(filterByDifficulty([...topicQs], difficulty))
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
