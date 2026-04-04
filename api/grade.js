export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { answers, questions } = req.body

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  let correct = 0
  const wrongAnswers = []

  questions.forEach((q, i) => {
    const userAnswer = answers[i]
    if (userAnswer === q.correct) {
      correct++
    } else {
      wrongAnswers.push({
        question: q.question,
        topic: q.topic,
        userAnswer: userAnswer !== undefined ? q.options[userAnswer] : 'Not answered',
        correctAnswer: q.options[q.correct]
      })
    }
  })

  const score = Math.round((correct / questions.length) * 100)
  const passed = score >= 75

  const topicCounts = {}
  wrongAnswers.forEach(q => {
    topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1
  })
  const weakTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t)

  if (wrongAnswers.length === 0) {
    return res.status(200).json({
      score, correct, total: questions.length, passed, weakTopics: [],
      explanations: [],
      studyGuide: { intro: 'Perfect score! You have an excellent grasp of the material.', topics: [] }
    })
  }

  const wrongSummary = wrongAnswers.slice(0, 20).map(q =>
    `Q: ${q.question}\nStudent answered: ${q.userAnswer}\nCorrect answer: ${q.correctAnswer}`
  ).join('\n\n')

  const fallback = {
    score, correct, total: questions.length, passed, weakTopics,
    explanations: wrongAnswers.slice(0, 15).map(q => ({
      question: q.question,
      explanation: `The correct answer is: ${q.correctAnswer}`,
      tip: `Review the topic: ${q.topic}`
    })),
    studyGuide: {
      intro: `You scored ${score}%. Focus on reviewing your weak topics before the exam.`,
      topics: weakTopics.map(t => ({
        name: t,
        keyPoints: [`Review all ${t} material`, 'Focus on key definitions', 'Practice with flashcards'],
        examTip: `Pay close attention to ${t} questions on the exam.`
      }))
    }
  }

  try {
    const gradeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `You are a Texas cosmetology exam coach. Student scored ${score}% (${correct}/${questions.length}).

Wrong answers:
${wrongSummary}

Weak topics: ${weakTopics.join(', ')}

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "explanations": [
    { "question": "...", "explanation": "...", "tip": "..." }
  ],
  "studyGuide": {
    "intro": "...",
    "topics": [
      { "name": "...", "keyPoints": ["...", "..."], "examTip": "..." }
    ]
  }
}`
        }]
      })
    })

    if (!gradeRes.ok) {
      console.error('Claude API error:', gradeRes.status)
      return res.status(200).json(fallback)
    }

    const data = await gradeRes.json()
    const text = data.content?.[0]?.text || ''

    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return res.status(200).json({ score, correct, total: questions.length, passed, weakTopics, ...parsed })
    } catch (e) {
      console.error('JSON parse error:', e)
      return res.status(200).json(fallback)
    }

  } catch (err) {
    console.error('Grading error:', err)
    return res.status(200).json(fallback)
  }
}
