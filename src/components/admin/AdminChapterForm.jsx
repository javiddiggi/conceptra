import { useRef, useState } from 'react'
import { saveChapter } from '../../lib/adminContent.js'
import {
  assignMissingQuestionTopics,
  inheritQuestionTopicsAtPosition,
} from '../../lib/questionTopics.js'
import QuestionEditor from './QuestionEditor.jsx'

const maxNotesPdfSize = 50 * 1024 * 1024

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function AdminChapterForm({ chapter, chapters, onSaved, onIdentityStatus, onCancel }) {
  const formRef = useRef(null)
  const [classNumber, setClassNumber] = useState(chapter?.class || 11)
  const [chapterNumber, setChapterNumber] = useState(() => chapter?.chapterNumber || chapters
    .filter((item) => item.class === 11)
    .reduce((highest, item) => Math.max(highest, item.chapterNumber), 0) + 1)
  const [title, setTitle] = useState(chapter?.title || '')
  const [description, setDescription] = useState(chapter?.description || '')
  const [youtubeUrl, setYoutubeUrl] = useState(chapter?.youtubeUrl || '')
  const [notesPdf, setNotesPdf] = useState(chapter?.notesPdf || '')
  const [notesFile, setNotesFile] = useState(null)
  const [questions, setQuestions] = useState(() => assignMissingQuestionTopics(chapter?.questions || []))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handlePdfChange(event) {
    const file = event.target.files?.[0] || null
    setError('')
    if (file && file.type !== 'application/pdf') {
      setError('Choose a PDF file.')
      event.target.value = ''
      setNotesFile(null)
      return
    }
    if (file && file.size > maxNotesPdfSize) {
      setError('Choose a PDF file no larger than 50 MB.')
      event.target.value = ''
      setNotesFile(null)
      return
    }
    setNotesFile(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (youtubeUrl) {
      let videoUrl
      try {
        videoUrl = new URL(youtubeUrl)
      } catch {
        setError('Enter a valid YouTube URL.')
        return
      }
      if (videoUrl.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(videoUrl.hostname)) {
        setError('Enter a valid HTTPS YouTube URL.')
        return
      }
    }

    const slug = slugify(title)
    if (!slug) {
      setError('The chapter name must contain letters or numbers.')
      return
    }
    if (!chapter && chapters.some((item) => item.id === slug && item.class === Number(classNumber))) {
      setError('A chapter with this name already exists. Edit the existing chapter instead.')
      return
    }
    const invalidQuestion = questions.find((question) =>
      !question.question.trim()
      || question.options.length !== 4
      || question.options.some((option) => !option.trim())
      || !question.options.includes(question.correctAnswer ?? question.answer),
    )
    if (invalidQuestion) {
      setError('Complete each question, all four options, and select a correct answer.')
      return
    }

    const sameSlugInOtherClass = !chapter
      && chapters.some((item) => item.id === slug && item.class !== Number(classNumber))
    const id = chapter?.id || (sameSlugInOtherClass ? `class-${classNumber}-${slug}` : slug)
    setSaving(true)
    try {
      await saveChapter({
        id,
        class: Number(classNumber),
        subject: 'Biology',
        chapterNumber: Number(chapterNumber),
        title,
        description,
        youtubeUrl,
        notesPdf,
        questions: inheritQuestionTopicsAtPosition(questions).map((question) => {
          const questionData = { ...question }
          const answer = questionData.answer
          delete questionData.answer
          delete questionData.isDraft
          delete questionData.defaultTopic
          return {
            ...questionData,
            correctAnswer: question.correctAnswer ?? answer,
            questionType: question.questionType || 'NEET PYQ',
            neetYear: question.questionType === 'Practice' ? '' : question.neetYear || '',
          }
        }),
      }, notesFile, {
        isNew: !chapter || typeof chapter.isPublished === 'undefined',
        onIdentityStatus,
        previousQuestions: chapter?.questions || [],
      })
      await onSaved()
    } catch (saveError) {
      setError(saveError.message || 'The chapter could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function saveQuestion() {
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} className="admin-content-card admin-chapter-form" onSubmit={handleSubmit}>
      <div className="admin-card-heading">
        <div>
          <span className="admin-field-eyebrow">{chapter ? 'UPDATE CONTENT' : 'CREATE CONTENT'}</span>
          <h2>{chapter ? 'Edit Chapter' : 'Add Chapter'}</h2>
          <p>Chapter pages and URLs use the chapter name as their identifier.</p>
        </div>
        {onCancel && <button className="admin-button admin-button-quiet" type="button" onClick={onCancel}>Cancel</button>}
      </div>

      <div className="admin-fields-grid">
        <label className="admin-field">
          Class
          <select
            value={classNumber}
            onChange={(event) => {
              const nextClass = Number(event.target.value)
              setClassNumber(nextClass)
              if (!chapter) {
                const lastNumber = chapters
                  .filter((item) => item.class === nextClass)
                  .reduce((highest, item) => Math.max(highest, item.chapterNumber), 0)
                setChapterNumber(lastNumber + 1)
              }
            }}
          >
            <option value={11}>Class 11</option>
            <option value={12}>Class 12</option>
          </select>
        </label>
        <label className="admin-field">
          Subject
          <input value="Biology" readOnly />
        </label>
        <label className="admin-field">
          Chapter Number
          <input type="number" min="1" value={chapterNumber} onChange={(event) => setChapterNumber(event.target.value)} required />
        </label>
        <label className="admin-field admin-field-wide">
          Chapter Name
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="admin-field admin-field-wide">
          Chapter Description
          <textarea rows="3" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="admin-field admin-field-wide">
          YouTube URL
          <input type="url" placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} />
        </label>
        <label className="admin-field admin-field-wide">
          Notes PDF
          <input type="file" accept="application/pdf,.pdf" onChange={handlePdfChange} />
          <span className="admin-hint">
            {notesFile ? `${notesFile.name} · ready to upload` : notesPdf ? 'A PDF is currently attached. Choose another PDF to replace it.' : 'Optional PDF upload, up to 50 MB.'}
          </span>
          {notesPdf && !notesFile && (
            <button className="admin-link-button admin-danger-link" type="button" onClick={() => setNotesPdf('')}>
              Remove attached PDF
            </button>
          )}
        </label>
      </div>

      <QuestionEditor questions={questions} onChange={setQuestions} onSaveQuestion={saveQuestion} saving={saving} />
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-form-actions">
        <button className="admin-button admin-button-primary" type="submit" disabled={saving}>
          {saving ? 'Publishing…' : 'Publish Chapter'}
        </button>
        {onCancel && <button className="admin-button admin-button-secondary" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

export default AdminChapterForm
