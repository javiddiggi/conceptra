import { useEffect, useState } from 'react'
import SiteFooter from './components/SiteFooter.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'
import {
  chapterCatalog,
  getChapterPath,
  getSubjectChapters,
} from './data/biologyData.js'
import { getPublicChapterChanges } from './lib/adminContent.js'
import {
  examCategories,
  filterQuestionsByExam,
  filterQuestionsByMode,
  getQuestionExamCategory,
  getQuestionExamYear,
  sortQuestionsWithinTopics,
} from './lib/questionFiltering.js'
import { groupQuestionsByTopic } from './lib/questionTopics.js'
import { getGoogleDriveNotesLinks } from './lib/notesLinks.js'
import AnswerFeedback from './components/AnswerFeedback.js'
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
        || `class ${chapter.class}`.includes(normalizedQuery)
        || (chapter.subject || 'Biology').toLowerCase().includes(normalizedQuery),
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
          placeholder="Search chapters, topics or concepts..."
          aria-label="Search chapters, topics or concepts"
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
                <small>Class {chapter.class} · {chapter.subject || 'Biology'}</small>
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
  return (
    <main className="home-page-shell">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> PHYSICS • CHEMISTRY • BIOLOGY • NEET PREPARATION</div>
          <h1>Understand Science.<br /><span>One Concept at a Time.</span></h1>
          <p className="hero-subtitle">Learn Class 11 &amp; Class 12 Physics, Chemistry and Biology through clear explanations, notes and NEET-focused questions.</p>
          <HomeChapterSearch chapters={chapters} />
          <div className="hero-actions">
            <a className="button button-primary" href="#choose-class">Start Learning <ArrowIcon /></a>
            <a className="button button-secondary" href="#choose-class">Explore NEET PYQs</a>
          </div>
          <div className="hero-proof"><span className="proof-mark">✓</span> Focused learning for NEET-ready science mastery</div>
        </div>
      </section>

      <section className="youtube-announcement section-wrap" aria-labelledby="youtube-announcement-title">
        <div className="youtube-announcement-copy">
          <span className="youtube-announcement-label">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2.25" y="4.25" width="15.5" height="11.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="m8 7 5 3-5 3z" fill="currentColor" />
            </svg>
            🚀 NEW ON YOUTUBE
          </span>
          <h2 id="youtube-announcement-title">Learn Science. Visualize Every Concept.</h2>
          <p>Explore Conceptra&apos;s concept-led lessons, NEET-focused explanations and question practice.</p>
        </div>
        <a
          className="button button-primary youtube-announcement-button"
          href="https://www.youtube.com/@CONCEPTRAAA"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2.25" y="4.25" width="15.5" height="11.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="m8 7 5 3-5 3z" fill="currentColor" />
          </svg>
          Subscribe on YouTube
        </a>
      </section>

      <section className="class-picker section-wrap" id="choose-class">
        <div className="section-heading">
          <div>
            <div className="eyebrow">YOUR LEARNING PATH</div>
            <h2>Choose Your Class</h2>
          </div>
          <p>Choose your class to explore Physics, Chemistry and Biology chapters.</p>
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
              <h3>Explore subjects</h3>
              <p>Physics • Chemistry • Biology</p>
              <div className="class-card-bottom"><span>Explore Class {classNumber}</span><ArrowIcon /></div>
            </a>
          ))}
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
  const subjects = ['Biology', 'Physics', 'Chemistry']
  return (
    <main className="page-main">
      <div className="page-container class-listing-container">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: `Class ${classNumber}` }]} />
        <section className="page-heading">
          <div className="eyebrow">YOUR LEARNING PATH</div>
          <h1>Class {classNumber}</h1>
          <p>Choose a subject to explore available chapters and learning resources.</p>
        </section>
        <div className="class-card-grid">
          {subjects.map((subject) => {
            const chapterCount = getSubjectChapters(classNumber, subject, allChapters).length
            return (
              <a className={`class-card class-card-${classNumber}`} href={`/class-${classNumber}/${subject.toLowerCase()}`} key={subject}>
                <div className="class-card-top"><span className="class-card-class">CLASS {classNumber}</span></div>
                <h3>{subject}</h3>
                <p>{chapterCount ? `${chapterCount} chapters · Notes · NEET questions` : 'Chapters coming soon'}</p>
                <div className="class-card-bottom"><span>Explore {subject}</span><ArrowIcon /></div>
              </a>
            )
          })}
        </div>
      </div>
    </main>
  )
}

