export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { topicStats, overallPct, examCount, totalAnswered } = req.body

  const topicSummary = Object.entries(topicStats || {}).map(([topic, data]) => {
    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
    const mastery = pct >= 80 ? 'Strong' : pct >= 60 ? 'Developing' : 'Needs Work'
    return `${topic}: ${pct}% (${data.correct}/${data.total} correct) — ${mastery}`
  }).join('\n')

  try {
    const res2 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        messages: [{
          role: 'user',
          content: `You are an expert Texas cosmetology exam coach creating a comprehensive personalized study guide for the PSI TDLR written exam.

Student performance data:
- Overall accuracy: ${overallPct}%
- Full exams completed: ${examCount}
- Total questions answered: ${totalAnswered}

Topic breakdown:
${topicSummary}

Create a comprehensive study guide. Respond ONLY with valid JSON, no markdown:
{
  "intro": "2-3 sentence personalized intro based on their performance",
  "sections": [
    {
      "topic": "topic name",
      "mastery": "Strong|Developing|Needs Work",
      "overview": "2-3 sentence overview of this topic and its importance on the exam",
      "keyPoints": ["key fact 1", "key fact 2", "key fact 3", "key fact 4", "key fact 5"],
      "weakAreas": ["specific area to focus on if mastery is Developing or Needs Work"],
      "examTip": "specific actionable tip for this topic on the PSI exam"
    }
  ],
  "finalNotes": "2-3 sentences of encouragement and final exam day advice"
}`
        }]
      })
    })

    if (!res2.ok) return res.status(500).json({ error: 'Guide generation failed' })
    const data = await res2.json()
    const text = data.content?.[0]?.text || ''
    const guide = JSON.parse(text.replace(/```json|```/g, '').trim())
    res.status(200).json({ guide })
  } catch (err) {
    console.error('Study guide error:', err)
    res.status(500).json({ error: 'Failed to generate study guide' })
  }
}
