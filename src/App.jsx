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
        <div onClick={() => { setFeedbackOn(!feedbackOn); save('brb_feedback', !feedbackOn) }}
          style={{ background: feedbackOn ? '#FDF0F3' : 'white', border: `2px solid ${feedbackOn ? '#8B2040' : '#ecd5db'}`, borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '220px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: feedbackOn ? '#8B2040' : '#2d1a1f', marginBottom: '2px' }}>
              {feedbackOn ? '✓ Real-Time Feedback ON' : 'Real-Time Feedback OFF'}
            </div>
            <div style={{ fontSize: '0.73rem', color: feedbackOn ? '#C0506A' : '#7a5560', lineHeight: 1.4 }}>
              {feedbackOn ? 'See correct/wrong after each answer' : 'Classic mode — review at end'}
            </div>
          </div>
          <div style={{ width: '48px', height: '26px', borderRadius: '13px', background: feedbackOn ? '#8B2040' : '#d0c0c5', position: 'relative', transition: 'background 0.2s', flexShrink: 0, boxShadow: feedbackOn ? '0 2px 8px rgba(139,32,64,0.3)' : 'none' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: feedbackOn ? '24px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
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
  const hasFeedback = confirmed && Object.keys(confirmed).length > 0
  return (
    <div style={{ background: 'white', border: '1.5px solid #ecd5db', borderRadius: '14px', padding: '18px 20px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(139,32,64,0.06)' }}>
      <div style={{ fontSize: '0.8rem', color: '#8B2040', marginBottom: '14px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Question Map</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {Array.from({ length: total }, (_, i) => {
          const isCurrentQ = i === current
          const isConfirmedCorrect = confirmed?.[i] === true
          const isConfirmedWrong = confirmed?.[i] === false
          const isAnswered = answers[i] !== undefined
          let bg = '#ede8ea'
          let color = '#999'
          let border = '2px solid transparent'
          let shadow = 'none'
          if (isCurrentQ) { bg = '#8B2040'; color = 'white'; border = '2px solid #8B2040'; shadow = '0 2px 8px rgba(139,32,64,0.4)' }
          else if (isConfirmedCorrect) { bg = '#2d7a4f'; color = 'white'; border = '2px solid #2d7a4f' }
          else if (isConfirmedWrong) { bg = '#c0392b'; color = 'white'; border = '2px solid #c0392b' }
          else if (isAnswered) { bg = '#F9D8E6'; color = '#8B2040'; border = '2px solid #E8809A' }
          return (
            <button key={i} onClick={() => onJump(i)} title={`Question ${i + 1}${isConfirmedCorrect ? ' ✓ Correct' : isConfirmedWrong ? ' ✗ Wrong' : isAnswered ? ' — Answered' : ' — Unanswered'}`} style={{
              width: '34px', height: '34px', borderRadius: '8px', border, cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: '700', background: bg, color, boxShadow: shadow,
              transition: 'all 0.15s', position: 'relative'
            }}>
              {i + 1}
              {isConfirmedCorrect && <span style={{ position: 'absolute', top: '-4px', right: '-4px', fontSize: '0.55rem', background: 'white', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2d7a4f', fontWeight: '900', lineHeight: 1 }}>✓</span>}
              {isConfirmedWrong && <span style={{ position: 'absolute', top: '-4px', right: '-4px', fontSize: '0.55rem', background: 'white', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0392b', fontWeight: '900', lineHeight: 1 }}>✗</span>}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '10px 12px', background: '#fdf6f8', borderRadius: '8px' }}>
        <span style={{ fontSize: '0.73rem', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#8B2040', display: 'inline-block' }}></span>Current
        </span>
        {hasFeedback && <>
          <span style={{ fontSize: '0.73rem', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#2d7a4f', display: 'inline-block' }}></span>Correct
          </span>
          <span style={{ fontSize: '0.73rem', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#c0392b', display: 'inline-block' }}></span>Wrong
          </span>
        </>}
        <span style={{ fontSize: '0.73rem', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#F9D8E6', border: '1.5px solid #E8809A', display: 'inline-block' }}></span>Answered
        </span>
        <span style={{ fontSize: '0.73rem', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#ede8ea', display: 'inline-block' }}></span>Unanswered
        </span>
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
    const masteryColor = (m) => m === 'Strong' ? '#2d7a4f' : m === 'Developing' ? '#b07000' : '#c0392b'
    const sectionsHtml = (guide.sections || []).map(s => `
      <div class="section">
        <div class="section-header">
          <h2>${s.topic}</h2>
          ${s.mastery ? `<span class="badge" style="background:${masteryColor(s.mastery)}20;color:${masteryColor(s.mastery)};border:1px solid ${masteryColor(s.mastery)}">${s.mastery} · ${s.score || ''}%</span>` : ''}
        </div>
        ${s.plainEnglishOverview ? `<p class="overview">${s.plainEnglishOverview}</p>` : ''}
        ${s.whyItMatters ? `<p class="why"><strong>Why it matters on the exam:</strong> ${s.whyItMatters}</p>` : ''}
        ${s.keyConcepts?.length ? `
          <h3>Key Concepts</h3>
          ${s.keyConcepts.map(c => `
            <div class="concept">
              <div class="concept-name">${c.concept}</div>
              <p>${c.explanation}</p>
              ${c.analogy ? `<div class="analogy">💡 Think of it this way: ${c.analogy}</div>` : ''}
              ${c.memoryTrick ? `<div class="memory">🧠 Memory trick: ${c.memoryTrick}</div>` : ''}
              ${c.examAlert ? `<div class="alert">⚠️ On the exam: ${c.examAlert}</div>` : ''}
            </div>
          `).join('')}
        ` : ''}
        ${s.examWarnings?.length ? `
          <div class="warnings">
            <strong>⚠️ Watch Out On The Exam:</strong>
            <ul>${s.examWarnings.map(w => `<li>${w}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${s.reference ? `<div class="reference">📚 Reference: ${s.reference}</div>` : ''}
        ${s.selfCheck?.length ? `
          <div class="selfcheck">
            <strong>✏️ Quick Self-Check:</strong>
            ${s.selfCheck.map((q, i) => `
              <div class="check-q"><strong>Q${i+1}:</strong> ${q.question}</div>
              <div class="check-a"><strong>A:</strong> ${q.answer}</div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Board Ready Beauty — Study Guide</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Georgia, serif; max-width: 820px; margin: 0 auto; padding: 32px 24px; color: #2d1a1f; line-height: 1.75; font-size: 15px; }
      .cover { text-align: center; padding: 48px 0 32px; border-bottom: 2px solid #ecd5db; margin-bottom: 32px; }
      .cover h1 { color: #8B2040; font-size: 2.2rem; margin: 0 0 6px; }
      .cover .sub { color: #7a5560; font-size: 1rem; margin-bottom: 4px; }
      .cover .date { color: #aaa; font-size: 0.85rem; }
      .score-summary { display: flex; gap: 20px; justify-content: center; margin: 20px 0; flex-wrap: wrap; }
      .score-pill { background: #FDF6F8; border: 1px solid #ecd5db; border-radius: 20px; padding: 8px 20px; font-size: 0.9rem; color: #8B2040; font-weight: bold; }
      .intro-box { background: #FDF6F8; border-left: 4px solid #8B2040; padding: 16px 20px; border-radius: 0 10px 10px 0; margin-bottom: 24px; font-style: italic; color: #5a2030; }
      .how-to { background: #f0f8f4; border-left: 4px solid #2d7a4f; padding: 14px 18px; border-radius: 0 10px 10px 0; margin-bottom: 32px; font-size: 0.92rem; color: #1a4a30; }
      .section { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid #ecd5db; page-break-inside: avoid; }
      .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
      h2 { color: #8B2040; font-size: 1.35rem; margin: 0; }
      h3 { color: #C0506A; font-size: 1rem; margin: 20px 0 10px; border-bottom: 1px dotted #ecd5db; padding-bottom: 4px; }
      .badge { font-size: 0.78rem; padding: 3px 12px; border-radius: 20px; font-weight: 600; white-space: nowrap; }
      .overview { color: #3a2025; font-size: 0.97rem; margin-bottom: 8px; }
      .why { color: #5a4040; font-size: 0.9rem; margin-bottom: 16px; }
      .concept { background: #fdf6f8; border: 1px solid #ecd5db; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; }
      .concept-name { font-weight: 700; color: #8B2040; font-size: 1rem; margin-bottom: 6px; }
      .analogy { background: #fffbea; border-left: 3px solid #f0c040; padding: 8px 12px; border-radius: 0 6px 6px 0; margin: 8px 0; font-size: 0.9rem; color: #5a4800; }
      .memory { background: #eef4ff; border-left: 3px solid #4a80c0; padding: 8px 12px; border-radius: 0 6px 6px 0; margin: 8px 0; font-size: 0.9rem; color: #1a3a6a; }
      .alert { background: #fff8e6; border-left: 3px solid #e08020; padding: 8px 12px; border-radius: 0 6px 6px 0; margin: 8px 0; font-size: 0.9rem; color: #6a3a00; }
      .warnings { background: #fff0f0; border: 1px solid #f0c0c0; border-radius: 10px; padding: 12px 16px; margin: 12px 0; }
      .warnings ul { margin: 8px 0 0; padding-left: 18px; } .warnings li { margin-bottom: 4px; font-size: 0.9rem; }
      .reference { font-size: 0.82rem; color: #7a5560; margin-top: 12px; font-style: italic; }
      .selfcheck { background: #f0f8f4; border: 1px solid #b0d8c0; border-radius: 10px; padding: 14px 16px; margin-top: 14px; }
      .check-q { font-size: 0.9rem; color: #1a4a30; margin-bottom: 4px; margin-top: 10px; }
      .check-a { font-size: 0.9rem; color: #2d7a4f; margin-bottom: 4px; padding-left: 12px; }
      .schedule { background: #f8f4ff; border: 1px solid #c8b8e8; border-radius: 10px; padding: 16px 20px; margin: 24px 0; }
      .exam-day { background: #FDF6F8; border: 1px solid #ecd5db; border-radius: 10px; padding: 16px 20px; margin: 24px 0; }
      .exam-day ul { margin: 8px 0 0; padding-left: 18px; } .exam-day li { margin-bottom: 6px; }
      .final { text-align: center; padding: 32px 20px; color: #7a5560; font-style: italic; border-top: 2px solid #ecd5db; margin-top: 32px; }
      @media print { .section { page-break-inside: avoid; } body { padding: 16px; } }
    </style></head><body>
    <div class="cover">
      <h1>Board Ready Beauty</h1>
      <div class="sub">Comprehensive Study Guide — Texas Cosmetology Written Exam (PSI/TDLR)</div>
      <div class="date">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div class="score-summary">
        <span class="score-pill">Overall: ${overallPct}%</span>
        <span class="score-pill">${examCount} Full Exam${examCount !== 1 ? 's' : ''} Completed</span>
        <span class="score-pill">${totalAnswered} Questions Answered</span>
      </div>
    </div>
    ${guide.intro ? `<div class="intro-box">${guide.intro}</div>` : ''}
    ${guide.howToUseThisGuide ? `<div class="how-to"><strong>📖 How to use this guide:</strong> ${guide.howToUseThisGuide}</div>` : ''}
    ${sectionsHtml}
    ${guide.studySchedule ? `<div class="schedule"><h3 style="color:#6030a0;margin-top:0">📅 Your Study Schedule</h3><p>${guide.studySchedule}</p></div>` : ''}
    ${guide.examDayTips?.length ? `<div class="exam-day"><h3 style="color:#8B2040;margin-top:0">🎯 Exam Day Tips</h3><ul>${guide.examDayTips.map(t => `<li>${t}</li>`).join('')}</ul></div>` : ''}
    ${guide.finalNotes ? `<div class="final">${guide.finalNotes}</div>` : ''}
    </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 600)
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
      <div className="sg-header">
        <div className="intro-title" style={{ margin: 0 }}>📖 Study Guide</div>
        <div className="sg-actions">
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
          {guide.intro && <div className="sg-intro-box">{guide.intro}</div>}
          {guide.howToUseThisGuide && (
            <div className="sg-how-to">
              <strong>📖 How to use this guide:</strong> {guide.howToUseThisGuide}
            </div>
          )}

          {guide.sections?.map((s, i) => {
            const masteryColor = s.mastery === 'Strong' ? '#2d7a4f' : s.mastery === 'Developing' ? '#b07000' : '#c0392b'
            const masteryBg = s.mastery === 'Strong' ? '#e8f5ee' : s.mastery === 'Developing' ? '#fff8e0' : '#ffeaea'
            return (
              <div key={i} className="sg-section">
                <div className="sg-section-header">
                  <div className="study-topic-name" style={{ fontSize: '1.15rem' }}>{s.topic}</div>
                  {s.mastery && (
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '4px 14px', borderRadius: '20px', background: masteryBg, color: masteryColor, border: `1px solid ${masteryColor}40` }}>
                      {s.mastery} {s.score ? `· ${s.score}%` : ''}
                    </span>
                  )}
                </div>

                {s.plainEnglishOverview && (
                  <p style={{ color: '#3a2025', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '10px' }}>{s.plainEnglishOverview}</p>
                )}
                {s.whyItMatters && (
                  <p style={{ color: '#5a4040', fontSize: '0.88rem', lineHeight: '1.65', marginBottom: '16px', fontStyle: 'italic' }}>
                    <strong>Why this matters:</strong> {s.whyItMatters}
                  </p>
                )}

                {s.keyConcepts?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#8B2040', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Concepts</div>
                    {s.keyConcepts.map((c, j) => (
                      <div key={j} className="sg-concept">
                        <div style={{ fontWeight: '700', color: '#8B2040', marginBottom: '6px', fontSize: '0.95rem' }}>{c.concept}</div>
                        <p style={{ color: '#2d1a1f', fontSize: '0.9rem', lineHeight: '1.7', margin: '0 0 8px' }}>{c.explanation}</p>
                        {c.analogy && <div className="sg-box sg-box-yellow">💡 <strong>Think of it this way:</strong> {c.analogy}</div>}
                        {c.memoryTrick && <div className="sg-box sg-box-blue">🧠 <strong>Memory trick:</strong> {c.memoryTrick}</div>}
                        {c.examAlert && <div className="sg-box sg-box-orange">⚠️ <strong>On the exam:</strong> {c.examAlert}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {s.examWarnings?.length > 0 && (
                  <div className="sg-warnings">
                    <div style={{ fontWeight: '700', color: '#c0392b', marginBottom: '8px', fontSize: '0.85rem' }}>⚠️ Watch Out On The Exam</div>
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                      {s.examWarnings.map((w, j) => <li key={j} style={{ fontSize: '0.88rem', color: '#8b0000', marginBottom: '4px', lineHeight: '1.6' }}>{w}</li>)}
                    </ul>
                  </div>
                )}

                {s.reference && (
                  <div style={{ fontSize: '0.78rem', color: '#7a5560', fontStyle: 'italic', marginBottom: '12px' }}>
                    📚 Reference: {s.reference}
                  </div>
                )}

                {s.selfCheck?.length > 0 && (
                  <div className="sg-selfcheck">
                    <div style={{ fontWeight: '700', color: '#1a4a30', marginBottom: '10px', fontSize: '0.85rem' }}>✏️ Quick Self-Check</div>
                    {s.selfCheck.map((q, j) => (
                      <div key={j} style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.88rem', color: '#1a4a30', marginBottom: '3px' }}><strong>Q{j+1}:</strong> {q.question}</div>
                        <div style={{ fontSize: '0.88rem', color: '#2d7a4f', paddingLeft: '12px' }}><strong>A:</strong> {q.answer}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {guide.studySchedule && (
            <div className="sg-schedule">
              <div style={{ fontWeight: '700', color: '#6030a0', marginBottom: '8px' }}>📅 Your Study Schedule</div>
              <p style={{ color: '#3a1860', fontSize: '0.9rem', lineHeight: '1.75', margin: 0 }}>{guide.studySchedule}</p>
            </div>
          )}
          {guide.examDayTips?.length > 0 && (
            <div className="sg-examday">
              <div style={{ fontWeight: '700', color: '#8B2040', marginBottom: '10px' }}>🎯 Exam Day Tips</div>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {guide.examDayTips.map((t, i) => <li key={i} style={{ fontSize: '0.9rem', color: '#5a2030', marginBottom: '6px', lineHeight: '1.65' }}>{t}</li>)}
              </ul>
            </div>
          )}
          {guide.finalNotes && <div className="sg-final">{guide.finalNotes}</div>}
          <div className="sg-footer-actions">
            <button className="btn-secondary" onClick={downloadPDF}>⬇ Download PDF</button>
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
  const [user, setUser] = useState(() => load('brb_user') || null)
  const [screen, setScreen] = useState(() => load('brb_user') ? 'dashboard' : 'login')
  const [examMode, setExamMode] = useState(null)
  const [examTopic, setExamTopic] = useState(null)
  const [results, setResults] = useState(null)
  const [examQuestions, setExamQuestions] = useState(null)
  const [feedbackOn, setFeedbackOn] = useState(() => load('brb_feedback') ?? false)

  const handleLogin = (u) => { save('brb_user', u); setUser(u); setScreen('dashboard') }
  const handleLogout = () => { clear('brb_user'); setUser(null); setScreen('login'); setResults(null) }
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
