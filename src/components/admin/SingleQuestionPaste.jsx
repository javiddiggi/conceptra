import { useRef, useState } from 'react'
import { parseSingleQuestion } from '../../lib/singleQuestionParser.js'
import { applyQuestionTopicDefault } from '../../lib/questionTopics.js'

const example = `Exam Category: NEET
Exam Year: 2024
Topic: Bryophytes
Question: The correct sequence of events in the life cycle of bryophytes is
A. Option A
B. Option B
C. Option C
D. Option D
Correct Answer: B
Explanation: Brief explanation here
Image URL:
Solution Image URL:`

const previewFields = [
  ['Exam Category', 'examCategory'],
  ['Exam Year', 'examYear'],
  ['Topic', 'topic'],
  ['Question Type', 'questionType'],
  ['Question', 'question'],
  ['Option A', 'optionA'],
  ['Option B', 'optionB'],
  ['Option C', 'optionC'],
  ['Option D', 'optionD'],
  ['Correct Answer', 'correctAnswer'],
  ['Explanation', 'explanation'],
  ['Image URL', 'imageUrl'],
  ['Solution Image URL', 'solutionImageUrl'],
]

function SingleQuestionPaste({ onSave, onClose, selectedTopic = '', disabled, currentQuestionCount, subject = 'Biology' }) {
  const [sourceText, setSourceText] = useState('')
  const [preview, setPreview] = useState(null)
  const [parseErrors, setParseErrors] = useState([])
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const questionPreview = preview ? applyQuestionTopicDefault(preview, selectedTopic) : preview

  function parse() {
    const result = parseSingleQuestion(sourceText, subject)
    setPreview(result.question)
    setParseErrors(result.errors)
    setSaveError('')
    setSuccessMessage('')
  }

  function updateSourceText(value) {
    setSourceText(value)
    setPreview(null)
    setParseErrors([])
    setSaveError('')
    setSuccessMessage('')
  }

  async function saveQuestion() {
    if (!preview || parseErrors.length || savingRef.current || disabled) return
    savingRef.current = true
    setSaving(true)
    setSaveError('')
    setSuccessMessage('')
    try {
      const result = await onSave({
        ...questionPreview,
        id: `bulk-${crypto.randomUUID()}`,
        ...(questionPreview.examCategory === 'Practice' ? { examYear: '' } : {}),
      })
      setSourceText('')
      setPreview(null)
      setParseErrors([])
      setSuccessMessage(result.persisted
        ? `Question saved. ${result.questions.length} ${result.questions.length === 1 ? 'question' : 'questions'} in this chapter.`
        : 'Question added. Publish the chapter to make it available.')
    } catch (error) {
      setSaveError(error.message || 'The question could not be saved. Your pasted text is still here.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <section className="admin-single-paste" aria-label="Paste one question">
      <div className="admin-single-paste-heading">
        <div>
          <h4>Paste One Question</h4>
          <p>Paste one complete question. We’ll identify its fields and show a preview before saving.</p>
          {selectedTopic && <p className="admin-single-paste-topic">Adding questions under <strong>{selectedTopic}</strong>.</p>}
        </div>
        <div className="admin-single-paste-heading-actions">
          <span>{currentQuestionCount} currently in chapter</span>
          <button className="admin-button admin-button-secondary" type="button" onClick={onClose} disabled={saving}>
            Close
          </button>
        </div>
      </div>
      <details className="admin-single-paste-format">
        <summary>View suggested format</summary>
        <pre>{example}</pre>
        <p>Use Question, options A–D, and Correct Answer. Exam category, year, topic, explanation, and image URLs are included when provided.</p>
      </details>
      <label className="admin-field admin-field-wide">
        Paste one complete question
        <textarea
          rows="12"
          value={sourceText}
          onChange={(event) => updateSourceText(event.target.value)}
          placeholder={example}
          disabled={saving || disabled}
        />
        <span className="admin-hint">Paste exactly one question. Missing optional details will be left blank.</span>
      </label>
      <div className="admin-single-paste-actions">
        <button className="admin-button admin-button-secondary" type="button" onClick={parse} disabled={!sourceText.trim() || saving || disabled}>
          Parse Preview
        </button>
        {preview && parseErrors.length === 0 && (
          <button className="admin-button admin-button-primary" type="button" onClick={saveQuestion} disabled={saving || disabled}>
            {saving ? 'Saving…' : 'Save Question'}
          </button>
        )}
      </div>
      {parseErrors.length > 0 && (
        <ul className="admin-validation-errors" role="alert">
          {parseErrors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}
      {preview && (
        <div className="admin-single-paste-preview" aria-label="Question preview">
          <h5>Preview</h5>
          <dl>
            {previewFields.map(([label, key]) => {
              const value = key.startsWith('option')
                ? questionPreview.options[key.charCodeAt(key.length - 1) - 65]
                : questionPreview[key]
              return (
                <div className="admin-single-paste-preview-row" key={key}>
                  <dt>{label}</dt>
                  <dd>{value || <span className="admin-single-paste-empty">Not provided</span>}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
      {saveError && <p className="admin-error" role="alert">{saveError}</p>}
      {successMessage && <p className="admin-success-banner" role="status">{successMessage}</p>}
    </section>
  )
}

export default SingleQuestionPaste
