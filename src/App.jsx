import { useState, useEffect, useCallback } from 'react'
import { buildFullExam, buildPreTest, buildTopicTest, TOPICS, TOPIC_PROPORTIONS } from './examEngine.js'

const EXAM_MINUTES = 120
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch(e) {} }
const load = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch(e) { return null } }
const clear = (key) => { try { localStorage.removeItem(key) } catch(e) {} }

function Header({ user, onLogout, screen, onNav }) {
  return (
    <div className="header">
      <div style={{ cursor: 'pointer' }} onClick={() => onNav('dashboard')}>
        <div className="header-logo">Board Ready Beauty</div>
        <div className="header-sub">Written Exam Prep</div>
      </div>
      {user && (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {['dashboard', 'stats', 'studyguide'].map(s => (
            <button key={s} onClick={() => onNav(s)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: screen === s ? '#8B2040' : '#7a5560',
              fontWeight: screen === s ? '600' : '400',
              fontSize: '0.88rem'
            }}>
              {s === 'dashboard' ? 'Home' : s === 'stats' ? 'My Stats' : 'Study Guide'}
            </button>
          ))}
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#7a5560', cursor: 'pointer', fontSize: '0.85rem' }}>Sign out</button>
        </div>
      )}
    </div>
  )
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) return setError('Please enter your email and password.')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (!res.ok || !data.jwt) { setError(data.error || 'Invalid email or password.'); setLoading(false); return }
      onLogin({ email, name: data.name, jwt: data.jwt })
    } catch { setError('Connection error. Please try again.') }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">Board Ready Beauty</div>
        <div className="login-tagline">Written Exam Prep — Texas Cosmetology</div>
        {error && <div className="error-msg">{error}</div>}
        <label className="form-label">Email address</label>
        <input className="form-input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        <label className="form-label">Password</label>
        <input className="form-input" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Signing in...' : 'Access My Exam'}</button>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8rem', color: '#7a5560' }}>
          Use the email and password from your purchase confirmation.<br />
          <a href="https://boardreadybeauty.com/my-account/lost-password/" style={{ color: '#8B2040' }}>Forgot password?</a>
        </p>
      </div>
    </div>
  )
}

