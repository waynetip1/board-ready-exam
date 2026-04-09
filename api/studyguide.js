export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { topicStats, overallPct, examCount, totalAnswered } = req.body

  const topicSummary = Object.entries(topicStats || {}).map(([topic, data]) => {
    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
    const mastery = pct >= 80 ? 'Strong' : pct >= 60 ? 'Developing' : 'Needs Work'
    return `${topic}: ${pct}% (${data.correct}/${data.total} correct) — ${mastery}`
  }).join('\n')

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,  // ← increased from 8000
        messages: [{
          role: 'user',
          content: `... your existing prompt ...`
        }]
      })
    })

    if (!apiRes.ok) {
      const errText = await apiRes.text()
      console.error('Claude API error:', apiRes.status, errText)
      return res.status(500).json({ error: 'Guide generation failed' })
    }

    const data = await apiRes.json()
    
    // Check if Claude hit the token limit before finishing
    const stopReason = data.stop_reason
    const text = data.content?.[0]?.text || ''
    
    if (stopReason === 'max_tokens') {
      console.error('Response truncated — hit max_tokens. Length:', text.length)
      return res.status(500).json({ error: 'Study guide too large to generate. Please try again.' })
    }

    const clean = text.replace(/```json|```/g, '').trim()
    const guide = JSON.parse(clean)
    res.status(200).json({ guide })

  } catch (err) {
    console.error('Study guide error:', err)
    res.status(500).json({ error: 'Failed to generate study guide. Please try again.' })
  }
}