function SubjectPage({ classNumber, subject, allChapters }) {
  const chapters = getSubjectChapters(classNumber, subject, allChapters)
  return (
    <main className="page-main">
      <div className="page-container class-listing-container">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: `Class ${classNumber}`, href: `/class-${classNumber}` },
          { label: subject },
        ]} />
        <section className="page-heading">
          <div className="eyebrow">{subject.toUpperCase()} • CLASS {classNumber}</div>
          <h1>Class {classNumber} {subject}</h1>
          <p>Choose a chapter to start learning.</p>
        </section>
        {chapters.length ? (
          <div className="chapter-grid">
            {chapters.map((chapter) => <ChapterCard chapter={chapter} key={chapter.id} />)}
          </div>
        ) : (
          <div className="empty-state">
            <h2>Chapters are being prepared.</h2>
            <p>Check back soon for Class {classNumber} {subject} learning resources.</p>
            <a className="button button-secondary" href={`/class-${classNumber}`}>Choose another subject</a>
          </div>
        )}
        {subject === 'Biology' && (
          <p className="curriculum-note">Chapter titles follow the NCERT Biology textbook contents.</p>
        )}
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
  const driveLinks = notesPdf ? getGoogleDriveNotesLinks(notesPdf) : null

  useEffect(() => {
    if (!notesPdf || getGoogleDriveNotesLinks(notesPdf)) return undefined
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
      {driveLinks ? (
        <>
          <div className="resource-actions">
            <a className="button button-primary" href={driveLinks.view} target="_blank" rel="noreferrer">View Notes <ArrowIcon /></a>
            <a className="button button-secondary" href={driveLinks.download} target="_blank" rel="noreferrer">Download Notes</a>
          </div>
          <p className="resource-status">Google Drive access requires “Anyone with the link” viewer permission. Download behavior may vary by device.</p>
        </>
      ) : isAvailable ? (
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
            <span>{(chapter.subject || 'Biology').toUpperCase()}</span>
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
            label="QUESTION PRACTICE"
            title="Questions"
            description="Practice NEET previous-year and chapter questions."
          >
            {chapter.questions?.length || (chapter.subject || 'Biology') === 'Biology' ? (
              <a className="button button-primary" href={`${getChapterPath(chapter)}/questions`}>Practice Questions <ArrowIcon /></a>
            ) : (
              <>
                <p className="resource-status">Questions coming soon.</p>
                <a className="button button-secondary" href={`${getChapterPath(chapter)}/questions`}>View chapter questions</a>
              </>
            )}
          </ResourceCard>
        </div>
      </div>
    </main>
  )
}

function QuestionCard({ question, index, showTopic = true }) {
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
      {showTopic && question.topic?.trim() && (
        <div className="question-topic">
          <span>TOPIC</span>
          <strong>{question.topic}</strong>
        </div>
      )}
      <div className="question-card-meta">
        <div className="question-number">QUESTION {String(index + 1).padStart(2, '0')}</div>
        {getQuestionExamCategory(question) !== 'Practice' && getQuestionExamYear(question) && (
          <span className="question-year">{getQuestionExamCategory(question)} {getQuestionExamYear(question)}</span>
        )}
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
        <AnswerFeedback
          isCorrect={isCorrect}
          explanation={question.explanation}
          solutionImageUrl={question.solutionImageUrl}
          questionNumber={index + 1}
        />
      )}
    </article>
  )
}