function Dashboard({ user, onStart, feedbackOn, setFeedbackOn }) {
  const hasSaved = !!load('brb_session')
  const history = load('brb_history') || []
  const lastFull = [...history].reverse().find(h => h.type === 'full')
  const topicAttempts = load('brb_topic_attempts') || {}
  const hasFullExam = history.some(h => h.type === 'full')

  return (
    <div className="intro-wrap" style={{ maxWidth: '760px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="intro-title">Welcome back, {(user.name || '').split('.')[0] || 'Student'}!</div>
          <div className="intro-sub">What would you like to study today?</div>
        </div>
        <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#2d1a1f' }}>Real-Time Feedback</div>
            <div style={{ fontSize: '0.73rem', color: '#7a5560' }}>{feedbackOn ? 'Answer feedback after each question' : 'Classic mode — feedback at end'}</div>
          </div>
          <div onClick={() => { setFeedbackOn(!feedbackOn); save('brb_feedback', !feedbackOn) }}
            style={{ width: '44px', height: '24px', borderRadius: '12px', background: feedbackOn ? '#8B2040' : '#d0c0c5', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: feedbackOn ? '22px' : '2px', transition: 'left 0.2s' }} />
          </div>
        </div>
      </div>

      {hasSaved && (
        <div style={{ background: '#fff8e6', border: '1px solid #f0d080', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontWeight: '600', color: '#8B6000', fontSize: '0.95rem' }}>Exam in progress</div>
            <div style={{ fontSize: '0.82rem', color: '#a07800' }}>Continue where you left off</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={() => { clear('brb_session'); onStart('full') }}>New Exam</button>
            <button className="btn-next" style={{ padding: '8px 16px', fontSize: '0.82rem' }} onClick={() => onStart('resume')}>Resume →</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        <div className="dash-card" onClick={() => onStart('pretest')}>
          <div className="dash-card-icon">🎯</div>
          <div className="dash-card-title">Pre-Test Diagnostic</div>
          <div className="dash-card-desc">20 questions · No timer · Identifies your weak areas</div>
          <div className="dash-card-action">Start Diagnostic →</div>
        </div>
        <div className="dash-card" onClick={() => onStart('full')}>
          <div className="dash-card-icon">📝</div>
          <div className="dash-card-title">Full Practice Exam</div>
          <div className="dash-card-desc">120 questions · 120 min · New shuffle every time</div>
          {lastFull && <div style={{ fontSize: '0.78rem', color: '#8B2040', marginTop: '4px' }}>Last score: {lastFull.score}%</div>}
          <div className="dash-card-action">Start Exam →</div>
        </div>
      </div>

      {hasFullExam && (
        <div style={{ background: 'linear-gradient(135deg, #8B2040, #C0506A)', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={() => onStart('studyguide')}>
          <div>
            <div style={{ color: 'white', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px' }}>📖 Comprehensive Study Guide</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>AI-generated guide based on your exam history · Download as PDF</div>
          </div>
          <div style={{ color: 'white', fontSize: '1.4rem' }}>→</div>
        </div>
      )}

      {!hasFullExam && (
        <div style={{ background: '#f5f0f2', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '1.4rem' }}>🔒</div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#7a5560' }}>Study Guide locked</div>
            <div style={{ fontSize: '0.78rem', color: '#7a5560' }}>Complete one full exam to unlock your personalized study guide</div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ fontWeight: '600', color: '#8B2040', marginBottom: '14px', fontSize: '0.95rem' }}>Focused Topic Tests</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: '8px' }}>
          {TOPICS.map(topic => {
            const attempts = topicAttempts[topic] || 0
            const topicHistory = (load('brb_history') || []).filter(h => h.topic === topic)
            const lastScore = topicHistory.length > 0 ? topicHistory[topicHistory.length - 1].score : null
            return (
              <div key={topic} className="topic-card" onClick={() => onStart('topic', topic)}>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#2d1a1f' }}>{topic}</div>
                <div style={{ fontSize: '0.73rem', color: '#7a5560', marginTop: '3px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{TOPIC_PROPORTIONS[topic]}Q bank</span>
                  <span>{attempts > 0 ? `${attempts}x${lastScore !== null ? ` · ${lastScore}%` : ''}` : 'Not taken'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FeedbackOverlay({ question, selectedIndex, onNext }) {
  const isCorrect = selectedIndex === question.correct
  const letters = ['A', 'B', 'C', 'D']

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ background: isCorrect ? '#e8f5ee' : '#ffeaea', border: `1.5px solid ${isCorrect ? '#2d7a4f' : '#e04040'}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '12px' }}>
        <div style={{ fontWeight: '700', color: isCorrect ? '#2d7a4f' : '#c0392b', fontSize: '1rem', marginBottom: '6px' }}>
          {isCorrect ? '✓ Correct!' : '✗ Not quite'}
        </div>
        {!isCorrect && (
          <div style={{ fontSize: '0.88rem', color: '#2d1a1f', marginBottom: '8px' }}>
            <span style={{ color: '#c0392b' }}>Your answer: </span>{letters[selectedIndex]} — {question.options[selectedIndex]}
            <br />
            <span style={{ color: '#2d7a4f' }}>Correct answer: </span>{letters[question.correct]} — {question.options[question.correct]}
          </div>
        )}
        <div style={{ fontSize: '0.88rem', color: isCorrect ? '#1a5c38' : '#7a2020', fontStyle: 'italic' }}>
          {isCorrect
            ? `Great job! ${question.options[question.correct]} is the right answer. Keep it up!`
            : `Remember: The correct answer is "${question.options[question.correct]}". Review ${question.topic} to strengthen this area.`}
        </div>
      </div>
      <button className="btn-next" style={{ width: '100%', padding: '14px' }} onClick={onNext}>
        Next Question →
      </button>
    </div>
  )
}

function QuestionNav({ total, current, answers, confirmed, onJump }) {
  return (
    <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ fontSize: '0.78rem', color: '#7a5560', marginBottom: '10px', fontWeight: '500' }}>Question Navigator</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {Array.from({ length: total }, (_, i) => (
          <button key={i} onClick={() => onJump(i)} style={{
            width: '30px', height: '30px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600',
            background: i === current ? '#8B2040' : confirmed?.[i] !== undefined ? (confirmed[i] ? '#c8ecd6' : '#ffd5d5') : answers[i] !== undefined ? '#F9D8E6' : '#f5f0f2',
            color: i === current ? 'white' : '#555',
          }}>{i + 1}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.72rem', color: '#7a5560', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#c8ecd6', marginRight: '3px' }}></span>Correct</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#ffd5d5', marginRight: '3px' }}></span>Incorrect</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#F9D8E6', marginRight: '3px' }}></span>Answered</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#f5f0f2', marginRight: '3px' }}></span>Unanswered</span>
      </div>
    </div>
  )
}

function ExamScreen({ mode, topic, examQuestions, feedbackOn, onSubmit, onHome }) {
  const totalTime = (mode === 'full' || mode === 'resume') ? EXAM_MINUTES * 60 : null
  const saved = mode === 'resume' ? load('brb_session') : null

  const examQs = examQuestions || []
  const [current, setCurrent] = useState(saved?.current || 0)
  const [answers, setAnswers] = useState(saved?.answers || {})
  const [confirmed, setConfirmed] = useState(saved?.confirmed || {}) // tracks correct/incorrect per question
  const [showFeedback, setShowFeedback] = useState(false)
  const [timeLeft, setTimeLeft] = useState(saved?.timeLeft ?? totalTime)
  const [showNav, setShowNav] = useState(false)

  const handleSubmit = useCallback(() => {
    clear('brb_session')
    onSubmit(answers, examQs, mode, topic)
  }, [answers, examQs, mode, topic, onSubmit])

  useEffect(() => {
    if (mode === 'full' || mode === 'resume') {
      save('brb_session', { answers, current, timeLeft, confirmed, questions: examQs })
    }
  }, [answers, current, timeLeft, confirmed, mode, examQs])

  useEffect(() => {
    if (!totalTime) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [handleSubmit, totalTime])

  // When feedback mode is on, show feedback after confirm
  const handleConfirm = () => {
    if (answers[current] === undefined) return
    const isCorrect = answers[current] === examQs[current].correct
    setConfirmed(prev => ({ ...prev, [current]: isCorrect }))
    setShowFeedback(true)
  }

  const handleNext = () => {
    setShowFeedback(false)
    if (current < examQs.length - 1) setCurrent(c => c + 1)
    else handleSubmit()
  }

  const handleJump = (i) => {
    setShowFeedback(false)
    setCurrent(i)
    setShowNav(false)
  }

  // When switching questions reset feedback display
  useEffect(() => { setShowFeedback(false) }, [current])

  const mins = timeLeft !== null ? Math.floor(timeLeft / 60).toString().padStart(2, '0') : null
  const secs = timeLeft !== null ? (timeLeft % 60).toString().padStart(2, '0') : null
  const isWarning = timeLeft !== null && timeLeft < 300
  const q = examQs[current]
  const answered = Object.keys(answers).length
  const letters = ['A', 'B', 'C', 'D']
  const modeLabel = mode === 'pretest' ? 'Pre-Test Diagnostic' : mode === 'topic' ? topic : 'Full Practice Exam'
  const isConfirmed = confirmed[current] !== undefined
  const selectedAnswer = answers[current]

  if (!q) return null

  const getOptionStyle = (i) => {
    const base = 'option-btn'
    if (!feedbackOn || !isConfirmed) {
      return `${base} ${selectedAnswer === i ? 'selected' : ''}`
    }
    if (i === q.correct) return `${base} correct-answer`
    if (i === selectedAnswer && i !== q.correct) return `${base} wrong-answer`
    return base
  }

  return (
    <div className="exam-wrap">
      <div className="exam-topbar">
        <div>
          <div style={{ fontSize: '0.73rem', color: '#7a5560', marginBottom: '2px' }}>{modeLabel}</div>
          {timeLeft !== null
            ? <div className={`timer ${isWarning ? 'warning' : ''}`}>{mins}:{secs}</div>
            : <div style={{ fontSize: '0.88rem', color: '#8B2040', fontWeight: '600' }}>No time limit</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="progress-text">{current + 1} / {examQs.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#7a5560' }}>{answered} answered</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {feedbackOn && <span style={{ fontSize: '0.7rem', background: '#F9D8E6', color: '#8B2040', padding: '3px 8px', borderRadius: '10px', fontWeight: '600' }}>Feedback ON</span>}
          <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem' }} onClick={() => setShowNav(v => !v)}>Map</button>
          <button className="btn-next" onClick={handleSubmit} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>Submit</button>
        </div>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${((current + 1) / examQs.length) * 100}%` }} />
      </div>

      {showNav && <QuestionNav total={examQs.length} current={current} answers={answers} confirmed={feedbackOn ? confirmed : null} onJump={handleJump} />}

      <div className="question-card">
        <div className="question-topic">{q.topic}</div>
        <div className="question-text">{q.question}</div>
        <div className="options-grid">
          {q.options.map((opt, i) => (
            <button key={i}
              className={getOptionStyle(i)}
              disabled={isConfirmed && feedbackOn}
              onClick={() => { if (!isConfirmed || !feedbackOn) setAnswers(prev => ({ ...prev, [current]: i })) }}>
              <span className="option-letter">{letters[i]}</span>{opt}
            </button>
          ))}
        </div>

        {/* Feedback mode: show Confirm button or feedback overlay */}
        {feedbackOn && !isConfirmed && selectedAnswer !== undefined && (
          <button className="btn-primary" style={{ marginTop: '16px', borderRadius: '10px' }} onClick={handleConfirm}>
            Confirm Answer
          </button>
        )}

        {feedbackOn && isConfirmed && showFeedback && (
          <FeedbackOverlay question={q} selectedIndex={selectedAnswer} onNext={handleNext} />
        )}
      </div>

      {!feedbackOn && (
        <div className="nav-row">
          <button className="btn-secondary" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>← Previous</button>
          <button className="btn-secondary" onClick={() => { if (mode === 'full' || mode === 'resume') save('brb_session', { answers, current, timeLeft, confirmed, questions: examQs }); onHome() }} style={{ fontSize: '0.8rem', padding: '10px 14px' }}>
            {(mode === 'full' || mode === 'resume') ? '💾 Save & Exit' : 'Exit'}
          </button>
          {current < examQs.length - 1
            ? <button className="btn-next" onClick={() => setCurrent(c => c + 1)}>Next →</button>
            : <button className="btn-next" onClick={handleSubmit}>Submit ✓</button>}
        </div>
      )}

      {feedbackOn && !showFeedback && (
        <div className="nav-row">
          <button className="btn-secondary" onClick={() => { setShowFeedback(false); setCurrent(c => c - 1) }} disabled={current === 0}>← Previous</button>
          <button className="btn-secondary" onClick={() => { if (mode === 'full' || mode === 'resume') save('brb_session', { answers, current, timeLeft, confirmed, questions: examQs }); onHome() }} style={{ fontSize: '0.8rem', padding: '10px 14px' }}>
            {(mode === 'full' || mode === 'resume') ? '💾 Save & Exit' : 'Exit'}
          </button>
          {!isConfirmed && current < examQs.length - 1
            ? <button className="btn-next" onClick={() => setCurrent(c => c + 1)} disabled={selectedAnswer === undefined}>Next →</button>
            : !isConfirmed
            ? <button className="btn-next" onClick={handleSubmit}>Submit ✓</button>
            : null}
        </div>
      )}
    </div>
  )
}

function Grading() {
  return (
    <div className="grading-wrap">
      <div className="grading-spinner" />
      <div className="grading-title">Grading your exam...</div>
      <p style={{ color: '#7a5560', fontSize: '0.95rem', lineHeight: '1.7' }}>Claude AI is reviewing your answers and building your personalized study guide. This takes about 30 seconds.</p>
    </div>
  )
}

function GeneratingGuide() {
  return (
    <div className="grading-wrap">
      <div className="grading-spinner" />
      <div className="grading-title">Building your study guide...</div>
      <p style={{ color: '#7a5560', fontSize: '0.95rem', lineHeight: '1.7' }}>Claude AI is analyzing your exam history and creating a comprehensive personalized study guide. This may take up to a minute.</p>
    </div>
  )
}

function StudyGuidePage({ onHome }) {
  const history = load('brb_history') || []
  const hasFullExam = history.some(h => h.type === 'full')
  const cachedGuide = load('brb_study_guide')
  const [guide, setGuide] = useState(cachedGuide)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const generateGuide = async () => {
    setGenerating(true); setError('')
    const topicStats = {}
    history.forEach(h => {
      if (!h.topicBreakdown) return
      Object.entries(h.topicBreakdown).forEach(([topic, data]) => {
        if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 }
        topicStats[topic].correct += data.correct || 0
        topicStats[topic].total += data.total || 0
      })
    })
    const totalAnswered = history.reduce((s, h) => s + (h.total || 0), 0)
    const totalCorrect = history.reduce((s, h) => s + (h.correct || 0), 0)
    const overallPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
    const examCount = history.filter(h => h.type === 'full').length

    try {
      const res = await fetch('/api/studyguide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicStats, overallPct, examCount, totalAnswered })
      })
      const data = await res.json()
      if (data.guide) { save('brb_study_guide', data.guide); setGuide(data.guide) }
      else setError('Could not generate guide. Please try again.')
    } catch { setError('Connection error. Please try again.') }
    setGenerating(false)
  }

  const downloadPDF = () => {
    if (!guide) return
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Board Ready Beauty — Study Guide</title>
    <style>
      body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #2d1a1f; line-height: 1.7; }
      h1 { color: #8B2040; font-size: 2rem; margin-bottom: 4px; }
      h2 { color: #8B2040; font-size: 1.3rem; margin-top: 32px; border-bottom: 1px solid #ecd5db; padding-bottom: 8px; }
      h3 { color: #C0506A; font-size: 1.05rem; margin-top: 20px; }
      .meta { color: #7a5560; font-size: 0.9rem; margin-bottom: 32px; }
      ul { padding-left: 20px; } li { margin-bottom: 6px; }
      .tip { background: #FDF6F8; border-left: 3px solid #8B2040; padding: 10px 14px; margin: 12px 0; font-style: italic; color: #5a2030; }
      @media print { body { margin: 20px; } }
    </style></head><body>
    <h1>Board Ready Beauty</h1>
    <div class="meta">Comprehensive Study Guide — Texas Cosmetology Written Exam · Generated ${new Date().toLocaleDateString()}</div>
    ${guide.sections.map(s => `
      <h2>${s.topic}</h2>
      <p>${s.overview}</p>
      <h3>Key Concepts</h3>
      <ul>${s.keyPoints.map(p => `<li>${p}</li>`).join('')}</ul>
      ${s.weakAreas ? `<h3>Focus Areas</h3><ul>${s.weakAreas.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
      <div class="tip">Exam Tip: ${s.examTip}</div>
    `).join('')}
    <h2>Final Notes</h2><p>${guide.finalNotes}</p>
    </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  if (generating) return <GeneratingGuide />

  if (!hasFullExam) {
    return (
      <div className="intro-wrap">
        <div className="intro-card">
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔒</div>
          <div className="intro-title">Study Guide Locked</div>
          <div className="intro-sub">Complete one full practice exam to unlock your personalized comprehensive study guide.</div>
          <button className="btn-primary" onClick={onHome} style={{ marginTop: '24px' }}>Take Full Exam</button>
        </div>
      </div>
    )
  }

  return (
    <div className="results-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="intro-title" style={{ margin: 0 }}>📖 Study Guide</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {guide && <button className="btn-secondary" onClick={downloadPDF} style={{ fontSize: '0.85rem', padding: '10px 18px' }}>⬇ Download PDF</button>}
          <button className="btn-primary" onClick={generateGuide} style={{ fontSize: '0.85rem', padding: '10px 20px', borderRadius: '20px' }}>
            {guide ? '🔄 Regenerate' : '✨ Generate My Guide'}
          </button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {!guide && !error && (
        <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✨</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#8B2040', marginBottom: '8px' }}>Ready to generate your guide</div>
          <div style={{ color: '#7a5560', marginBottom: '24px', lineHeight: '1.7' }}>
            Claude AI will analyze your exam history across all topics and create a comprehensive, personalized study guide highlighting your weak areas and reinforcing your strengths.
          </div>
          <button className="btn-primary" onClick={generateGuide} style={{ maxWidth: '280px' }}>✨ Generate My Study Guide</button>
        </div>
      )}

      {guide && (
        <div>
          <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
            <p style={{ color: '#7a5560', lineHeight: '1.8', fontStyle: 'italic' }}>{guide.intro}</p>
          </div>
          {guide.sections?.map((s, i) => (
            <div key={i} className="study-guide-card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div className="study-topic-name" style={{ fontSize: '1.1rem' }}>{s.topic}</div>
                {s.mastery && (
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '4px 12px', borderRadius: '20px',
                    background: s.mastery === 'Strong' ? '#e8f5ee' : s.mastery === 'Developing' ? '#fff3e0' : '#ffeaea',
                    color: s.mastery === 'Strong' ? '#2d7a4f' : s.mastery === 'Developing' ? '#e08020' : '#c0392b' }}>
                    {s.mastery}
                  </span>
                )}
              </div>
              <p style={{ color: '#7a5560', fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '12px' }}>{s.overview}</p>
              {s.keyPoints?.length > 0 && (
                <>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#8B2040', marginBottom: '8px' }}>Key Concepts</div>
                  <ul className="study-points" style={{ marginBottom: '12px' }}>{s.keyPoints.map((p, j) => <li key={j}>{p}</li>)}</ul>
                </>
              )}
              {s.weakAreas?.length > 0 && (
                <>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#C0506A', marginBottom: '8px' }}>Focus Areas</div>
                  <ul className="study-points" style={{ marginBottom: '12px' }}>{s.weakAreas.map((p, j) => <li key={j}>{p}</li>)}</ul>
                </>
              )}
              <div className="exam-tip">📌 Exam Tip: {s.examTip}</div>
            </div>
          ))}
          {guide.finalNotes && (
            <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
              <div style={{ fontWeight: '600', color: '#8B2040', marginBottom: '8px' }}>Final Notes</div>
              <p style={{ color: '#7a5560', lineHeight: '1.8' }}>{guide.finalNotes}</p>
            </div>
          )}
          <div style={{ textAlign: 'center', paddingBottom: '40px' }}>
            <button className="btn-secondary" onClick={downloadPDF} style={{ marginRight: '12px' }}>⬇ Download PDF</button>
            <button className="btn-primary" onClick={generateGuide} style={{ maxWidth: '220px' }}>🔄 Regenerate Guide</button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatsPage() {
  const history = load('brb_history') || []
  const topicAttempts = load('brb_topic_attempts') || {}
  const totalQs = history.reduce((s, h) => s + (h.total || 0), 0)
  const totalCorrect = history.reduce((s, h) => s + (h.correct || 0), 0)
  const overallPct = totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0
  const fullExams = history.filter(h => h.type === 'full')
  const passed = history.filter(h => h.passed).length
  const topicStats = {}
  history.forEach(h => {
    if (!h.topicBreakdown) return
    Object.entries(h.topicBreakdown).forEach(([topic, data]) => {
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 }
      topicStats[topic].correct += data.correct || 0
      topicStats[topic].total += data.total || 0
    })
  })
  const recentFull = fullExams.slice(-10)

  return (
    <div className="intro-wrap" style={{ maxWidth: '760px' }}>
      <div className="intro-title" style={{ marginBottom: '20px' }}>My Stats</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[{ num: totalQs, label: 'Questions Answered' }, { num: `${overallPct}%`, label: 'Overall Accuracy' }, { num: fullExams.length, label: 'Full Exams Taken' }, { num: passed, label: 'Times Passed' }].map((s, i) => (
          <div key={i} className="stat-box"><div className="stat-num">{s.num}</div><div className="stat-label">{s.label}</div></div>
        ))}
      </div>
      {recentFull.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }}>
          <div style={{ fontWeight: '600', color: '#8B2040', marginBottom: '16px' }}>Full Exam Score Trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
            {recentFull.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: h.passed ? '#2d7a4f' : '#8B2040', fontWeight: '600' }}>{h.score}%</div>
                <div style={{ width: '100%', background: h.passed ? '#2d7a4f' : '#C0506A', borderRadius: '4px 4px 0 0', height: `${h.score * 0.7}px`, minHeight: '4px' }} />
                <div style={{ fontSize: '0.65rem', color: '#7a5560' }}>#{i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }}>
        <div style={{ fontWeight: '600', color: '#8B2040', marginBottom: '16px' }}>Topic Performance</div>
        {TOPICS.map(topic => {
          const data = topicStats[topic]
          const pct = data && data.total > 0 ? Math.round((data.correct / data.total) * 100) : null
          const color = pct === null ? '#d0c0c5' : pct >= 80 ? '#2d7a4f' : pct >= 60 ? '#e08020' : '#C0506A'
          return (
            <div key={topic} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                <span style={{ color: '#2d1a1f', fontWeight: '500' }}>{topic}</span>
                <span style={{ color, fontWeight: '600' }}>{pct !== null ? `${pct}%` : 'Not taken'}</span>
              </div>
              <div style={{ height: '6px', background: '#f0e0e5', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pct !== null ? `${pct}%` : '0%', background: color, borderRadius: '3px', transition: 'width 0.5s' }} />
              </div>
            </div>
          )
        })}
      </div>
      {history.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px' }}>
          <div style={{ fontWeight: '600', color: '#8B2040', marginBottom: '14px' }}>Recent History</div>
          {[...history].reverse().slice(0, 10).map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 9 ? '1px solid #f0e0e5' : 'none', fontSize: '0.85rem' }}>
              <span style={{ color: '#7a5560' }}>{h.type === 'full' ? '📝 Full Exam' : h.type === 'pretest' ? '🎯 Pre-Test' : `📚 ${h.topic}`}</span>
              <span style={{ fontWeight: '600', color: h.passed ? '#2d7a4f' : '#8B2040' }}>{h.score}% {h.passed ? '✓' : ''}</span>
            </div>
          ))}
        </div>
      )}
      {history.length === 0 && (
        <div style={{ textAlign: 'center', color: '#7a5560', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #ecd5db' }}>
          No exam history yet. Take a pre-test or full exam to see your stats here!
        </div>
      )}
    </div>
  )
}

function Results({ results, mode, topic, onRetake, onHome, onStudyGuide }) {
  return (
    <div className="results-wrap">
      <div className="score-card">
        <div className={`score-badge ${results.passed ? 'pass' : ''}`}>
          <div className="score-pct">{results.score}%</div>
          <div className="score-label">{results.passed ? 'PASSED' : 'KEEP GOING'}</div>
        </div>
        <div className="result-title">{results.passed ? 'Great job!' : "You're getting there!"}</div>
        <div className="result-sub">
          {mode === 'pretest' ? 'Pre-Test · ' : mode === 'topic' ? `${topic} · ` : 'Full Exam · '}
          {results.correct} of {results.total} correct {!results.passed && '· Need 75% to pass'}
        </div>
        {results.weakTopics?.length > 0 && (
          <>
            <div style={{ fontSize: '0.85rem', color: '#7a5560', marginBottom: '10px', fontWeight: '500', marginTop: '16px' }}>Focus areas:</div>
            <div className="topics-grid">{results.weakTopics.map(t => <span key={t} className="topic-pill">{t}</span>)}</div>
          </>
        )}
      </div>
      {results.explanations?.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div className="section-title">Answer Explanations</div>
          {results.explanations.map((e, i) => (
            <div key={i} className="explanation-card">
              <div className="explanation-q">{e.question}</div>
              <div className="explanation-text">{e.explanation}</div>
              <div className="explanation-tip">💡 {e.tip}</div>
            </div>
          ))}
        </div>
      )}
      {results.studyGuide && (
        <div>
          <div className="section-title">Quick Study Notes</div>
          <div className="study-guide-card">
            <p style={{ color: '#7a5560', marginBottom: '24px', lineHeight: '1.7' }}>{results.studyGuide.intro}</p>
            {results.studyGuide.topics?.map((t, i) => (
              <div key={i} className="study-topic">
                <div className="study-topic-name">{t.name}</div>
                <ul className="study-points">{t.keyPoints?.map((pt, j) => <li key={j}>{pt}</li>)}</ul>
                {t.examTip && <div className="exam-tip">Exam tip: {t.examTip}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', paddingBottom: '40px', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={onHome}>← Dashboard</button>
        {mode === 'full' && <button className="btn-secondary" onClick={onStudyGuide} style={{ background: '#FDF6F8' }}>📖 Full Study Guide</button>}
        <button className="btn-primary" onClick={onRetake} style={{ maxWidth: '200px' }}>Retake</button>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [screen, setScreen] = useState('login')
  const [examMode, setExamMode] = useState(null)
  const [examTopic, setExamTopic] = useState(null)
  const [results, setResults] = useState(null)
  const [examQuestions, setExamQuestions] = useState(null)
  const [feedbackOn, setFeedbackOn] = useState(() => load('brb_feedback') ?? false)

  const handleLogin = (u) => { setUser(u); setScreen('dashboard') }
  const handleLogout = () => { setUser(null); setScreen('login'); setResults(null) }
  const handleNav = (s) => { setScreen(s); setResults(null) }

  const handleStart = (mode, topic = null) => {
    if (mode === 'studyguide') { setScreen('studyguide'); return }
    setExamMode(mode); setExamTopic(topic); setResults(null)
    if (mode === 'resume') {
      const saved = load('brb_session')
      setExamQuestions(saved?.questions || buildFullExam())
    } else if (mode === 'pretest') {
      setExamQuestions(buildPreTest())
    } else if (mode === 'topic') {
      setExamQuestions(buildTopicTest(topic))
    } else {
      setExamQuestions(buildFullExam())
    }
    setScreen('exam')
  }

  const handleSubmit = async (answers, qs, mode, topic) => {
    setScreen('grading')
    try {
      const res = await fetch('/api/grade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, questions: qs })
      })
      const data = await res.json()
      const history = load('brb_history') || []
      history.push({ score: data.score, passed: data.passed, correct: data.correct, total: data.total, type: mode, topic, date: new Date().toISOString(), topicBreakdown: data.topicBreakdown || {} })
      save('brb_history', history)
      if (mode === 'topic' && topic) {
        const attempts = load('brb_topic_attempts') || {}
        attempts[topic] = (attempts[topic] || 0) + 1
        save('brb_topic_attempts', attempts)
      }
      // Invalidate cached study guide when new data arrives
      if (mode === 'full') clear('brb_study_guide')
      setResults(data); setScreen('results')
    } catch { alert('Grading failed. Please try again.'); setScreen('dashboard') }
  }

  return (
    <>
      <Header user={user} onLogout={handleLogout} screen={screen} onNav={handleNav} />
      {screen === 'login' && <Login onLogin={handleLogin} />}
      {screen === 'dashboard' && <Dashboard user={user} onStart={handleStart} feedbackOn={feedbackOn} setFeedbackOn={setFeedbackOn} />}
      {screen === 'stats' && <StatsPage />}
      {screen === 'studyguide' && <StudyGuidePage onHome={() => setScreen('dashboard')} />}
      {screen === 'exam' && <ExamScreen mode={examMode} topic={examTopic} examQuestions={examQuestions} feedbackOn={feedbackOn} onSubmit={handleSubmit} onHome={() => setScreen('dashboard')} />}
      {screen === 'grading' && <Grading />}
      {screen === 'results' && <Results results={results} mode={examMode} topic={examTopic} onRetake={() => handleStart(examMode, examTopic)} onHome={() => setScreen('dashboard')} onStudyGuide={() => setScreen('studyguide')} />}
    </>
  )
}
