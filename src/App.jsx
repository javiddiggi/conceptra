import { useEffect, useState } from 'react'
import SiteFooter from './components/SiteFooter.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'
import {
  biologyChapters,
  getChapterPath,
  getClassChapters,
} from './data/biologyData.js'
import { getPublicChapterChanges } from './lib/adminContent.js'
import { filterQuestionsByMode } from './lib/questionFiltering.js'
import { isSupabaseConfigured } from './lib/supabase.js'
import './App.css'

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HomeChapterSearch({ chapters }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const results = normalizedQuery
    ? chapters
      .filter((chapter) =>
        chapter.title.toLowerCase().includes(normalizedQuery)
        || `class ${chapter.class}`.includes(normalizedQuery),
      )
      .slice(0, 6)
    : []

  return (
    <div className="home-search-wrap">
      <form className="home-search" action="/search" method="get">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.7" />
          <path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Biology chapters, topics or concepts..."
          aria-label="Search Biology chapters, topics or concepts"
          aria-expanded={results.length > 0}
          aria-controls="home-search-results"
          autoComplete="off"
        />
        <button type="submit">Search</button>
      </form>
      {results.length > 0 && (
        <div className="home-search-results" id="home-search-results">
          {results.map((chapter) => (
            <a className="home-search-result" href={getChapterPath(chapter)} key={`${chapter.class}-${chapter.id}`}>
              <span className="home-result-number">{String(chapter.chapterNumber).padStart(2, '0')}</span>
              <span className="home-result-copy">
                <small>Class {chapter.class} · Biology</small>
                <strong>{chapter.title}</strong>
              </span>
              <ArrowIcon />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <span className="crumb-divider">/</span>}
          {item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}

function HomePage({ chapters }) {
  const whatYouGet = [
    { icon: '🎬', title: 'Animated Concept Videos', description: 'Understand difficult concepts visually.' },
    { icon: '📖', title: 'Handwritten Notes', description: 'Revise concepts with clean chapter-wise notes.' },
    { icon: '📝', title: 'NEET PYQs', description: 'Practice previous-year NEET questions.' },
    { icon: '⚡', title: 'Exam-Focused Learning', description: 'Focus on concepts, important points and quick revision.' },
  ]

  return (
    <main className="home-page-shell">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> BIOLOGY • VISUAL LEARNING • NEET PREPARATION</div>
          <h1>Visualize Biology.<br /><span>Understand Every Concept.</span></h1>
          <p className="hero-subtitle">Learn Class 11 &amp; Class 12 Biology through animated concept explanations, handwritten notes and NEET-focused PYQs.</p>
          <HomeChapterSearch chapters={chapters} />
          <div className="hero-actions">
            <a className="button button-primary" href="#choose-class">Start Learning <ArrowIcon /></a>
            <a className="button button-secondary" href="#choose-class">Explore NEET PYQs</a>
          </div>
          <div className="hero-proof"><span className="proof-mark">✓</span> Visual learning for NEET-ready biology mastery</div>
        </div>
      </section>

      <section className="class-picker section-wrap" id="choose-class">
        <div className="section-heading">
          <div>
            <div className="eyebrow">YOUR LEARNING PATH</div>
            <h2>Choose Your Class</h2>
          </div>
          <p>Choose your class and learn Biology chapter by chapter with visual explanations, notes and NEET PYQs.</p>
        </div>
        <div className="class-card-grid">
          {[11, 12].map((classNumber) => (
            <a className={`class-card class-card-${classNumber}`} href={`/class-${classNumber}`} key={classNumber}>
              <div className="class-card-top">
                <span className="class-icon" aria-hidden="true">
                  <svg viewBox="0 0 40 40" fill="none">
                    <path d="M20 6v28M10 11c5 0 8 3 10 9-2 6-5 9-10 9M30 11c-5 0-8 3-10 9 2 6 5 9 10 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13 15h-3m17 0h3M13 25h-3m17 0h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="class-card-class">CLASS {classNumber}</span>
              </div>
              <h3>Biology</h3>
              <p>Animated concepts • Notes • NEET PYQs</p>
              <div className="class-card-bottom"><span>Explore Class {classNumber}</span><ArrowIcon /></div>
            </a>
          ))}
        </div>
      </section>

      <section className="offers-section section-wrap">
        <div className="section-heading head-center">
          <div>
            <div className="eyebrow">WHAT YOU GET</div>
            <h2>Everything You Need for Biology</h2>
          </div>
        </div>

        <div className="offer-grid">
          {whatYouGet.map((item) => (
            <article className="offer-card" key={item.title}>
              <div className="offer-icon" aria-hidden="true">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta-wrap">
        <div className="final-cta section-wrap">
          <div className="final-cta-copy">
            <p>Visualize the concept.</p>
            <p>Understand the chapter.</p>
            <p>Master the question.</p>
          </div>
          <a className="button button-primary" href="#choose-class">Start Learning <ArrowIcon /></a>
        </div>
      </section>
    </main>
  )
}

function ChapterCard({ chapter }) {
  return (
    <a className="chapter-card" href={getChapterPath(chapter)}>
      <div className="chapter-card-number">{String(chapter.chapterNumber).padStart(2, '0')}</div>
      <div className="chapter-card-copy">
        <span>CHAPTER {chapter.chapterNumber}</span>
        <h2>{chapter.title}</h2>
        <p className="chapter-card-summary">Explore key ideas and learning resources for this chapter.</p>
        <div className="chapter-card-link">View chapter <ArrowIcon /></div>
      </div>
      <div className="chapter-card-icon" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M20 5v30M11 11c4.5 0 7.5 3 9 9-1.5 6-4.5 9-9 9M29 11c-4.5 0-7.5 3-9 9 1.5 6 4.5 9 9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </div>
    </a>
  )
}

function ClassPage({ classNumber, allChapters }) {
  const chapters = getClassChapters(classNumber, allChapters)
  return (
    <main className="page-main">
      <div className="page-container class-listing-container">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: `Class ${classNumber}` }]} />
        <section className="page-heading">
          <div className="eyebrow">BIOLOGY • CLASS {classNumber}</div>
          <h1>Class {classNumber} Biology</h1>
          <p>Choose a chapter to start learning.</p>
        </section>
        <div className="chapter-grid">
          {chapters.map((chapter) => <ChapterCard chapter={chapter} key={chapter.id} />)}
        </div>
        <p className="curriculum-note">Chapter titles follow the NCERT Biology textbook contents.</p>
      </div>
    </main>
  )
}

function ResourceCard({ icon, label, title, description, children, className = '' }) {
  return (
    <section className={`resource-card ${className}`}>
      <div className="resource-icon" aria-hidden="true">{icon}</div>
      <div className="resource-label">{label}</div>
      <h2>{title}</h2>
      {description && <p className="resource-description">{description}</p>}
      {children}
    </section>
  )
}

function getYoutubeEmbedUrl(url) {
  try {
    const parsed = new URL(url)
    let videoId = ''
    if (parsed.hostname === 'youtu.be') {
      videoId = parsed.pathname.slice(1)
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsed.hostname)) {
      if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v') || ''
      else if (parsed.pathname.startsWith('/embed/')) videoId = parsed.pathname.split('/')[2] || ''
      else if (parsed.pathname.startsWith('/shorts/')) videoId = parsed.pathname.split('/')[2] || ''
    }
    return /^[\w-]{11}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : ''
  } catch {
    return ''
  }
}

function NotesResource({ notesPdf }) {
  const [availablePdf, setAvailablePdf] = useState('')

  useEffect(() => {
    if (!notesPdf) return undefined
    const controller = new AbortController()
    fetch(notesPdf, { method: 'HEAD', signal: controller.signal })
      .then((response) => {
        const type = response.headers.get('content-type') || ''
        setAvailablePdf(response.ok && (type.includes('pdf') || type.includes('octet-stream')) ? notesPdf : '')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setAvailablePdf('')
      })
    return () => controller.abort()
  }, [notesPdf])
  const isAvailable = Boolean(notesPdf && availablePdf === notesPdf)

  return (
    <ResourceCard
      className="notes-resource"
      icon={<svg viewBox="0 0 24 24" fill="none"><path d="M6 3.75h8l4 4v12.5H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 3.75v4h4M9 13h6M9 16.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>}
      label="STUDY MATERIAL"
      title="Chapter Notes"
      description="Study from my handwritten chapter-wise notes."
    >
      {isAvailable ? (
        <div className="resource-actions">
          <a className="button button-primary" href={notesPdf} target="_blank" rel="noreferrer">View Notes <ArrowIcon /></a>
          <a className="button button-secondary" href={notesPdf} download>Download Notes</a>
        </div>
      ) : <p className="resource-status">Handwritten notes coming soon.</p>}
    </ResourceCard>
  )
}

function ChapterPage({ chapter }) {
  const videoEmbedUrl = chapter.youtubeUrl ? getYoutubeEmbedUrl(chapter.youtubeUrl) : ''
  return (
    <main className="page-main">
      <div className="page-container chapter-page-container">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: `Class ${chapter.class}`, href: `/class-${chapter.class}` },
          { label: chapter.title },
        ]} />
        <section className="chapter-page-heading">
          <div className="chapter-heading-meta">
            <span>CLASS {chapter.class}</span>
            <span>BIOLOGY</span>
            <span>CHAPTER {chapter.chapterNumber}</span>
          </div>
          <h1>{chapter.title}</h1>
          <p>{chapter.description || 'Learn the important concepts of this chapter with handwritten notes, questions and video explanations.'}</p>
        </section>
        <div className="resource-grid">
          <ResourceCard
            className="video-resource"
            icon={<svg viewBox="0 0 24 24" fill="none"><rect x="3.75" y="5.75" width="16.5" height="12.5" rx="2.5" stroke="currentColor" strokeWidth="1.6" /><path d="m10 9 5 3-5 3z" fill="currentColor" /></svg>}
            label="WATCH & LEARN"
            title="Watch the Chapter Video"
            description="Understand the chapter with the Conceptra video explanation."
          >
            {videoEmbedUrl ? (
              <div className="video-frame">
                <iframe src={videoEmbedUrl} title={`${chapter.title} chapter video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                <a className="video-watch-link" href={chapter.youtubeUrl} target="_blank" rel="noreferrer">Watch on YouTube <ArrowIcon /></a>
              </div>
            ) : chapter.youtubeUrl ? (
              <a className="button button-secondary" href={chapter.youtubeUrl} target="_blank" rel="noreferrer">Open video <ArrowIcon /></a>
            ) : <p className="resource-status">Video coming soon.</p>}
          </ResourceCard>
          <NotesResource notesPdf={chapter.notesPdf} />
          <ResourceCard
            className="questions-resource"
            icon={<svg viewBox="0 0 24 24" fill="none"><path d="M5 4.75h14v15l-3.5-2.2-3.5 2.2-3.5-2.2L5 19.75z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 9h6M9 12.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>}
            label="NEET PYQ"
            title="NEET PYQ Questions"
            description="Practice previous-year NEET questions from this chapter."
          >
            <a className="button button-primary" href={`${getChapterPath(chapter)}/questions`}>NEET PYQ Questions <ArrowIcon /></a>
          </ResourceCard>
        </div>
      </div>
    </main>
  )
}

function QuestionCard({ question, index }) {
  const [selectedOption, setSelectedOption] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [selectionError, setSelectionError] = useState(false)
  const correctAnswer = question.correctAnswer ?? question.answer
  const isCorrect = selectedOption === correctAnswer

  function handleSubmit() {
    if (!selectedOption) {
      setSelectionError(true)
      return
    }
    setSelectionError(false)
    setSubmitted(true)
  }

  return (
    <article className={`question-card${submitted ? ' question-submitted' : ''}`}>
      {question.topic?.trim() && (
        <div className="question-topic">
          <span>TOPIC</span>
          <strong>{question.topic}</strong>
        </div>
      )}
      <div className="question-card-meta">
        <div className="question-number">QUESTION {String(index + 1).padStart(2, '0')}</div>
        {question.questionType !== 'Practice' && question.neetYear && <span className="question-year">NEET {question.neetYear}</span>}
      </div>
      <h2>{question.question}</h2>
      {question.imageUrl && (
        <div className="question-image">
          <img src={question.imageUrl} alt={`Diagram for question ${index + 1}`} loading="lazy" />
        </div>
      )}
      <div className="question-options">
        {question.options.map((option) => (
          <label
            className={[
              'question-option',
              selectedOption === option && !submitted ? 'option-selected' : '',
              submitted && option === correctAnswer ? 'option-correct' : '',
              submitted && option === selectedOption && !isCorrect ? 'option-incorrect' : '',
            ].filter(Boolean).join(' ')}
            key={option}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option}
              checked={selectedOption === option}
              disabled={submitted}
              onChange={() => {
                setSelectedOption(option)
                setSelectionError(false)
              }}
            />
            <span className="option-radio" />
            <span>{option}</span>
            {submitted && option === correctAnswer && <span className="option-feedback" aria-hidden="true">✓</span>}
            {submitted && option === selectedOption && !isCorrect && <span className="option-feedback" aria-hidden="true">✗</span>}
          </label>
        ))}
      </div>
      <button className="question-submit button button-primary" type="button" onClick={handleSubmit} disabled={submitted}>
        {submitted ? 'Submitted' : 'Submit Answer'}
      </button>
      {selectionError && !submitted && (
        <p className="question-selection-error" role="alert">Please select an answer first.</p>
      )}
      {submitted && (
        <div className={`answer-panel${isCorrect ? ' answer-panel-correct' : ' answer-panel-incorrect'}`} aria-live="polite">
          <strong className={isCorrect ? 'answer-correct' : 'answer-incorrect'}>
            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </strong>
          <div className="answer-explanation">
            <strong>Explanation:</strong>
            <p>{question.explanation || 'No explanation provided.'}</p>
          </div>
        </div>
      )}
    </article>
  )
}

function QuestionsPage({ chapter }) {
  const [questionMode, setQuestionMode] = useState('all')
  const filteredQuestions = filterQuestionsByMode(chapter.questions, questionMode)

  return (
    <main className="page-main">
      <div className="page-container narrow-container questions-page-container">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: `Class ${chapter.class}`, href: `/class-${chapter.class}` },
          { label: chapter.title, href: getChapterPath(chapter) },
          { label: 'Questions' },
        ]} />
        <section className="page-heading questions-heading">
          <div className="eyebrow">CLASS {chapter.class} • CHAPTER {chapter.chapterNumber}</div>
          <h1>NEET PYQ Questions</h1>
          <p>Practice previous-year NEET questions from this chapter.</p>
        </section>
        <div className="question-mode-tabs" role="group" aria-label="Question mode">
          <button
            className={questionMode === 'all' ? 'question-mode-tab active' : 'question-mode-tab'}
            type="button"
            aria-pressed={questionMode === 'all'}
            onClick={() => setQuestionMode('all')}
          >
            All Questions
          </button>
          <button
            className={questionMode === 'pyq' ? 'question-mode-tab active' : 'question-mode-tab'}
            type="button"
            aria-pressed={questionMode === 'pyq'}
            onClick={() => setQuestionMode('pyq')}
          >
            PYQ Only
          </button>
        </div>
        {filteredQuestions.length ? (
          <div className="questions-list">
            {filteredQuestions.map(({ question, index }) => <QuestionCard question={question} index={index} key={question.id} />)}
          </div>
        ) : questionMode === 'pyq' ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">✳</span>
            <h2>No NEET PYQs available for this chapter yet.</h2>
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">✳</span>
            <h2>NEET PYQ questions are on the way</h2>
            <p>We’re preparing previous-year NEET questions for this chapter. Check back soon.</p>
            <a className="button button-secondary" href={getChapterPath(chapter)}>Back to chapter</a>
          </div>
        )}
      </div>
    </main>
  )
}

function SearchPage({ chapters }) {
  const initialQuery = new URLSearchParams(window.location.search).get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const normalizedQuery = query.trim().toLowerCase()
  const results = normalizedQuery
    ? chapters.filter((chapter) =>
      chapter.title.toLowerCase().includes(normalizedQuery)
      || String(chapter.chapterNumber).includes(normalizedQuery))
    : []

  return (
    <main className="page-main">
      <div className="page-container narrow-container">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Search' }]} />
        <section className="search-heading">
          <div className="eyebrow">FIND WHAT YOU NEED</div>
          <h1>Search Biology</h1>
          <p>Look up a chapter by name or chapter number.</p>
          <form className="search-form" action="/search" method="get">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.7" /><path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            <input type="search" name="q" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “inheritance” or a chapter number" aria-label="Search by chapter name or number" />
            <button className="button button-primary" type="submit">Search</button>
          </form>
        </section>
        {normalizedQuery && (
          <section className="search-results">
            <div className="results-heading">{results.length} {results.length === 1 ? 'chapter' : 'chapters'} found</div>
            {results.length ? results.map((chapter) => (
              <a className="search-result" href={getChapterPath(chapter)} key={`${chapter.class}-${chapter.id}`}>
                <span className="result-number">{String(chapter.chapterNumber).padStart(2, '0')}</span>
                <span><small>CLASS {chapter.class} • BIOLOGY</small><strong>{chapter.title}</strong></span>
                <ArrowIcon />
              </a>
            )) : <p className="no-results">No matching chapters. Try another name or number.</p>}
          </section>
        )}
      </div>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="page-main">
      <div className="empty-state not-found">
        <span className="eyebrow">PAGE NOT FOUND</span>
        <h1>Let’s find your way back.</h1>
        <a className="button button-primary" href="/">Go to home <ArrowIcon /></a>
      </div>
    </main>
  )
}

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const isAdminRoute = path === '/admin' || path === '/admin/login'
  const [chapters, setChapters] = useState(biologyChapters)
  const [chapterLoadError, setChapterLoadError] = useState('')
  const classMatch = path.match(/^\/class-(11|12)$/)
  const chapterMatch = path.match(/^\/class-(11|12)\/biology\/([^/]+)(\/questions)?$/)
  
  useEffect(() => {
    if (isAdminRoute || !isSupabaseConfigured) return undefined
    let active = true
    getPublicChapterChanges()
      .then(({ chapters: publishedChapters, hiddenIds }) => {
        if (!active) return
        const chapterMap = new Map(biologyChapters.map((chapter) => [chapter.id, chapter]))
        publishedChapters.forEach((chapter) => {
          chapterMap.set(chapter.id, chapter)
        })
        setChapters([...chapterMap.values()]
          .filter((chapter) => !hiddenIds.includes(chapter.id))
          .sort((left, right) => left.class - right.class || left.chapterNumber - right.chapterNumber))
      })
      .catch((error) => {
        if (active) setChapterLoadError(`Unable to load published Biology updates: ${error.message}`)
      })
    return () => { active = false }
  }, [isAdminRoute])

  if (path === '/admin/login') return <AdminLoginPage />
  if (path === '/admin') return <AdminDashboardPage />

  let page

  if (path === '/') page = <HomePage chapters={chapters} />
  else if (path === '/search') page = <SearchPage chapters={chapters} />
  else if (classMatch) page = <ClassPage classNumber={classMatch[1]} allChapters={chapters} />
  else if (chapterMatch) {
    const chapter = chapters.find((item) =>
      item.class === Number(chapterMatch[1]) && item.id === chapterMatch[2],
    )
    page = !chapter
      ? <NotFoundPage />
      : chapterMatch[3]
        ? <QuestionsPage chapter={chapter} />
        : <ChapterPage chapter={chapter} />
  } else page = <NotFoundPage />

  return (
    <>
      <SiteHeader />
      {chapterLoadError && <div className="site-data-warning" role="alert">{chapterLoadError}</div>}
      {page}
      <SiteFooter />
    </>
  )
}

export default App
