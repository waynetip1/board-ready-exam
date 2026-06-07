import { useState, useEffect, useCallback, useRef } from 'react'
import { ADMIN_EMAILS, getAdminExamEngines, getExamEngine, getLicenseLabel } from './examRouter.js'
import { applyTheme, resetTheme } from './themeLoader.js'
import { TERMS_OF_SERVICE, PRIVACY_POLICY, TERMS_VERSION, TERMS_DATE } from './legal.js'
import { t } from './translations.js'
const APP_VERSION = '1.1.0'

const EXAM_MINUTES = 90
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch(e) {} }
const load = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch(e) { return null } }
const clear = (key) => { try { localStorage.removeItem(key) } catch(e) {} }

function todayISO() { return new Date().toISOString().slice(0, 10) }

function addStudyTime(minutes) {
  if (minutes <= 0) return
  const today = todayISO()
  const st = load('brb_study_time') || {}
  st[today] = (st[today] || 0) + minutes
  save('brb_study_time', st)
}

function computeStreak() {
  const st = load('brb_study_time') || {}
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if ((st[key] || 0) > 0) streak++
    else break
  }
  return streak
}

function getWeekTotal() {
  const st = load('brb_study_time') || {}
  let total = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    total += st[d.toISOString().slice(0, 10)] || 0
  }
  return total
}

function getWeekDays() {
  const st = load('brb_study_time') || {}
  const today = new Date()
  const dow = today.getDay()
  const mondayOffset = (dow + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)
  return ['M','T','W','T','F','S','S'].map((label, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    return { label, studied: (st[key] || 0) > 0, isToday: key === todayISO() }
  })
}

function daysUntilExam(examDate) {
  if (!examDate) return null
  const now = new Date(); now.setHours(0,0,0,0)
  const exam = new Date(examDate); exam.setHours(0,0,0,0)
  return Math.ceil((exam - now) / 86400000)
}

function Header({ user, onLogout, screen, onNav, lang }) {
  const navItems = [
    { key: 'dashboard', label: t(lang, 'Home') },
    { key: 'stats', label: t(lang, 'My Stats') },
    { key: 'studyguide', label: t(lang, 'Study Guide') },
    { key: 'notes', label: t(lang, 'My Notes') },
  ]
  return (
    <div className="header">
      <div style={{ cursor: 'pointer' }} onClick={() => onNav('dashboard')}>
        <div className="header-logo">Board Ready Beauty</div>
        <div className="header-sub">Written Exam Prep</div>
        <div style={{ fontSize: '0.65rem', color: '#1e1a20', opacity: 0.35 }}>v{APP_VERSION}</div>
      </div>
      {user && (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => onNav(item.key)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: screen === item.key ? '#c8185a' : '#7a5560',
              fontWeight: screen === item.key ? '600' : '400',
              fontSize: '0.88rem'
            }}>
              {item.label}
            </button>
          ))}
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#7a5560', cursor: 'pointer', fontSize: '0.85rem' }}>
            {t(lang, 'Sign out')}
          </button>
        </div>
      )}
    </div>
  )
}

function TermsModal({ onAccept, onDecline }) {
  const [tab, setTab] = useState('terms')
  const [scrolled, setScrolled] = useState(false)
  const [checked, setChecked] = useState(false)
  const handleScroll = (e) => {
    const el = e.target
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setScrolled(true)
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #ecd5db' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#c8185a', fontWeight: '700', marginBottom: '12px' }}>Before You Begin</div>
          <div style={{ display: 'flex', gap: '0' }}>
            {['terms', 'privacy'].map(tab2 => (
              <button key={tab2} onClick={() => setTab(tab2)} style={{
                padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: tab === tab2 ? '2px solid #c8185a' : '2px solid transparent',
                color: tab === tab2 ? '#c8185a' : '#7a5560', fontWeight: tab === tab2 ? '600' : '400', fontSize: '0.88rem'
              }}>
                {tab2 === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
              </button>
            ))}
          </div>
        </div>
        <div onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', fontSize: '0.82rem', lineHeight: '1.75', color: '#2d1a1f', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          {tab === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #ecd5db', background: '#fdf6f8' }}>
          {!scrolled && <div style={{ fontSize: '0.78rem', color: '#7a5560', marginBottom: '10px', textAlign: 'center' }}>↓ Please scroll to read the full document</div>}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '14px' }}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: '2px', accentColor: '#c8185a', width: '16px', height: '16px', flexShrink: 0 }} />
            <span style={{ fontSize: '0.83rem', color: '#2d1a1f', lineHeight: '1.5' }}>
              I have read and agree to the <strong>Terms of Use</strong> and <strong>Privacy Policy</strong>. I understand PassBoard is an exam prep tool and does not guarantee passage of the PSI examination.
            </span>
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onDecline} className="btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '0.88rem' }}>Decline</button>
            <button onClick={onAccept} disabled={!checked} className="btn-primary" style={{ flex: 2, padding: '12px', fontSize: '0.88rem', opacity: checked ? 1 : 0.5 }}>I Agree — Continue</button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#aaa', marginTop: '10px' }}>
            PassBoard Terms v{TERMS_VERSION} · Effective {TERMS_DATE}
          </div>
        </div>
      </div>
    </div>
  )
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
        <div style={{ position: 'relative' }}>
          <input className="form-input" type={showPassword ? 'text' : 'password'} placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={{ paddingRight: '44px' }} />
          <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7a5560', padding: '4px', display: 'flex', alignItems: 'center' }} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Signing in...' : 'Access My Exam'}</button>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8rem', color: '#7a5560' }}>
          Use the email and password from your purchase confirmation.<br />
          <a href="https://boardreadybeauty.com/my-account/lost-password/" style={{ color: '#c8185a' }}>Forgot password?</a>
        </p>
      </div>
      <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.72rem', color: '#1e1a20', opacity: 0.35 }}>v{APP_VERSION}</div>
    </div>
  )
}

