import { useRef, useState } from 'react'
import { appendChapterQuestions, saveChapter, saveExistingChapterQuestion } from '../../lib/adminContent.js'
import {
  getDefaultQuestionTopic,
  inheritQuestionTopicsAtPosition,
} from '../../lib/questionTopics.js'
import QuestionEditor from './QuestionEditor.jsx'
import { getQuestionExamYear } from '../../lib/questionFiltering.js'
import SingleQuestionPaste from './SingleQuestionPaste.jsx'
import { appendPastedQuestion } from '../../lib/singleQuestionParser.js'
import { validateNotesUrl } from '../../lib/notesLinks.js'

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
  const [subject, setSubject] = useState(chapter?.subject || 'Biology')
  const [chapterNumber, setChapterNumber] = useState(() => chapter?.chapterNumber || chapters
    .filter((item) => item.class === 11)
    .reduce((highest, item) => Math.max(highest, item.chapterNumber), 0) + 1)
  const [title, setTitle] = useState(chapter?.title || '')
  const [description, setDescription] = useState(chapter?.description || '')
  const [youtubeUrl, setYoutubeUrl] = useState(chapter?.youtubeUrl || '')
  const [notesPdf, setNotesPdf] = useState(chapter?.notesPdf || '')
  const [notesFile, setNotesFile] = useState(null)
  const [questions, setQuestions] = useState(() => chapter?.questions || [])
  const [savedQuestions, setSavedQuestions] = useState(() => chapter?.questions || [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [defaultTopic, setDefaultTopic] = useState(() => getDefaultQuestionTopic(chapter?.questions || []))

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
    let validatedNotesUrl
    try {
      validatedNotesUrl = validateNotesUrl(notesPdf || '')
    } catch (notesError) {
      setError(notesError.message)
      return
    }
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
    if (!chapter && chapters.some((item) =>
      item.class === Number(classNumber)
      && item.subject === subject
      && (item.id === slug || slugify(item.title) === slug),
    )) {
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

    const slugInOtherClass = !chapter && chapters.some((item) => item.id === slug)
    const id = chapter?.id || (subject === 'Biology' && !slugInOtherClass
      ? slug
      : `${subject.toLowerCase()}-${classNumber}-${slug}`)
    setSaving(true)
    try {
      await saveChapter({
        id,
        class: Number(classNumber),
        subject,
        chapterNumber: Number(chapterNumber),
        title,
        description,
        youtubeUrl,
        notesPdf: validatedNotesUrl,
        questions: inheritQuestionTopicsAtPosition(questions).map((question) => {
          const questionData = { ...question }
          const answer = questionData.answer
          delete questionData.answer
          delete questionData.isDraft
          delete questionData.defaultTopic
          return {
            ...questionData,
            correctAnswer: question.correctAnswer ?? answer,
            ...(question.questionType ? { questionType: question.questionType } : {}),
            examYear: question.examCategory === 'Practice' || question.questionType === 'Practice'
              ? ''
              : getQuestionExamYear(question),
          }
        }),
      }, notesFile, {
        isNew: !chapter || typeof chapter.isPublished === 'undefined',
        includeQuestions: !chapter
          || typeof chapter.isPublished === 'undefined'
          || JSON.stringify(questions) !== JSON.stringify(savedQuestions),
        onIdentityStatus,
        expectedQuestions: savedQuestions,
        previousQuestions: savedQuestions,
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

  async function savePastedQuestion(question) {
    const latestQuestions = await appendPastedQuestion({
      chapter,
      questions,
      savedQuestions,
      question,
      appendQuestions: appendChapterQuestions,
    })
    setQuestions(latestQuestions)
    setSavedQuestions(latestQuestions)
    if (question.topic?.trim()) setDefaultTopic(question.topic.trim())
    return {
      questions: latestQuestions,
      persisted: Boolean(chapter && typeof chapter.isPublished !== 'undefined'),
    }
  }

  async function saveExistingQuestion(questionId, editedQuestion) {
    if (!chapter || typeof chapter.isPublished === 'undefined') {
      throw new Error('Only a saved chapter question can be edited this way.')
    }
    const baselineQuestion = savedQuestions.find((question) => String(question.id) === String(questionId))
    if (!baselineQuestion) {
      throw new Error('This question is not part of the latest saved chapter state. Reload the chapter and try again.')
    }
    setSaving(true)
    setError('')
    try {
      const result = await saveExistingChapterQuestion(
        chapter.id,
        baselineQuestion,
        editedQuestion,
        onIdentityStatus,
      )
      const latestQuestions = result.questions
      setSavedQuestions(latestQuestions)
      setQuestions((current) => [
        ...latestQuestions,
        ...current.filter((question) => question.isDraft),
      ])
      setError(result.warning)
    } catch (saveError) {
      setError(saveError.message || 'Question changes could not be saved.')
      throw saveError
    } finally {
      setSaving(false)
    }
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
                  .filter((item) => item.class === nextClass && item.subject === subject)
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
          <select value={subject} disabled={Boolean(chapter)} onChange={(event) => {
            const nextSubject = event.target.value
            setSubject(nextSubject)
            if (!chapter) {
              const lastNumber = chapters
                .filter((item) => item.class === Number(classNumber) && item.subject === nextSubject)
                .reduce((highest, item) => Math.max(highest, item.chapterNumber), 0)
              setChapterNumber(lastNumber + 1)
            }
          }}>
            <option>Biology</option>
            <option>Physics</option>
            <option>Chemistry</option>
          </select>
          {chapter && <span className="admin-hint">Existing chapter subjects stay fixed to preserve their student URL.</span>}
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
          Notes PDF or Google Drive share link
          <input
            type="text"
            placeholder="https://drive.google.com/file/d/..."
            value={notesPdf || ''}
            onChange={(event) => setNotesPdf(event.target.value)}
          />
          <span className="admin-hint">For Drive, share as “Anyone with the link” · Viewer. Supabase-hosted PDFs continue to work.</span>
          <input type="file" accept="application/pdf,.pdf" onChange={handlePdfChange} />
          <span className="admin-hint">
            {notesFile ? `${notesFile.name} · ready to upload` : 'Optional PDF upload, up to 50 MB.'}
          </span>
        </label>
      </div>

      <QuestionEditor
        questions={questions}
        onChange={setQuestions}
        onSaveQuestion={saveQuestion}
        onSaveExistingQuestion={saveExistingQuestion}
        saving={saving}
        subject={subject}
        pasteOpen={pasteOpen}
        onTogglePaste={() => setPasteOpen((open) => !open)}
        defaultTopic={defaultTopic}
        onDefaultTopicChange={setDefaultTopic}
      >
        <div className="admin-single-paste-container" hidden={!pasteOpen}>
          <SingleQuestionPaste
            onSave={savePastedQuestion}
            onClose={() => setPasteOpen(false)}
            selectedTopic={defaultTopic}
            disabled={saving}
            currentQuestionCount={questions.length}
            subject={subject}
          />
        </div>
      </QuestionEditor>
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
