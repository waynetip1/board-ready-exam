export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { answers, questions } = req.body

  const wrongAnswers = questions.filter((q, i) => answers[i] !== q.correct)

  const wrongSummary = wrongAnswers.map((q, i) =>
    `Q: ${q.question}\nStudent answered: ${q.options[answers[questions.indexOf(q)]]}\nCorrect answer: ${q.options[q.correct]}`
  ).join('\n\n')

  const topicCounts = {}
  wrongAnswers.forEach(q => {
    topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1
  })
  const weakTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([t]) => t)

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
          content: `You are a Texas cosmetology exam coach. A student just completed their practice written exam.

Wrong answers:
${wrongSummary}

For each wrong answer, provide:
1. A clear explanation of why the correct answer is right
2. A memory tip to remember it

Then write a PERSONALIZED STUDY GUIDE covering these weak topics: ${weakTopics.join(', ')}.
The study guide should be concise, practical, and focused on what they need to pass the Texas TDLR/PSI cosmetology written exam.

Format your response as JSON like this:
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

    const data = await gradeRes.json()
    const text = data.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    res.status(200).json({
      score: Math.round(((questions.length - wrongAnswers.length) / questions.length) * 100),
      correct: questions.length - wrongAnswers.length,
      total: questions.length,
      passed: ((questions.length - wrongAnswers.length) / questions.length) >= 0.75,
      weakTopics,
      ...parsed
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Grading failed' })
  }
}
