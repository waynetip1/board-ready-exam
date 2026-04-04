import { useState, useEffect, useCallback } from 'react'
import { questions } from './questions.js'

const EXAM_MINUTES = 90

function Header({ user, onLogout }) {
  return (
    <div className="header">
      <div>
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

function ExamIntro({ user, onStart }) {
  return (
    <div className="intro-wrap">
      <div className="intro-card">
        <div className="intro-title">Ready to practice?</div>
        <div className="intro-sub">Welcome back, {user.name}. This timed practice exam mirrors the real Texas PSI written exam.</div>
        <div className="intro-stats">
          <div className="stat-box"><div className="stat-num">120</div><div className="stat-label">Questions</div></div>
          <div className="stat-box"><div className="stat-num">90</div><div className="stat-label">Minutes</div></div>
          <div className="stat-box"><div className="stat-num">75%</div><div className="stat-label">To Pass</div></div>
        </div>
        <div style={{ marginBottom: '24px', fontSize: '0.9rem', color: '#7a5560', lineHeight: '1.7' }}>
          <strong style={{ color: '#8B2040' }}>Topics covered:</strong> Sanitation & Infection Control, Hair Care & Chemistry, Scalp & Hair Disorders, Skin Care & Anatomy, Nail Care, Chemical Services, Texas TDLR Laws & Regulations, Coloring & Lightening, Haircutting & Styling, Anatomy & Physiology, and more.
        </div>
        <div style={{ background: '#FDF6F8', border: '1px solid #ecd5db', borderRadius: '10px', padding: '16px', marginBottom: '28px', fontSize: '0.85rem', color: '#7a5560' }}>
          After the exam: Claude AI will grade your answers, explain every wrong answer, and generate a personalized study guide.
        </div>
        <button className="btn-primary" onClick={onStart}>Start Exam</button>
      </div>
    </div>
  )
}

function Exam({ onSubmit }) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(EXAM_MINUTES * 60)

  const handleSubmit = useCallback(() => { onSubmit(answers) }, [answers, onSubmit])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [handleSubmit])

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const secs = (timeLeft % 60).toString().padStart(2, '0')
  const isWarning = timeLeft < 300
  const q = questions[current]
  const answered = Object.keys(answers).length
  const letters = ['A', 'B', 'C', 'D']

  return (
    <div className="exam-wrap">
      <div className="exam-topbar">
        <div className={`timer ${isWarning ? 'warning' : ''}`}>{mins}:{secs}</div>
        <div className="progress-text">{current + 1} of {questions.length} &nbsp;·&nbsp; {answered} answered</div>
        <button className="btn-next" onClick={handleSubmit} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Submit Exam</button>
      </div>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>
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
        {current < questions.length - 1
          ? <button className="btn-next" onClick={() => setCurrent(c => c + 1)}>Next →</button>
          : <button className="btn-next" onClick={handleSubmit}>Submit Exam</button>}
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

function Results({ results, onRetake }) {
  return (
    <div className="results-wrap">
      <div className="score-card">
        <div className={`score-badge ${results.passed ? 'pass' : ''}`}>
          <div className="score-pct">{results.score}%</div>
          <div className="score-label">{results.passed ? 'PASSED' : 'KEEP GOING'}</div>
        </div>
        <div className="result-title">{results.passed ? 'Great job!' : "You're getting there!"}</div>
        <div className="result-sub">
          You answered {results.correct} out of {results.total} questions correctly.
          {results.passed ? " You're on track to pass the real exam!" : ' A passing score is 75%. Review your study guide below and retake when ready.'}
        </div>
        {results.weakTopics?.length > 0 && (
          <>
            <div style={{ fontSize: '0.85rem', color: '#7a5560', marginBottom: '10px', fontWeight: '500' }}>Focus areas:</div>
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
              <div className="explanation-tip">Memory tip: {e.tip}</div>
            </div>
          ))}
        </div>
      )}

      {results.studyGuide && (
        <div>
          <div className="section-title">Your Personalized Study Guide</div>
          <div className="study-guide-card">
            <p style={{ color: '#7a5560', marginBottom: '24px', lineHeight: '1.7' }}>{results.studyGuide.intro}</p>
            {results.studyGuide.topics?.map((topic, i) => (
              <div key={i} className="study-topic">
                <div className="study-topic-name">{topic.name}</div>
                <ul className="study-points">{topic.keyPoints?.map((pt, j) => <li key={j}>{pt}</li>)}</ul>
                {topic.examTip && <div className="exam-tip">Exam tip: {topic.examTip}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', paddingBottom: '40px' }}>
        <button className="btn-primary" onClick={onRetake} style={{ maxWidth: '300px' }}>Retake Exam</button>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [screen, setScreen] = useState('login')
  const [results, setResults] = useState(null)

  const handleLogin = (userData) => { setUser(userData); setScreen('intro') }
  const handleLogout = () => { setUser(null); setScreen('login'); setResults(null) }
  const handleStart = () => setScreen('exam')

  const handleSubmit = async (answers) => {
    setScreen('grading')
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, questions })
      })
      const data = await res.json()
      setResults(data)
      setScreen('results')
    } catch {
      alert('Grading failed. Please try again.')
      setScreen('intro')
    }
  }

  return (
    <>
      <Header user={user} onLogout={handleLogout} />
      {screen === 'login' && <Login onLogin={handleLogin} />}
      {screen === 'intro' && <ExamIntro user={user} onStart={handleStart} />}
      {screen === 'exam' && <Exam onSubmit={handleSubmit} />}
      {screen === 'grading' && <Grading />}
      {screen === 'results' && <Results results={results} onRetake={() => { setResults(null); setScreen('intro') }} />}
    </>
  )
}