function QuestionsPage({ chapter }) {
  const [questionMode, setQuestionMode] = useState('all')
  const [examFilter, setExamFilter] = useState('all')
  const subject = chapter.subject || 'Biology'
  const filteredByExam = filterQuestionsByExam(chapter.questions, examFilter)
  const filteredQuestions = filterQuestionsByMode(
    filteredByExam.map(({ question }) => question),
    questionMode,
  )
  const topicGroups = sortQuestionsWithinTopics(groupQuestionsByTopic(filteredQuestions.map(({ question }) => question)))

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
          <div className="eyebrow">{(chapter.subject || 'Biology').toUpperCase()} • CLASS {chapter.class} • CHAPTER {chapter.chapterNumber}</div>
          <h1>Chapter Questions</h1>
          <p>Practice previous-year questions and additional practice questions.</p>
        </section>
        <div className="question-mode-tabs" role="group" aria-label="Question mode">
          <label className="question-exam-filter">
            Exam
            <select value={examFilter} onChange={(event) => setExamFilter(event.target.value)}>
              <option value="all">All exams</option>
              {(examCategories[subject] || examCategories.Biology).map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
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
            {topicGroups.map((group) => (
              <section className="question-topic-group" key={group.topicKey || 'untitled'}>
                {group.topic && (
                  <div className="question-topic question-topic-group-heading">
                    <span>TOPIC</span>
                    <strong>{group.topic}</strong>
                  </div>
                )}
                <div className="question-topic-group-list">
                  {group.questions.slice(0, group.pyqCount).length > 0 && (
                    <>
                      <h3 className="question-subgroup-heading">Exam PYQs · newest first</h3>
                      {group.questions.slice(0, group.pyqCount).map(({ question }, topicIndex) => (
                        <QuestionCard question={question} index={topicIndex} showTopic={false} key={question.id} />
                      ))}
                    </>
                  )}
                  {group.otherCount > 0 && (
                    <>
                      <h3 className="question-subgroup-heading">Other Questions</h3>
                      {group.questions.slice(group.pyqCount, group.pyqCount + group.otherCount).map(({ question }, topicIndex) => (
                        <QuestionCard question={question} index={group.pyqCount + topicIndex} showTopic={false} key={question.id} />
                      ))}
                    </>
                  )}
                  {group.questions.length > group.pyqCount + group.otherCount && (
                    <>
                      <h3 className="question-subgroup-heading">Practice Questions</h3>
                      {group.questions.slice(group.pyqCount + group.otherCount).map(({ question }, topicIndex) => (
                        <QuestionCard question={question} index={group.pyqCount + group.otherCount + topicIndex} showTopic={false} key={question.id} />
                      ))}
                    </>
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : questionMode === 'pyq' ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">✳</span>
            <h2>{subject === 'Biology' ? 'No NEET PYQs available for this chapter yet.' : 'No exam PYQs available for this chapter yet.'}</h2>
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">✳</span>
            <h2>{subject === 'Biology' ? 'NEET PYQ questions are on the way' : 'Questions coming soon.'}</h2>
            <p>{subject === 'Biology'
              ? 'We’re preparing previous-year NEET questions for this chapter. Check back soon.'
              : 'We’re preparing exam and practice questions for this chapter. Check back soon.'}</p>
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
      || String(chapter.chapterNumber).includes(normalizedQuery)
      || (chapter.subject || 'Biology').toLowerCase().includes(normalizedQuery))
    : []

  return (
    <main className="page-main">
      <div className="page-container narrow-container">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Search' }]} />
        <section className="search-heading">
          <div className="eyebrow">FIND WHAT YOU NEED</div>
          <h1>Search chapters</h1>
          <p>Look up a chapter by subject, name or number.</p>
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
                <span><small>CLASS {chapter.class} • {(chapter.subject || 'Biology').toUpperCase()}</small><strong>{chapter.title}</strong></span>
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
  const [chapters, setChapters] = useState(chapterCatalog)
  const [chapterLoadError, setChapterLoadError] = useState('')
  const classMatch = path.match(/^\/class-(11|12)$/)
  const subjectMatch = path.match(/^\/class-(11|12)\/(biology|physics|chemistry)$/i)
  const chapterMatch = path.match(/^\/class-(11|12)\/(biology|physics|chemistry)\/([^/]+)(\/questions)?$/i)
  
  useEffect(() => {
    if (isAdminRoute || !isSupabaseConfigured) return undefined
    let active = true
    getPublicChapterChanges()
      .then(({ chapters: publishedChapters, hiddenIds }) => {
        if (!active) return
        const chapterMap = new Map(chapterCatalog.map((chapter) => [chapter.id, chapter]))
        publishedChapters.forEach((chapter) => {
          chapterMap.set(chapter.id, chapter)
        })
        setChapters([...chapterMap.values()]
          .filter((chapter) => !hiddenIds.includes(chapter.id))
          .sort((left, right) => left.class - right.class
            || (left.subject || 'Biology').localeCompare(right.subject || 'Biology')
            || left.chapterNumber - right.chapterNumber))
      })
      .catch((error) => {
        if (active) setChapterLoadError(`Unable to load published chapter updates: ${error.message}`)
      })
    return () => { active = false }
  }, [isAdminRoute])

  if (path === '/admin/login') return <AdminLoginPage />
  if (path === '/admin') return <AdminDashboardPage />

  let page

  if (path === '/') page = <HomePage chapters={chapters} />
  else if (path === '/search') page = <SearchPage chapters={chapters} />
  else if (classMatch) page = <ClassPage classNumber={classMatch[1]} allChapters={chapters} />
  else if (subjectMatch) page = <SubjectPage classNumber={subjectMatch[1]} subject={subjectMatch[2].toLowerCase().replace(/^./, (letter) => letter.toUpperCase())} allChapters={chapters} />
  else if (chapterMatch) {
    const chapter = chapters.find((item) =>
      item.class === Number(chapterMatch[1])
      && item.id === chapterMatch[3]
      && (item.subject || 'Biology').toLowerCase() === chapterMatch[2].toLowerCase(),
    )
    page = !chapter
      ? <NotFoundPage />
      : chapterMatch[4]
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
