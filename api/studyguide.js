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
        max_tokens: 16000,
        system: 'You are a JSON API. You must respond with valid JSON only. No explanations, no markdown, no preamble, no commentary. Your entire response must be a single valid JSON object that can be parsed with JSON.parse(). Do not include ```json or ``` markers. Start your response with { and end with }.',
        messages: [{
          role: 'user',
          content: `You are creating a world-class study guide for a student preparing for the Texas PSI TDLR cosmetology written exam.

STUDENT DATA:
- Overall accuracy: ${overallPct}%
- Full exams completed: ${examCount}
- Total questions answered: ${totalAnswered}
- Topic breakdown:
${topicSummary}

GUIDE PHILOSOPHY:
This guide must be genuinely excellent — not a generic list of facts. Follow these principles:

1. PLAIN ENGLISH FIRST: Explain every concept in simple, everyday language. Write as if explaining to a smart friend who is not a cosmetologist. Use short sentences. Avoid jargon — and when you must use a technical term, always explain it immediately in plain English in parentheses.

2. ESL-FRIENDLY: Many students speak English as a second language. Use consistent, simple vocabulary. Avoid idioms that don't translate well. But never talk down to the reader — respect their intelligence.

3. REAL-WORLD ANALOGIES: Connect every concept to something students already know from everyday life. Examples: "Think of disinfection like washing dishes — it removes most germs but not all. Sterilization is like a hospital operating room — zero germs, period." These analogies make concepts stick.

4. MEMORY ANCHORS: For every key fact, give a vivid memory trick. Use:
   - Acronyms (e.g., "Remember pH with 'Potential Hydrogen'")
   - Visual associations (e.g., "Picture staphylococci as a bunch of grapes — staph = grapes")
   - Stories or scenarios
   - Rhymes or patterns when natural
   - The "why" behind facts (understanding beats memorizing)

5. EXAM INTELLIGENCE: This is the Texas PSI TDLR cosmetology written exam. Call out:
   - Exact language the exam uses
   - Common trick questions and how to spot them
   - What examiners are really testing
   - Which topics appear most frequently
   - Common wrong answers students choose and why

6. PRIORITIZE WEAK AREAS: Give significantly more depth to topics where the student scored below 75%. For strong topics, reinforce with quick review. For weak topics, go deep with multiple explanations and extra memory tricks.

7. SPACED REPETITION GUIDANCE: At the end of each section, include 3 quick self-check questions the student can use to test themselves without looking. These should mirror PSI exam question style.

8. REFERENCES: Where relevant, cite the source of the standard:
   - Texas Occupations Code for legal/regulatory content
   - EPA guidelines for disinfection
   - OSHA standards for safety
   - TDLR rules for Texas-specific requirements
   - Standard cosmetology textbook principles (Milady, Pivot Point)

Respond ONLY with valid JSON matching this exact structure:
{
  "intro": "2-3 warm, encouraging sentences personalized to their performance. Be specific about what they've accomplished and what to focus on. Use plain English.",
  "howToUseThisGuide": "2-3 sentences explaining the best way to study this guide — spaced repetition, self-testing, etc.",
  "sections": [
    {
      "topic": "exact topic name",
      "mastery": "Strong|Developing|Needs Work",
      "score": 85,
      "plainEnglishOverview": "2-3 sentence explanation of what this topic is really about in everyday language. Include a real-world analogy.",
      "whyItMatters": "1-2 sentences on why this topic matters for the actual exam and real salon work.",
      "keyConcepts": [
        {
          "concept": "concept name",
          "explanation": "plain English explanation, 1-3 sentences",
          "analogy": "real-world analogy to make it memorable",
          "memoryTrick": "specific memory anchor — acronym, visual, story, or rhyme",
          "examAlert": "what the exam specifically tests about this — common trick questions or phrasing to watch for"
        }
      ],
      "examWarnings": ["specific warning about tricky exam questions on this topic", "another common mistake"],
      "reference": "e.g., TDLR Rule 83.100 / Milady Standard Cosmetology Ch.5 / EPA DIS/TSS-1",
      "selfCheck": [
        {"question": "PSI-style question", "answer": "correct answer with brief explanation"}
      ]
    }
  ],
  "studySchedule": "Practical 3-5 day study schedule recommendation based on their weak areas",
  "examDayTips": ["specific actionable tip for exam day", "another tip", "another tip"],
  "finalNotes": "2-3 warm, motivating sentences. Be genuine and specific."
}`
        }]
      })
    })

    if (!apiRes.ok) {
      const errText = await apiRes.text()
      console.error('Claude API error:', apiRes.status, errText)
      return res.status(500).json({ error: 'Guide generation failed' })
    }

    const data = await apiRes.json()
    const stopReason = data.stop_reason
    const text = data.content?.[0]?.text || ''

    if (stopReason === 'max_tokens') {
      console.error('Response truncated — hit max_tokens. Length:', text.length)
      return res.status(500).json({ error: 'Study guide too large to generate. Please try again.' })
    }

    const clean = text.replace(/```json|```/g, '').trim()

    if (!clean.startsWith('{')) {
      console.error('Claude returned non-JSON:', clean.substring(0, 200))
      return res.status(500).json({ error: 'Failed to generate study guide. Please try again.' })
    }

    const guide = JSON.parse(clean)
    res.status(200).json({ guide })

  } catch (err) {
    console.error('Study guide error:', err)
    res.status(500).json({ error: 'Failed to generate study guide. Please try again.' })
  }
}
