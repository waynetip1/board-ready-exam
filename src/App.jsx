import { useState, useEffect, useCallback } from 'react'
import { questions } from './questions.js'

const EXAM_MINUTES = 90
const TOPICS = [...new Set(questions.map(q => q.topic))]

// Storage helpers
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch(e) {} }
const load = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch(e) { return null } }
const clear = (key) => { try { localStorage.removeItem(key) } catch(e) {} }

function Header({ user, onLogout, onHome }) {
  return (
    <div className="header">
      <div style={{ cursor: user ? 'pointer' : 'default' }} onClick={user ? onHome : undefined}>
        <div className="header-logo">Board Ready Beauty</div>
        <div className="header-sub">Written Exam Prep</div>
      </div>
      {user && (
        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#7a5560', cursor: 'pointer', fontSize: '0.85rem' }}>
          Sign out
        </button>
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
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok || !data.jwt) {
        setError(data.error || 'Invalid email or password.')
        setLoading(false)
        return
      }
      onLogin({ email, name: data.name, jwt: data.jwt })
    } catch (err) {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">Board Ready Beauty</div>
        <div className="login-tagline">Written Exam Prep — Texas Cosmetology</div>
        {error && <div className="error-msg">{error}</div>}
        <label className="form-label">Email address</label>
        <input className="form-input" type="email" placeholder="your@email.com" value={email}
          onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        <label className="form-label">Password</label>
        <input className="form-input" type="password" placeholder="Your password" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Signing in...' : 'Access My Exam'}
        </button>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8rem', color: '#7a5560' }}>
          Use the email and password from your purchase confirmation.<br />
          <a href="https://boardreadybeauty.com/my-account/lost-password/" style={{ color: '#8B2040' }}>Forgot password?</a>
        </p>
      </div>
    </div>
  )
}

function Dashboard({ user, onStart }) {
  const hasSaved = !!load('brb_session')
  const history = load('brb_history') || []
  const lastScore = history.length > 0 ? history[history.length - 1] : null
  const topicAttempts = load('brb_topic_attempts') || {}

  return (
    <div className="intro-wrap" style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div className="intro-title">Welcome back, {user.name.split('.')[0]}!</div>
        <div className="intro-sub">What would you like to do today?</div>
      </div>

      {hasSaved && (
        <div style={{ background: '#fff8e6', border: '1px solid #f0d080', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '600', color: '#8B6000', fontSize: '0.95rem' }}>You have an exam in progress</div>
            <div style={{ fontSize: '0.85rem', color: '#a07800', marginTop: '2px' }}>Continue where you left off</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => { clear('brb_session'); onStart('full') }}>Start Fresh</button>
            <button className="btn-next" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => onStart('resume')}>Resume</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="dash-card" onClick={() => onStart('pretest')}>
          <div className="dash-card-icon">🎯</div>
          <div className="dash-card-title">Pre-Test Diagnostic</div>
          <div className="dash-card-desc">30 questions · No timer · Identify weak areas</div>
          <div className="dash-card-action">Start Pre-Test →</div>
        </div>

        <div className="dash-card" onClick={() => !hasSaved && onStart('full')}>
          <div className="dash-card-icon">📝</div>
          <div className="dash-card-title">Full Practice Exam</div>
          <div className="dash-card-desc">120 questions · 90 min · Mirrors real PSI exam</div>
          {lastScore && <div style={{ fontSize: '0.78rem', color: '#8B2040', marginTop: '4px' }}>Last score: {lastScore.score}%</div>}
          <div className="dash-card-action">Start Exam →</div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ fontWeight: '600', color: '#8B2040', marginBottom: '14px', fontSize: '0.95rem' }}>Focused Topic Tests</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {TOPICS.map(topic => {
            const attempts = topicAttempts[topic] || 0
            return (
              <div key={topic} className="topic-card" onClick={() => onStart('topic', topic)}>
                <div style={{ fontSize: '0.88rem', fontWeight: '500', color: '#2d1a1f' }}>{topic}</div>
                <div style={{ fontSize: '0.75rem', color: '#7a5560', marginTop: '3px' }}>
                  {questions.filter(q => q.topic === topic).length}Q
                  {attempts > 0 && ` · ${attempts} attempt${attempts > 1 ? 's' : ''}`}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px', marginTop: '16px' }}>
          <div style={{ fontWeight: '600', color: '#8B2040', marginBottom: '14px', fontSize: '0.95rem' }}>Recent Results</div>
          {history.slice(-5).reverse().map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < Math.min(history.length, 5) - 1 ? '1px solid #f0e0e5' : 'none', fontSize: '0.88rem' }}>
              <span style={{ color: '#7a5560' }}>{h.type === 'full' ? 'Full Exam' : h.type === 'pretest' ? 'Pre-Test' : h.topic}</span>
              <span style={{ fontWeight: '600', color: h.passed ? '#2d7a4f' : '#8B2040' }}>{h.score}% {h.passed ? '✓' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionNav({ total, current, answers, onJump }) {
  return (
    <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ fontSize: '0.78rem', color: '#7a5560', marginBottom: '10px', fontWeight: '500' }}>Question Navigator</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {Array.from({ length: total }, (_, i) => (
          <button key={i} onClick={() => onJump(i)} style={{
            width: '32px', height: '32px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600',
            background: i === current ? '#8B2040' : answers[i] !== undefined ? '#F9D8E6' : '#f5f0f2',
            color: i === current ? 'white' : answers[i] !== undefined ? '#8B2040' : '#7a5560',
            outline: i === current ? '2px solid #8B2040' : 'none',
            outlineOffset: '1px'
          }}>
            {i + 1}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '0.75rem', color: '#7a5560' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#F9D8E6', marginRight: '4px' }}></span>Answered</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#f5f0f2', marginRight: '4px' }}></span>Unanswered</span>
      </div>
    </div>
  )
}

function ExamScreen({ mode, topic, onSubmit, onHome }) {
  const examQuestions = mode === 'pretest'
    ? TOPICS.map(t => {
        const tqs = questions.filter(q => q.topic === t)
        return tqs[Math.floor(Math.random() * tqs.length)]
      }).filter(Boolean)
    : mode === 'topic'
    ? questions.filter(q => q.topic === topic)
    : questions

  const totalTime = mode === 'pretest' || mode === 'topic' ? null : EXAM_MINUTES * 60

  // Load saved session for full exam resume
  const saved = mode === 'resume' ? load('brb_session') : null
  const [current, setCurrent] = useState(saved?.current || 0)
  const [answers, setAnswers] = useState(saved?.answers || {})
  const [timeLeft, setTimeLeft] = useState(saved?.timeLeft || totalTime)
  const [showNav, setShowNav] = useState(false)

  const actualQuestions = mode === 'resume' ? questions : examQuestions

  const handleSubmit = useCallback(() => {
    clear('brb_session')
    onSubmit(answers, actualQuestions, mode, topic)
  }, [answers, actualQuestions, mode, topic, onSubmit])

  // Save session periodically for full exam
  useEffect(() => {
    if (mode === 'full' || mode === 'resume') {
      save('brb_session', { answers, current, timeLeft })
    }
  }, [answers, current, timeLeft, mode])

  // Timer
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

  const mins = timeLeft ? Math.floor(timeLeft / 60).toString().padStart(2, '0') : null
  const secs = timeLeft ? (timeLeft % 60).toString().padStart(2, '0') : null
  const isWarning = timeLeft && timeLeft < 300
  const q = actualQuestions[current]
  const answered = Object.keys(answers).length
  const letters = ['A', 'B', 'C', 'D']

  if (!q) return null

  const modeLabel = mode === 'pretest' ? 'Pre-Test Diagnostic' : mode === 'topic' ? topic : 'Full Practice Exam'

  return (
    <div className="exam-wrap">
      <div className="exam-topbar">
        <div>
          <div style={{ fontSize: '0.75rem', color: '#7a5560', marginBottom: '2px' }}>{modeLabel}</div>
          {timeLeft ? <div className={`timer ${isWarning ? 'warning' : ''}`}>{mins}:{secs}</div>
            : <div style={{ fontSize: '0.9rem', color: '#8B2040', fontWeight: '600' }}>No time limit</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="progress-text">{current + 1} of {actualQuestions.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#7a5560' }}>{answered} answered</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={() => setShowNav(v => !v)}>
            {showNav ? 'Hide Map' : 'Question Map'}
          </button>
          <button className="btn-next" onClick={handleSubmit} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Submit</button>
        </div>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${((current + 1) / actualQuestions.length) * 100}%` }} />
      </div>

      {showNav && (
        <QuestionNav total={actualQuestions.length} current={current} answers={answers} onJump={i => { setCurrent(i); setShowNav(false) }} />
      )}

      <div className="question-card">
        <div className="question-topic">{q.topic}</div>
        <div className="question-text">{q.question}</div>
        <div className="options-grid">
          {q.options.map((opt, i) => (
            <button key={i} className={`option-btn ${answers[current] === i ? 'selected' : ''}`}
              onClick={() => setAnswers(prev => ({ ...prev, [current]: i }))}>
              <span className="option-letter">{letters[i]}</span>{opt}
            </button>
          ))}
        </div>
      </div>

      <div className="nav-row">
        <button className="btn-secondary" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>← Previous</button>
        <button className="btn-secondary" onClick={onHome} style={{ fontSize: '0.82rem', padding: '10px 16px' }}>
          {mode === 'full' || mode === 'resume' ? '💾 Save & Exit' : 'Exit'}
        </button>
        {current < actualQuestions.length - 1
          ? <button className="btn-next" onClick={() => setCurrent(c => c + 1)}>Next →</button>
          : <button className="btn-next" onClick={handleSubmit}>Submit ✓</button>}
      </div>
    </div>
  )
}

function Grading() {
  return (
    <div className="grading-wrap">
      <div className="grading-spinner" />
      <div className="grading-title">Grading your exam...</div>
      <p style={{ color: '#7a5560', fontSize: '0.95rem', lineHeight: '1.7' }}>
        Claude AI is reviewing your answers and building your personalized study guide. This takes about 30 seconds.
      </p>
    </div>
  )
}

function Results({ results, mode, topic, onRetake, onHome }) {
  return (
    <div className="results-wrap">
      <div className="score-card">
        <div className={`score-badge ${results.passed ? 'pass' : ''}`}>
          <div className="score-pct">{results.score}%</div>
          <div className="score-label">{results.passed ? 'PASSED' : 'KEEP GOING'}</div>
        </div>
        <div className="result-title">{results.passed ? 'Great job!' : "You're getting there!"}</div>
        <div className="result-sub">
          {mode === 'pretest' ? 'Pre-Test Diagnostic · ' : mode === 'topic' ? `${topic} · ` : 'Full Practice Exam · '}
          {results.correct} of {results.total} correct
          {!results.passed && ' · Passing score is 75%'}
        </div>
        {results.weakTopics?.length > 0 && (
          <>
            <div style={{ fontSize: '0.85rem', color: '#7a5560', marginBottom: '10px', fontWeight: '500', marginTop: '16px' }}>Focus areas:</div>
            <div className="topics-grid">
              {results.weakTopics.map(t => <span key={t} className="topic-pill">{t}</span>)}
            </div>
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
              <div className="explanation-tip">💡 Memory tip: {e.tip}</div>
            </div>
          ))}
        </div>
      )}

      {results.studyGuide && (
        <div>
          <div className="section-title">Your Personalized Study Guide</div>
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

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingBottom: '40px', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={onHome} style={{ minWidth: '160px' }}>← Dashboard</button>
        <button className="btn-primary" onClick={onRetake} style={{ maxWidth: '240px' }}>Retake</button>
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

  const handleLogin = (userData) => { setUser(userData); setScreen('dashboard') }
  const handleLogout = () => { setUser(null); setScreen('login'); setResults(null) }
  const handleHome = () => { setScreen('dashboard'); setResults(null) }

  const handleStart = (mode, topic = null) => {
    setExamMode(mode)
    setExamTopic(topic)
    setResults(null)
    setScreen('exam')
  }

  const handleSubmit = async (answers, qs, mode, topic) => {
    setScreen('grading')
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, questions: qs })
      })
      const data = await res.json()

      // Save to history
      const history = load('brb_history') || []
      history.push({ score: data.score, passed: data.passed, type: mode, topic, date: new Date().toISOString() })
      save('brb_history', history)

      // Track topic attempts
      if (mode === 'topic' && topic) {
        const attempts = load('brb_topic_attempts') || {}
        attempts[topic] = (attempts[topic] || 0) + 1
        save('brb_topic_attempts', attempts)
      }

      setResults(data)
      setScreen('results')
    } catch {
      alert('Grading failed. Please try again.')
      setScreen('dashboard')
    }
  }

  return (
    <>
      <Header user={user} onLogout={handleLogout} onHome={handleHome} />
      {screen === 'login' && <Login onLogin={handleLogin} />}
      {screen === 'dashboard' && <Dashboard user={user} onStart={handleStart} />}
      {screen === 'exam' && <ExamScreen mode={examMode} topic={examTopic} onSubmit={handleSubmit} onHome={handleHome} />}
      {screen === 'grading' && <Grading />}
      {screen === 'results' && <Results results={results} mode={examMode} topic={examTopic} onRetake={() => handleStart(examMode, examTopic)} onHome={handleHome} />}
    </>
  )
}