function ExamCountdown({ lang }) {
  const [examDate, setExamDate] = useState(() => load('brb_exam_date') || '')
  const [editing, setEditing] = useState(false)
  const [inputDate, setInputDate] = useState(examDate)

  const days = daysUntilExam(examDate)

  const urgencyColor = days === null ? '#7a5560'
    : days >= 30 ? '#2d9e6b'
    : days >= 15 ? '#c49a2a'
    : days >= 7  ? '#e07b39'
    : '#c8185a'

  const saveDate = () => {
    save('brb_exam_date', inputDate)
    setExamDate(inputDate)
    setEditing(false)
  }

  if (!examDate || editing) {
    return (
      <div className="countdown-widget">
        <div style={{ fontSize: '0.88rem', color: '#7a5560', marginBottom: '10px' }}>{t(lang, 'When is your exam?')}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={inputDate}
            min={new Date().toISOString().slice(0,10)}
            onChange={e => setInputDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #ecd5db', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', flex: 1 }} />
          <button className="btn-next" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={saveDate} disabled={!inputDate}>Save</button>
          {examDate && <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: '#7a5560', cursor: 'pointer', fontSize: '0.82rem' }}>Cancel</button>}
        </div>
      </div>
    )
  }

  const formattedDate = new Date(examDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="countdown-widget" style={{ borderColor: urgencyColor + '40', background: urgencyColor + '08' }}>
      <div style={{ fontSize: '0.85rem', color: '#7a5560', marginBottom: '4px' }}>{t(lang, 'Your exam is in')}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.4rem', fontWeight: '700', color: urgencyColor, lineHeight: 1.1 }}>
        {days !== null ? days : '—'}
      </div>
      <div style={{ fontSize: '0.88rem', color: urgencyColor, fontWeight: '600', marginBottom: '6px' }}>
        {days === 1 ? t(lang, 'day') : t(lang, 'days')}
        {days !== null && days <= 0 && ' — Exam day!'}
      </div>
      <div style={{ fontSize: '0.78rem', color: '#7a5560', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {formattedDate}
        <button onClick={() => { setInputDate(examDate); setEditing(true) }} style={{ background: 'none', border: 'none', color: '#c8185a', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}>
          {t(lang, 'Change date')}
        </button>
      </div>
    </div>
  )
}

function StudyTimerWidget({ lang }) {
  const [, forceUpdate] = useState(0)
  const todayMins = (load('brb_study_time') || {})[todayISO()] || 0
  const weekMins = getWeekTotal()
  const streak = computeStreak()
  const weekDays = getWeekDays()

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="timer-widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#7a5560', marginBottom: '2px' }}>
            {t(lang, 'Today')} <strong style={{ color: '#c8185a' }}>{todayMins} {t(lang, 'min')}</strong> {t(lang, 'studied')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7a5560' }}>
            {t(lang, 'This week')}: {weekMins} {t(lang, 'min')}
          </div>
        </div>
        {streak > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#c8185a' }}>🔥 {streak} {t(lang, 'Day Streak')}</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', alignItems: 'center' }}>
        {weekDays.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.65rem', color: '#7a5560', marginBottom: '3px' }}>{d.label}</div>
            <div style={{
              fontSize: '0.75rem',
              lineHeight: 1,
              opacity: d.isToday && d.studied ? 1 : 1,
              animation: d.isToday && d.studied ? 'pulse 2s infinite' : 'none'
            }}>
              {d.studied ? '✅' : '⬜'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Dashboard({ user, onStart, engine, feedbackOn, setFeedbackOn, difficulty, setDifficulty, adaptiveMode, setAdaptiveMode, tone, setTone, language, setLanguage, lang }) {
  const hasSaved = !!load('brb_session')
  const history = load('brb_history') || []
  const lastFull = [...history].reverse().find(h => h.type === 'full')
  const topicAttempts = load('brb_topic_attempts') || {}
  const hasFullExam = history.some(h => h.type === 'full')

  return (
    <div className="intro-wrap" style={{ maxWidth: '760px' }}>
      {/* Exam countdown + study timer row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        <ExamCountdown lang={lang} />
        <StudyTimerWidget lang={lang} />
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="intro-title">{t(lang, 'Welcome back')}, {(user.name || '').split('.')[0] || 'Student'}!</div>
          <div className="intro-sub">{t(lang, 'What would you like to study today?')}</div>
        </div>

        {/* Real-Time Feedback toggle */}
        <div onClick={() => { setFeedbackOn(!feedbackOn); save('brb_feedback', !feedbackOn) }}
          style={{ background: feedbackOn ? '#FDF0F3' : 'white', border: `2px solid ${feedbackOn ? '#c8185a' : '#ecd5db'}`, borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '220px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: feedbackOn ? '#c8185a' : '#2d1a1f', marginBottom: '2px' }}>
              {feedbackOn ? `✓ ${t(lang, 'Real-Time Feedback')} ON` : `${t(lang, 'Real-Time Feedback')} OFF`}
            </div>
            <div style={{ fontSize: '0.73rem', color: feedbackOn ? '#C0506A' : '#7a5560', lineHeight: 1.4 }}>
              {feedbackOn ? 'See correct/wrong after each answer' : 'Classic mode — review at end'}
            </div>
          </div>
          <div style={{ width: '48px', height: '26px', borderRadius: '13px', background: feedbackOn ? '#c8185a' : '#d0c0c5', position: 'relative', transition: 'background 0.2s', flexShrink: 0, boxShadow: feedbackOn ? '0 2px 8px rgba(139,32,64,0.3)' : 'none' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: feedbackOn ? '24px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          </div>
        </div>

        {/* Adaptive Mode toggle */}
        <div onClick={() => setAdaptiveMode(!adaptiveMode)}
          style={{ background: adaptiveMode ? '#F0F8FF' : 'white', border: `2px solid ${adaptiveMode ? '#4a80c0' : '#ecd5db'}`, borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '200px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: adaptiveMode ? '#1a3a6a' : '#2d1a1f', marginBottom: '2px' }}>
              {adaptiveMode ? `🧠 ${t(lang, 'Adaptive Mode')} ON` : `${t(lang, 'Adaptive Mode')} OFF`}
            </div>
            <div style={{ fontSize: '0.73rem', color: adaptiveMode ? '#4a80c0' : '#7a5560', lineHeight: 1.4 }}>
              {adaptiveMode ? 'Wrong answers get reinforced automatically' : 'Standard mode — no reinforcement'}
            </div>
          </div>
          <div style={{ width: '48px', height: '26px', borderRadius: '13px', background: adaptiveMode ? '#4a80c0' : '#d0c0c5', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: adaptiveMode ? '24px' : '2px', transition: 'left 0.2s' }} />
          </div>
        </div>

        {/* Exam Difficulty */}
        <div style={{ background: 'white', border: '1.5px solid #ecd5db', borderRadius: '14px', padding: '14px 18px', minWidth: '220px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#2d1a1f', marginBottom: '8px' }}>{t(lang, 'Exam Difficulty')}</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['easy', 'standard', 'hard'].map(d => (
              <button key={d} onClick={() => setDifficulty(d)} style={{
                flex: 1, padding: '6px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: '600', textTransform: 'capitalize',
                background: difficulty === d ? '#c8185a' : '#f5f0f2',
                color: difficulty === d ? 'white' : '#7a5560'
              }}>{t(lang, d === 'easy' ? 'Easy' : d === 'hard' ? 'Hard' : 'Standard')}</button>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#7a5560', marginTop: '6px' }}>
            {difficulty === 'easy' ? 'Foundational concepts — great for first study session' : difficulty === 'hard' ? 'Nuanced questions — closest to real exam challenge' : 'Balanced mix — recommended for most students'}
          </div>
        </div>

        {/* AI Tone */}
        <div style={{ background: 'white', border: '1.5px solid #ecd5db', borderRadius: '14px', padding: '14px 18px', minWidth: '220px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#2d1a1f', marginBottom: '8px' }}>{t(lang, 'AI Tone')}</div>
          <div style={{ display: 'flex', gap: '5px' }}>
            {[
              { val: 'standard', label: t(lang, 'Standard') },
              { val: 'encouraging', label: t(lang, 'Encouraging') },
              { val: 'humorous', label: t(lang, 'Humorous') },
              { val: 'exam', label: t(lang, 'Exam Mode') },
            ].map(({ val, label }) => (
              <button key={val} onClick={() => setTone(val)} style={{
                flex: 1, padding: '5px 2px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: '600',
                background: tone === val ? '#c8185a' : '#f5f0f2',
                color: tone === val ? 'white' : '#7a5560',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }} title={label}>{label}</button>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#7a5560', marginTop: '6px' }}>
            {tone === 'standard' ? 'Clear professional explanations' : tone === 'encouraging' ? 'Warm, supportive energy' : tone === 'humorous' ? 'Light jokes and analogies' : 'Ultra-concise, facts only'}
          </div>
        </div>

        {/* Language */}
        <div style={{ background: 'white', border: '1.5px solid #ecd5db', borderRadius: '14px', padding: '14px 18px', minWidth: '200px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#2d1a1f', marginBottom: '8px' }}>{t(lang, 'Language / Idioma')}</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setLanguage('en')} style={{
              flex: 1, padding: '6px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: '600',
              background: language === 'en' ? '#c8185a' : '#f5f0f2',
              color: language === 'en' ? 'white' : '#7a5560'
            }}>🇺🇸 English</button>
            <button onClick={() => setLanguage('es')} style={{
              flex: 1, padding: '6px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: '600',
              background: language === 'es' ? '#c8185a' : '#f5f0f2',
              color: language === 'es' ? 'white' : '#7a5560'
            }}>🇲🇽 Español</button>
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
          <div className="dash-card-title">{t(lang, 'Pre-Test Diagnostic')}</div>
          <div className="dash-card-desc">20 questions · No timer · Identifies your weak areas</div>
          <div className="dash-card-action">{t(lang, 'Start Diagnostic')}</div>
        </div>
        {(() => {
          const fullCount = (load('brb_history') || []).filter(h => h.type === 'full').length
          const remaining = engine.maxFullExams - fullCount
          return (
            <div className="dash-card" onClick={() => remaining > 0 && onStart('full')} style={{ opacity: remaining === 0 ? 0.6 : 1 }}>
              <div className="dash-card-icon">📝</div>
              <div className="dash-card-title">{t(lang, 'Full Practice Exam')}</div>
              <div className="dash-card-desc">100 questions · 90 min · PSI exam format</div>
              {lastFull && <div style={{ fontSize: '0.78rem', color: '#c8185a', marginTop: '4px' }}>Last score: {lastFull.score}%</div>}
              <div style={{ fontSize: '0.73rem', color: remaining > 3 ? '#7a5560' : '#c0392b', marginTop: '4px', fontWeight: '600' }}>
                {remaining === 0 ? '✗ No exams remaining' : `${remaining} of ${engine.maxFullExams} ${t(lang, 'exams remaining')}`}
              </div>
              <div className="dash-card-action">{remaining > 0 ? t(lang, 'Start Exam') : 'Limit reached'}</div>
            </div>
          )
        })()}
      </div>

      {hasFullExam && (
        <div style={{ background: 'linear-gradient(135deg, #c8185a, #C0506A)', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={() => onStart('studyguide')}>
          <div>
            <div style={{ color: 'white', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px' }}>📖 {t(lang, 'Study Guide')}</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>AI-generated guide based on your exam history · Download as PDF</div>
          </div>
          <div style={{ color: 'white', fontSize: '1.4rem' }}>→</div>
        </div>
      )}

      {!hasFullExam && (
        <div style={{ background: '#f5f0f2', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '1.4rem' }}>🔒</div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#7a5560' }}>{t(lang, 'Study Guide locked')}</div>
            <div style={{ fontSize: '0.78rem', color: '#7a5560' }}>{t(lang, 'Complete one full exam to unlock')}</div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ fontWeight: '600', color: '#c8185a', marginBottom: '14px', fontSize: '0.95rem' }}>{t(lang, 'Focused Topic Tests')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: '8px' }}>
          {engine.topics.map(topic => {
            const attempts = topicAttempts[topic] || 0
            const remaining = engine.maxTopicExams - attempts
            const topicHistory = (load('brb_history') || []).filter(h => h.topic === topic)
            const lastScore = topicHistory.length > 0 ? topicHistory[topicHistory.length - 1].score : null
            return (
              <div key={topic} className="topic-card"
                onClick={() => remaining > 0 && onStart('topic', topic)}
                style={{ opacity: remaining === 0 ? 0.55 : 1, cursor: remaining === 0 ? 'default' : 'pointer' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#2d1a1f' }}>{topic}</div>
                <div style={{ fontSize: '0.73rem', color: '#7a5560', marginTop: '3px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t(lang, '20Q · 3 attempts')}</span>
                  <span style={{ color: remaining === 0 ? '#c0392b' : remaining === 1 ? '#e08020' : '#7a5560' }}>
                    {remaining === 0 ? t(lang, 'All used') : `${remaining} ${t(lang, 'left')}${lastScore !== null ? ` · ${lastScore}%` : ''}`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FeedbackOverlay({ question, selectedIndex, onNext, lang }) {
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
        {t(lang, 'Next')}
      </button>
    </div>
  )
}

function QuestionNav({ total, current, answers, confirmed, onJump }) {
  const hasFeedback = confirmed && Object.keys(confirmed).length > 0
  return (
    <div style={{ background: 'white', border: '1.5px solid #ecd5db', borderRadius: '14px', padding: '18px 20px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(139,32,64,0.06)' }}>
      <div style={{ fontSize: '0.8rem', color: '#c8185a', marginBottom: '14px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Question Map</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {Array.from({ length: total }, (_, i) => {
          const isCurrentQ = i === current
          const isConfirmedCorrect = confirmed?.[i] === true
          const isConfirmedWrong = confirmed?.[i] === false
          const isAnswered = answers[i] !== undefined
          let bg = '#ede8ea', color = '#999', border = '2px solid transparent', shadow = 'none'
          if (isCurrentQ) { bg = '#c8185a'; color = 'white'; border = '2px solid #c8185a'; shadow = '0 2px 8px rgba(139,32,64,0.4)' }
          else if (isConfirmedCorrect) { bg = '#2d7a4f'; color = 'white'; border = '2px solid #2d7a4f' }
          else if (isConfirmedWrong) { bg = '#c0392b'; color = 'white'; border = '2px solid #c0392b' }
          else if (isAnswered) { bg = '#F9D8E6'; color = '#c8185a'; border = '2px solid #E8809A' }
          return (
            <button key={i} onClick={() => onJump(i)} title={`Q${i+1}`} style={{
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
        {[['#c8185a','Current'],['#ede8ea','Unanswered'],['#F9D8E6','Answered'],[hasFeedback && '#2d7a4f',hasFeedback && 'Correct'],[hasFeedback && '#c0392b',hasFeedback && 'Wrong']].filter(([c]) => c).map(([c, lbl]) => (
          <span key={lbl} style={{ fontSize: '0.73rem', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: c, border: c === '#F9D8E6' ? '1.5px solid #E8809A' : 'none', display: 'inline-block' }}></span>{lbl}
          </span>
        ))}
      </div>
    </div>
  )
}

function NotePanel({ questionId, topic, lang }) {
  const storageKey = 'brb_notes'
  const allNotes = load(storageKey) || {}
  const existing = allNotes[questionId]

  const [open, setOpen] = useState(false)
  const [text, setText] = useState(existing?.text || '')
  const [saved, setSaved] = useState(!!existing)

  const charMax = 500

  const handleSave = () => {
    if (!text.trim()) return
    const notes = load(storageKey) || {}
    notes[questionId] = { text: text.trim(), topic, savedAt: Date.now() }
    save(storageKey, notes)
    setSaved(true)
    setOpen(false)
  }

  const handleDelete = () => {
    const notes = load(storageKey) || {}
    delete notes[questionId]
    save(storageKey, notes)
    setText('')
    setSaved(false)
    setOpen(false)
  }

  return (
    <div style={{ marginTop: '12px', borderTop: '1px solid #f0e0e5', paddingTop: '10px' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem',
        color: saved ? '#c8185a' : '#7a5560', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0'
      }}>
        {t(lang, 'Add a note')}
        {saved && <span style={{ fontSize: '0.7rem', background: '#FDF0F3', color: '#c8185a', padding: '2px 6px', borderRadius: '8px', fontWeight: '600' }}>Saved</span>}
      </button>
      {open && (
        <div style={{ marginTop: '8px' }}>
          <textarea
            value={text}
            onChange={e => { if (e.target.value.length <= charMax) { setText(e.target.value); setSaved(false) } }}
            placeholder={t(lang, 'Type your note here...')}
            style={{ width: '100%', minHeight: '80px', padding: '10px 12px', border: '1.5px solid #ecd5db', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <div style={{ fontSize: '0.73rem', color: text.length > charMax * 0.9 ? '#c8185a' : '#7a5560' }}>{text.length}/{charMax}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {saved && <button onClick={handleDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#c0392b' }}>Delete</button>}
              <button onClick={handleSave} className="btn-next" style={{ padding: '6px 14px', fontSize: '0.8rem' }} disabled={!text.trim()}>{t(lang, 'Save Note')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ExamScreen({ mode, topic, examQuestions, engine, feedbackOn, adaptiveMode, onSubmit, onHome, lang }) {
  const totalTime = (mode === 'full' || mode === 'resume') ? EXAM_MINUTES * 60 : null
  const saved = mode === 'resume' ? load('brb_session') : null
  const examQs = examQuestions || []
  const [adaptiveQueue, setAdaptiveQueue] = useState([])
  const [wrongInSession, setWrongInSession] = useState([])
  const [current, setCurrent] = useState(saved?.current || 0)
  const [answers, setAnswers] = useState(saved?.answers || {})
  const [confirmed, setConfirmed] = useState(saved?.confirmed || {})
  const [showFeedback, setShowFeedback] = useState(false)
  const [timeLeft, setTimeLeft] = useState(saved?.timeLeft ?? totalTime)
  const [showNav, setShowNav] = useState(false)

  // Study timer tracking
  const startTimeRef = useRef(Date.now())
  useEffect(() => {
    startTimeRef.current = Date.now()
    return () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 60000)
      if (elapsed > 0) addStudyTime(elapsed)
    }
  }, [])

  const handleSubmit = useCallback(() => {
    clear('brb_session')
    // Record remaining session time on submit
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 60000)
    if (elapsed > 0) addStudyTime(elapsed)
    startTimeRef.current = Date.now() // reset so unmount doesn't double-count
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

  const handleConfirm = () => {
    if (answers[current] === undefined) return
    const isCorrect = answers[current] === examQs[current].correct
    setConfirmed(prev => ({ ...prev, [current]: isCorrect }))
    setShowFeedback(true)
    if (!isCorrect && adaptiveMode) setWrongInSession(prev => [...prev, examQs[current]])
  }

  const handleNext = () => {
    setShowFeedback(false)
    const nextIdx = current + 1
    if (nextIdx < examQs.length) {
      setCurrent(nextIdx)
    } else if (adaptiveMode && wrongInSession.length > 0 && adaptiveQueue.length === 0) {
      const reinforcement = engine.getAdaptiveReinforcement(wrongInSession, examQs)
      if (reinforcement.length > 0) { setAdaptiveQueue(reinforcement); setCurrent(examQs.length) }
      else handleSubmit()
    } else {
      handleSubmit()
    }
  }

  const handleJump = (i) => { setShowFeedback(false); setCurrent(i); setShowNav(false) }
  useEffect(() => { setShowFeedback(false) }, [current])

  const mins = timeLeft !== null ? Math.floor(timeLeft / 60).toString().padStart(2, '0') : null
  const secs = timeLeft !== null ? (timeLeft % 60).toString().padStart(2, '0') : null
  const isWarning = timeLeft !== null && timeLeft < 300
  const inAdaptivePhase = adaptiveMode && current >= examQs.length && adaptiveQueue.length > 0
  const adaptiveIdx = current - examQs.length
  const q = inAdaptivePhase ? adaptiveQueue[adaptiveIdx] : examQs[current]
  const answered = Object.keys(answers).length
  const letters = ['A', 'B', 'C', 'D']
  const modeLabel = mode === 'pretest' ? t(lang, 'Pre-Test Diagnostic') : mode === 'topic' ? topic : t(lang, 'Full Practice Exam')
  const isConfirmed = confirmed[current] !== undefined
  const selectedAnswer = answers[current]

  if (!q) return null

  const getOptionStyle = (i) => {
    const base = 'option-btn'
    if (!feedbackOn || !isConfirmed) return `${base} ${selectedAnswer === i ? 'selected' : ''}`
    if (i === q.correct) return `${base} correct-answer`
    if (i === selectedAnswer && i !== q.correct) return `${base} wrong-answer`
    return base
  }

  // Determine question text and options based on language
  const questionText = lang === 'es' && q.question_es ? q.question_es : q.question
  const optionsArr = lang === 'es' && q.options_es ? q.options_es : q.options
  const topicLabel = lang === 'es' && q.topic_es ? q.topic_es : q.topic

  return (
    <div className="exam-wrap">
      <div className="exam-topbar">
        <div>
          <div style={{ fontSize: '0.73rem', color: '#7a5560', marginBottom: '2px' }}>{modeLabel}</div>
          {timeLeft !== null
            ? <div className={`timer ${isWarning ? 'warning' : ''}`}>{mins}:{secs}</div>
            : <div style={{ fontSize: '0.88rem', color: '#c8185a', fontWeight: '600' }}>No time limit</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="progress-text">
            {inAdaptivePhase ? `Reinforcement ${adaptiveIdx + 1}/${adaptiveQueue.length}` : `${current + 1} / ${examQs.length}`}
            {inAdaptivePhase && <span style={{ fontSize: '0.65rem', marginLeft: '6px', color: '#4a80c0' }}>🧠 Adaptive</span>}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7a5560' }}>{answered} answered</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {feedbackOn && <span style={{ fontSize: '0.7rem', background: '#F9D8E6', color: '#c8185a', padding: '3px 8px', borderRadius: '10px', fontWeight: '600' }}>Feedback ON</span>}
          <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem' }} onClick={() => setShowNav(v => !v)}>Map</button>
          <button className="btn-next" onClick={handleSubmit} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>{t(lang, 'Submit')}</button>
        </div>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: inAdaptivePhase ? '100%' : `${((current + 1) / examQs.length) * 100}%`, background: inAdaptivePhase ? '#4a80c0' : undefined }} />
      </div>

      {showNav && <QuestionNav total={examQs.length} current={current} answers={answers} confirmed={feedbackOn ? confirmed : null} onJump={handleJump} />}

      <div className="question-card">
        <div className="question-topic">{topicLabel}</div>
        <div className="question-text">{questionText}</div>
        <div className="options-grid">
          {optionsArr.map((opt, i) => (
            <button key={i} className={getOptionStyle(i)} disabled={isConfirmed && feedbackOn}
              onClick={() => {
                if (!isConfirmed || !feedbackOn) {
                  if (inAdaptivePhase) setAnswers(prev => ({ ...prev, [`a_${adaptiveIdx}`]: i }))
                  else setAnswers(prev => ({ ...prev, [current]: i }))
                }
              }}>
              <span className="option-letter">{letters[i]}</span>{opt}
            </button>
          ))}
        </div>

        {feedbackOn && !isConfirmed && selectedAnswer !== undefined && (
          <button className="btn-primary" style={{ marginTop: '16px', borderRadius: '10px' }} onClick={handleConfirm}>
            {t(lang, 'Confirm Answer')}
          </button>
        )}

        {feedbackOn && isConfirmed && showFeedback && (
          <FeedbackOverlay question={{ ...q, question: questionText, options: optionsArr }} selectedIndex={selectedAnswer} onNext={handleNext} lang={lang} />
        )}

        {/* Notes panel - use original question id for stable storage */}
        <NotePanel questionId={q._originalId || q.id} topic={q.topic} lang={lang} />
      </div>

      {!feedbackOn && (
        <div className="nav-row">
          <button className="btn-secondary" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>{t(lang, 'Previous')}</button>
          <button className="btn-secondary" onClick={() => { if (mode === 'full' || mode === 'resume') save('brb_session', { answers, current, timeLeft, confirmed, questions: examQs }); onHome() }} style={{ fontSize: '0.8rem', padding: '10px 14px' }}>
            {(mode === 'full' || mode === 'resume') ? t(lang, 'Save & Exit') : t(lang, 'Exit')}
          </button>
          {current < examQs.length - 1
            ? <button className="btn-next" onClick={() => setCurrent(c => c + 1)}>{t(lang, 'Next')}</button>
            : <button className="btn-next" onClick={handleSubmit}>{t(lang, 'Submit')}</button>}
        </div>
      )}

      {feedbackOn && !showFeedback && (
        <div className="nav-row">
          <button className="btn-secondary" onClick={() => { setShowFeedback(false); setCurrent(c => c - 1) }} disabled={current === 0}>{t(lang, 'Previous')}</button>
          <button className="btn-secondary" onClick={() => { if (mode === 'full' || mode === 'resume') save('brb_session', { answers, current, timeLeft, confirmed, questions: examQs }); onHome() }} style={{ fontSize: '0.8rem', padding: '10px 14px' }}>
            {(mode === 'full' || mode === 'resume') ? t(lang, 'Save & Exit') : t(lang, 'Exit')}
          </button>
          {!isConfirmed && current < examQs.length - 1
            ? <button className="btn-next" onClick={() => setCurrent(c => c + 1)} disabled={selectedAnswer === undefined}>{t(lang, 'Next')}</button>
            : !isConfirmed
            ? <button className="btn-next" onClick={handleSubmit}>{t(lang, 'Submit')}</button>
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

function StudyGuidePage({ onHome, tone, language, lang }) {
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
    const notes = load('brb_notes') || {}

    try {
      const res = await fetch('/api/studyguide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicStats, overallPct, examCount, totalAnswered, tone, language, notes })
      })
      const data = await res.json()
      if (data.guide) { save('brb_study_guide', data.guide); setGuide(data.guide) }
      else setError('Could not generate guide. Please try again.')
    } catch { setError('Connection error. Please try again.') }
    setGenerating(false)
  }

  const downloadPDF = () => {
    if (!guide) return
    const hist = load('brb_history') || []
    const totalAnswered = hist.reduce((s, h) => s + (h.total || 0), 0)
    const totalCorrect = hist.reduce((s, h) => s + (h.correct || 0), 0)
    const overallPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
    const examCount = hist.filter(h => h.type === 'full').length
    const masteryColor = (m) => m === 'Strong' ? '#2d7a4f' : m === 'Developing' ? '#b07000' : '#c0392b'

    // Build "My Notes" section for PDF
    const allNotes = load('brb_notes') || {}
    const notesByTopic = {}
    Object.entries(allNotes).forEach(([qId, n]) => {
      const tp = n.topic || 'General'
      if (!notesByTopic[tp]) notesByTopic[tp] = []
      notesByTopic[tp].push(n)
    })
    const notesHtml = Object.keys(notesByTopic).length > 0 ? `
      <div class="section">
        <h2>📝 My Notes</h2>
        ${Object.entries(notesByTopic).map(([tp, notes]) => `
          <h3>${tp}</h3>
          ${notes.map(n => `<div class="concept"><p>${n.text}</p><div style="font-size:0.75rem;color:#7a5560">${new Date(n.savedAt).toLocaleDateString()}</div></div>`).join('')}
        `).join('')}
      </div>` : ''

    const sectionsHtml = (guide.sections || []).map(s => `
      <div class="section">
        <div class="section-header">
          <h2>${s.topic}</h2>
          ${s.mastery ? `<span class="badge" style="background:${masteryColor(s.mastery)}20;color:${masteryColor(s.mastery)};border:1px solid ${masteryColor(s.mastery)}">${s.mastery} · ${s.score || ''}%</span>` : ''}
        </div>
        ${s.plainEnglishOverview ? `<p class="overview">${s.plainEnglishOverview}</p>` : ''}
        ${s.whyItMatters ? `<p class="why"><strong>Why it matters on the exam:</strong> ${s.whyItMatters}</p>` : ''}
        ${s.keyConcepts?.length ? `<h3>Key Concepts</h3>${s.keyConcepts.map(c => `<div class="concept"><div class="concept-name">${c.concept}</div><p>${c.explanation}</p>${c.analogy ? `<div class="analogy">💡 Think of it this way: ${c.analogy}</div>` : ''}${c.memoryTrick ? `<div class="memory">🧠 Memory trick: ${c.memoryTrick}</div>` : ''}${c.examAlert ? `<div class="alert">⚠️ On the exam: ${c.examAlert}</div>` : ''}</div>`).join('')}` : ''}
        ${s.examWarnings?.length ? `<div class="warnings"><strong>⚠️ Watch Out On The Exam:</strong><ul>${s.examWarnings.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
        ${s.reference ? `<div class="reference">📚 Reference: ${s.reference}</div>` : ''}
        ${s.selfCheck?.length ? `<div class="selfcheck"><strong>✏️ Quick Self-Check:</strong>${s.selfCheck.map((q, i) => `<div class="check-q"><strong>Q${i+1}:</strong> ${q.question}</div><div class="check-a"><strong>A:</strong> ${q.answer}</div>`).join('')}</div>` : ''}
      </div>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Board Ready Beauty — Study Guide</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Georgia, serif; max-width: 820px; margin: 0 auto; padding: 32px 24px; color: #2d1a1f; line-height: 1.75; font-size: 15px; }
      .cover { text-align: center; padding: 48px 0 32px; border-bottom: 2px solid #ecd5db; margin-bottom: 32px; }
      .cover h1 { color: #c8185a; font-size: 2.2rem; margin: 0 0 6px; }
      .cover .sub { color: #7a5560; font-size: 1rem; margin-bottom: 4px; }
      .score-pill { background: #FDF6F8; border: 1px solid #ecd5db; border-radius: 20px; padding: 8px 20px; font-size: 0.9rem; color: #c8185a; font-weight: bold; display: inline-block; margin: 4px; }
      .intro-box { background: #FDF6F8; border-left: 4px solid #c8185a; padding: 16px 20px; border-radius: 0 10px 10px 0; margin-bottom: 24px; font-style: italic; color: #5a2030; }
      .section { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid #ecd5db; }
      .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
      h2 { color: #c8185a; font-size: 1.35rem; margin: 0; }
      h3 { color: #C0506A; font-size: 1rem; margin: 20px 0 10px; }
      .badge { font-size: 0.78rem; padding: 3px 12px; border-radius: 20px; font-weight: 600; }
      .concept { background: #fdf6f8; border: 1px solid #ecd5db; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; }
      .concept-name { font-weight: 700; color: #c8185a; margin-bottom: 6px; }
      .analogy { background: #fffbea; border-left: 3px solid #f0c040; padding: 8px 12px; margin: 8px 0; font-size: 0.9rem; color: #5a4800; }
      .memory { background: #eef4ff; border-left: 3px solid #4a80c0; padding: 8px 12px; margin: 8px 0; font-size: 0.9rem; color: #1a3a6a; }
      .alert { background: #fff8e6; border-left: 3px solid #e08020; padding: 8px 12px; margin: 8px 0; font-size: 0.9rem; color: #6a3a00; }
      .warnings { background: #fff0f0; border: 1px solid #f0c0c0; border-radius: 10px; padding: 12px 16px; margin: 12px 0; }
      .reference { font-size: 0.82rem; color: #7a5560; font-style: italic; margin-top: 12px; }
      .selfcheck { background: #f0f8f4; border: 1px solid #b0d8c0; border-radius: 10px; padding: 14px 16px; margin-top: 14px; }
      .check-q { font-size: 0.9rem; color: #1a4a30; margin: 8px 0 4px; }
      .check-a { font-size: 0.9rem; color: #2d7a4f; padding-left: 12px; margin-bottom: 4px; }
      @media print { body { padding: 16px; } }
    </style></head><body>
    <div class="cover">
      <h1>Board Ready Beauty</h1>
      <div class="sub">Comprehensive Study Guide — Texas Cosmetology Written Exam (PSI/TDLR)</div>
      <div style="margin:12px 0">
        <span class="score-pill">Overall: ${overallPct}%</span>
        <span class="score-pill">${examCount} Full Exam${examCount !== 1 ? 's' : ''} Completed</span>
        <span class="score-pill">${totalAnswered} Questions Answered</span>
      </div>
    </div>
    ${guide.intro ? `<div class="intro-box">${guide.intro}</div>` : ''}
    ${sectionsHtml}
    ${notesHtml}
    ${guide.studySchedule ? `<div style="background:#f8f4ff;border:1px solid #c8b8e8;border-radius:10px;padding:16px 20px;margin:24px 0"><h3 style="color:#6030a0;margin-top:0">📅 Study Schedule</h3><p>${guide.studySchedule}</p></div>` : ''}
    ${guide.examDayTips?.length ? `<div style="background:#FDF6F8;border:1px solid #ecd5db;border-radius:10px;padding:16px 20px;margin:24px 0"><h3 style="color:#c8185a;margin-top:0">🎯 Exam Day Tips</h3><ul>${guide.examDayTips.map(tip => `<li>${tip}</li>`).join('')}</ul></div>` : ''}
    ${guide.finalNotes ? `<div style="text-align:center;padding:32px 20px;color:#7a5560;font-style:italic;border-top:2px solid #ecd5db;margin-top:32px">${guide.finalNotes}</div>` : ''}
    </body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.addEventListener('load', () => { setTimeout(() => { win.print(); URL.revokeObjectURL(url) }, 500) })
    } else {
      const a = document.createElement('a'); a.href = url; a.download = 'BRB-Study-Guide.html'; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  if (generating) return <GeneratingGuide />
  if (!hasFullExam) {
    return (
      <div className="intro-wrap">
        <div className="intro-card">
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔒</div>
          <div className="intro-title">{t(lang, 'Study Guide locked')}</div>
          <div className="intro-sub">{t(lang, 'Complete one full exam to unlock')}</div>
          <button className="btn-primary" onClick={onHome} style={{ marginTop: '24px' }}>Take Full Exam</button>
        </div>
      </div>
    )
  }

  return (
    <div className="results-wrap">
      <div className="sg-header">
        <div className="intro-title" style={{ margin: 0 }}>📖 {t(lang, 'Study Guide')}</div>
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
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#c8185a', marginBottom: '8px' }}>Ready to generate your guide</div>
          <div style={{ color: '#7a5560', marginBottom: '24px', lineHeight: '1.7' }}>Claude AI will analyze your exam history and create a comprehensive, personalized study guide.</div>
          <button className="btn-primary" onClick={generateGuide} style={{ maxWidth: '280px' }}>✨ Generate My Study Guide</button>
        </div>
      )}
      {guide && (
        <div>
          {guide.intro && <div className="sg-intro-box">{guide.intro}</div>}
          {guide.howToUseThisGuide && <div className="sg-how-to"><strong>📖 How to use this guide:</strong> {guide.howToUseThisGuide}</div>}
          {guide.sections?.map((s, i) => {
            const masteryColor = s.mastery === 'Strong' ? '#2d7a4f' : s.mastery === 'Developing' ? '#b07000' : '#c0392b'
            const masteryBg = s.mastery === 'Strong' ? '#e8f5ee' : s.mastery === 'Developing' ? '#fff8e0' : '#ffeaea'
            return (
              <div key={i} className="sg-section">
                <div className="sg-section-header">
                  <div className="study-topic-name" style={{ fontSize: '1.15rem' }}>{s.topic}</div>
                  {s.mastery && <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '4px 14px', borderRadius: '20px', background: masteryBg, color: masteryColor, border: `1px solid ${masteryColor}40` }}>{s.mastery} {s.score ? `· ${s.score}%` : ''}</span>}
                </div>
                {s.plainEnglishOverview && <p style={{ color: '#3a2025', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '10px' }}>{s.plainEnglishOverview}</p>}
                {s.whyItMatters && <p style={{ color: '#5a4040', fontSize: '0.88rem', lineHeight: '1.65', marginBottom: '16px', fontStyle: 'italic' }}><strong>Why this matters:</strong> {s.whyItMatters}</p>}
                {s.keyConcepts?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#c8185a', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Concepts</div>
                    {s.keyConcepts.map((c, j) => (
                      <div key={j} className="sg-concept">
                        <div style={{ fontWeight: '700', color: '#c8185a', marginBottom: '6px', fontSize: '0.95rem' }}>{c.concept}</div>
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
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>{s.examWarnings.map((w, j) => <li key={j} style={{ fontSize: '0.88rem', color: '#8b0000', marginBottom: '4px', lineHeight: '1.6' }}>{w}</li>)}</ul>
                  </div>
                )}
                {s.reference && <div style={{ fontSize: '0.78rem', color: '#7a5560', fontStyle: 'italic', marginBottom: '12px' }}>📚 Reference: {s.reference}</div>}
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
          {guide.studySchedule && <div className="sg-schedule"><div style={{ fontWeight: '700', color: '#6030a0', marginBottom: '8px' }}>📅 Your Study Schedule</div><p style={{ color: '#3a1860', fontSize: '0.9rem', lineHeight: '1.75', margin: 0 }}>{guide.studySchedule}</p></div>}
          {guide.examDayTips?.length > 0 && <div className="sg-examday"><div style={{ fontWeight: '700', color: '#c8185a', marginBottom: '10px' }}>🎯 Exam Day Tips</div><ul style={{ margin: 0, paddingLeft: '18px' }}>{guide.examDayTips.map((tip, i) => <li key={i} style={{ fontSize: '0.9rem', color: '#5a2030', marginBottom: '6px', lineHeight: '1.65' }}>{tip}</li>)}</ul></div>}
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

function StatsPage({ lang, engine }) {
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
      <div className="intro-title" style={{ marginBottom: '20px' }}>{t(lang, 'My Stats')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[{ num: totalQs, label: 'Questions Answered' }, { num: `${overallPct}%`, label: 'Overall Accuracy' }, { num: fullExams.length, label: 'Full Exams Taken' }, { num: passed, label: 'Times Passed' }].map((s, i) => (
          <div key={i} className="stat-box"><div className="stat-num">{s.num}</div><div className="stat-label">{s.label}</div></div>
        ))}
      </div>
      {recentFull.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }}>
          <div style={{ fontWeight: '600', color: '#c8185a', marginBottom: '16px' }}>Full Exam Score Trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
            {recentFull.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: h.passed ? '#2d7a4f' : '#c8185a', fontWeight: '600' }}>{h.score}%</div>
                <div style={{ width: '100%', background: h.passed ? '#2d7a4f' : '#C0506A', borderRadius: '4px 4px 0 0', height: `${h.score * 0.7}px`, minHeight: '4px' }} />
                <div style={{ fontSize: '0.65rem', color: '#7a5560' }}>#{i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }}>
        <div style={{ fontWeight: '600', color: '#c8185a', marginBottom: '16px' }}>Topic Performance</div>
        {engine.topics.map(topic => {
          const data = topicStats[topic]
          const pct = data && data.total > 0 ? Math.round((data.correct / data.total) * 100) : null
          const color = pct === null ? '#d0c0c5' : pct >= 80 ? '#2d7a4f' : pct >= 60 ? '#e08020' : '#C0506A'
          return (
            <div key={topic} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                <span style={{ color: '#2d1a1f', fontWeight: '500' }}>{topic}</span>
                <span style={{ color, fontWeight: '600' }}>{pct !== null ? `${pct}%` : t(lang, 'Not taken')}</span>
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
          <div style={{ fontWeight: '600', color: '#c8185a', marginBottom: '14px' }}>Recent History</div>
          {[...history].reverse().slice(0, 10).map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 9 ? '1px solid #f0e0e5' : 'none', fontSize: '0.85rem' }}>
              <span style={{ color: '#7a5560' }}>{h.type === 'full' ? '📝 Full Exam' : h.type === 'pretest' ? '🎯 Pre-Test' : `📚 ${h.topic}`}</span>
              <span style={{ fontWeight: '600', color: h.passed ? '#2d7a4f' : '#c8185a' }}>{h.score}% {h.passed ? '✓' : ''}</span>
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

function MyNotesPage({ lang }) {
  const [allNotes, setAllNotes] = useState(() => load('brb_notes') || {})
  const [search, setSearch] = useState('')

  const notesWithMeta = Object.entries(allNotes).map(([qId, n]) => ({
    qId,
    text: n.text,
    topic: n.topic || 'General',
    savedAt: n.savedAt,
  }))

  const filtered = search.trim()
    ? notesWithMeta.filter(n =>
        n.text.toLowerCase().includes(search.toLowerCase()) ||
        n.topic.toLowerCase().includes(search.toLowerCase())
      )
    : notesWithMeta

  const byTopic = {}
  filtered.forEach(n => {
    if (!byTopic[n.topic]) byTopic[n.topic] = []
    byTopic[n.topic].push(n)
  })

  const handleDelete = (qId) => {
    const updated = { ...allNotes }
    delete updated[qId]
    save('brb_notes', updated)
    setAllNotes(updated)
  }

  const total = notesWithMeta.length

  return (
    <div className="intro-wrap" style={{ maxWidth: '760px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="intro-title" style={{ marginBottom: '4px' }}>{t(lang, 'My Notes title')}</div>
          <div style={{ fontSize: '0.85rem', color: '#7a5560' }}>
            {total} {total === 1 ? t(lang, 'note') : t(lang, 'notes')}
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📝</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#c8185a', marginBottom: '8px' }}>{t(lang, 'No notes yet')}</div>
          <div style={{ color: '#7a5560', fontSize: '0.9rem', lineHeight: '1.7' }}>{t(lang, 'No notes message')}</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t(lang, 'Search notes')}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #ecd5db', borderRadius: '10px', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
          {Object.keys(byTopic).length === 0 && (
            <div style={{ textAlign: 'center', color: '#7a5560', padding: '32px' }}>No notes match your search.</div>
          )}
          {Object.entries(byTopic).sort(([a],[b]) => a.localeCompare(b)).map(([topic, notes]) => (
            <div key={topic} style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#c8185a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #ecd5db' }}>
                {topic}
              </div>
              {notes.sort((a,b) => b.savedAt - a.savedAt).map(note => (
                <div key={note.qId} style={{ background: 'white', border: '1px solid #ecd5db', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', color: '#2d1a1f', lineHeight: '1.65', marginBottom: '6px' }}>{note.text}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.7rem', background: '#F9D8E6', color: '#c8185a', padding: '2px 8px', borderRadius: '8px', fontWeight: '600' }}>{note.topic}</span>
                      <span style={{ fontSize: '0.72rem', color: '#7a5560' }}>{new Date(note.savedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(note.qId)} style={{ background: 'none', border: '1px solid #ecd5db', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', color: '#c0392b', flexShrink: 0 }}>
                    {t(lang, 'Delete')}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function Results({ results, mode, topic, onRetake, onHome, onStudyGuide, lang }) {
  return (
    <div className="results-wrap">
      <div className="score-card">
        <div className={`score-badge ${results.passed ? 'pass' : ''}`}>
          <div className="score-pct">{results.score}%</div>
          <div className="score-label">{results.passed ? 'PASSED' : 'KEEP GOING'}</div>
        </div>
        <div className="result-title">{results.passed ? t(lang, 'You passed!') : "You're getting there!"}</div>
        <div className="result-sub">
          {mode === 'pretest' ? `${t(lang, 'Pre-Test Diagnostic')} · ` : mode === 'topic' ? `${topic} · ` : `${t(lang, 'Full Practice Exam')} · `}
          {results.correct} of {results.total} correct {!results.passed && '· Need 70% to pass — PSI standard'}
        </div>
        {results.weakTopics?.length > 0 && (
          <>
            <div style={{ fontSize: '0.85rem', color: '#7a5560', marginBottom: '10px', fontWeight: '500', marginTop: '16px' }}>Focus areas:</div>
            <div className="topics-grid">{results.weakTopics.map(top => <span key={top} className="topic-pill">{top}</span>)}</div>
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
            {results.studyGuide.topics?.map((top, i) => (
              <div key={i} className="study-topic">
                <div className="study-topic-name">{top.name}</div>
                <ul className="study-points">{top.keyPoints?.map((pt, j) => <li key={j}>{pt}</li>)}</ul>
                {top.examTip && <div className="exam-tip">Exam tip: {top.examTip}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', paddingBottom: '40px', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={onHome}>{t(lang, 'Dashboard')}</button>
        {mode === 'full' && <button className="btn-secondary" onClick={onStudyGuide} style={{ background: '#FDF6F8' }}>📖 {t(lang, 'Study Guide')}</button>}
        <button className="btn-primary" onClick={onRetake} style={{ maxWidth: '200px' }}>{t(lang, 'Retake')}</button>
      </div>
    </div>
  )
}

const ADMIN_LICENSE_TYPES = ['cosmetology', 'barber', 'esthetician', 'nails']

function LicenseSelector({ onSelect }) {
  const engines = getAdminExamEngines()
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '420px', width: '100%' }}>
        <h2 style={{ marginBottom: '8px' }}>Select an Exam</h2>
        <p style={{ color: '#7a5560', marginBottom: '24px' }}>Admin access — choose a license to preview</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ADMIN_LICENSE_TYPES.map((licenseType, i) => (
            <button
              key={licenseType}
              onClick={() => onSelect(licenseType)}
              style={{ background: engines[i].theme.primary, color: '#fff', border: 'none', borderRadius: '10px', padding: '14px 20px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
            >
              {getLicenseLabel(licenseType)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const isAdminUser = (u) => !!u?.email && ADMIN_EMAILS.includes(u.email.toLowerCase())

export default function App() {
  const [user, setUser] = useState(() => load('brb_user') || null)
  const [screen, setScreen] = useState(() => {
    const u = load('brb_user')
    if (!u) return 'login'
    return isAdminUser(u) ? 'license-select' : 'dashboard'
  })
  const [licenseEngine, setLicenseEngine] = useState(null)
  const [examMode, setExamMode] = useState(null)
  const [examTopic, setExamTopic] = useState(null)
  const [results, setResults] = useState(null)
  const [examQuestions, setExamQuestions] = useState(null)
  const [feedbackOn, setFeedbackOn] = useState(() => load('brb_feedback') ?? false)
  const [difficulty, setDifficulty] = useState(() => load('brb_difficulty') || 'standard')
  const [adaptiveMode, setAdaptiveMode] = useState(() => load('brb_adaptive') ?? false)
  const [tone, setTone] = useState(() => load('brb_tone') || 'standard')
  const [language, setLanguage] = useState(() => load('brb_language') || 'en')
  const [showTerms, setShowTerms] = useState(false)
  const [pendingUser, setPendingUser] = useState(null)

  const lang = language
  const engine = licenseEngine ?? getExamEngine('cosmetology')
  console.log('engine resolved:', engine?.theme?.primary, 'licenseEngine null?', licenseEngine === null)
  const engineRef = useRef(engine)
  useEffect(() => { engineRef.current = engine }, [engine])

  const handleLogin = (u) => {
    const accepted = localStorage.getItem('brb_agreed_to_terms') === 'true'
    if (!accepted) { setPendingUser(u); setShowTerms(true) }
    else { save('brb_user', u); setUser(u); setScreen(isAdminUser(u) ? 'license-select' : 'dashboard') }
  }
  const handleTermsAccept = () => {
    localStorage.setItem('brb_agreed_to_terms', 'true')
    save('brb_user', pendingUser); setUser(pendingUser); setPendingUser(null); setShowTerms(false)
    setScreen(isAdminUser(pendingUser) ? 'license-select' : 'dashboard')
  }
  const handleTermsDecline = () => { setPendingUser(null); setShowTerms(false) }
  const handleLogout = () => { clear('brb_user'); setUser(null); setScreen('login'); setResults(null); setLicenseEngine(null); resetTheme() }
  const handleSelectLicense = (licenseType) => {
    console.log('handleSelectLicense called with:', licenseType)
    const engine = getExamEngine(licenseType)
    // Drop any in-progress session from a previously selected license so
    // "Resume" can't hand the admin a stale cross-license question set.
    clear('brb_session')
    setLicenseEngine(engine)
    setExamQuestions(null)
    applyTheme(engine.theme)
    setScreen('dashboard')
  }

  useEffect(() => {
    if (!user || isAdminUser(user)) return
    const engine = getExamEngine(user.passboard_license_type || 'cosmetology')
    setLicenseEngine(engine)
    applyTheme(engine.theme)
  }, [user])
  const handleNav = (s) => { setScreen(s); setResults(null) }

  const handleStart = (mode, topic = null) => {
    if (mode === 'studyguide') { setScreen('studyguide'); return }
    const eng = engineRef.current
    setExamMode(mode); setExamTopic(topic); setResults(null)
    if (mode === 'resume') {
      const saved = load('brb_session')
      setExamQuestions(saved?.questions || eng.build())
    } else if (mode === 'pretest') {
      setExamQuestions(eng.buildPreTest())
    } else if (mode === 'topic') {
      const attempts = load('brb_topic_attempts') || {}
      const attemptIndex = attempts[topic] || 0
      if (attemptIndex >= eng.maxTopicExams) { alert(`You've completed all ${eng.maxTopicExams} focused exams for this topic.`); return }
      setExamQuestions(eng.buildTopicTest(topic, attemptIndex))
    } else {
      const hist = load('brb_history') || []
      const fullCount = hist.filter(h => h.type === 'full').length
      if (fullCount >= eng.maxFullExams) { alert(`You've used all ${eng.maxFullExams} of your included full practice exams. Contact support@boardreadybeauty.com if you need additional access.`); return }
      setExamQuestions(eng.build(difficulty))
    }
    setScreen('exam')
  }

  const handleSubmit = async (answers, qs, mode, topic) => {
    setScreen('grading')
    try {
      const res = await fetch('/api/grade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, questions: qs, tone, language })
      })
      const data = await res.json()
      const hist = load('brb_history') || []
      hist.push({ score: data.score, passed: data.passed, correct: data.correct, total: data.total, type: mode, topic, date: new Date().toISOString(), topicBreakdown: data.topicBreakdown || {} })
      save('brb_history', hist)
      if (mode === 'topic' && topic) {
        const attempts = load('brb_topic_attempts') || {}
        attempts[topic] = (attempts[topic] || 0) + 1
        save('brb_topic_attempts', attempts)
      }
      if (mode === 'full') clear('brb_study_guide')
      setResults(data); setScreen('results')
    } catch { alert('Grading failed. Please try again.'); setScreen('dashboard') }
  }

  return (
    <>
      <Header user={user} onLogout={handleLogout} screen={screen} onNav={handleNav} lang={lang} />
      {screen === 'login' && <Login onLogin={handleLogin} />}
      {screen === 'license-select' && <LicenseSelector onSelect={handleSelectLicense} />}
      {screen === 'dashboard' && (
        <Dashboard
          user={user} onStart={handleStart} engine={engine}
          feedbackOn={feedbackOn} setFeedbackOn={setFeedbackOn}
          difficulty={difficulty} setDifficulty={(d) => { setDifficulty(d); save('brb_difficulty', d) }}
          adaptiveMode={adaptiveMode} setAdaptiveMode={(v) => { setAdaptiveMode(v); save('brb_adaptive', v) }}
          tone={tone} setTone={(v) => { setTone(v); save('brb_tone', v) }}
          language={language} setLanguage={(v) => { setLanguage(v); save('brb_language', v) }}
          lang={lang}
        />
      )}
      {screen === 'stats' && <StatsPage lang={lang} engine={engine} />}
      {screen === 'studyguide' && <StudyGuidePage onHome={() => setScreen('dashboard')} tone={tone} language={language} lang={lang} />}
      {screen === 'notes' && <MyNotesPage lang={lang} />}
      {screen === 'exam' && (
        <ExamScreen
          mode={examMode} topic={examTopic} examQuestions={examQuestions} engine={engine}
          feedbackOn={feedbackOn} adaptiveMode={adaptiveMode}
          onSubmit={handleSubmit} onHome={() => setScreen('dashboard')}
          lang={lang}
        />
      )}
      {screen === 'grading' && <Grading />}
      {screen === 'results' && (
        <Results results={results} mode={examMode} topic={examTopic}
          onRetake={() => handleStart(examMode, examTopic)}
          onHome={() => setScreen('dashboard')}
          onStudyGuide={() => setScreen('studyguide')}
          lang={lang}
        />
      )}
      {showTerms && <TermsModal onAccept={handleTermsAccept} onDecline={handleTermsDecline} />}
    </>
  )
}
