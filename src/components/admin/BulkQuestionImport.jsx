import { useMemo, useState } from 'react'
import { parseBulkQuestions, validateBulkQuestions } from '../../lib/bulkQuestionParser.js'
import { examCategories } from '../../lib/questionFiltering.js'

const example = `Question: Which quantity is conserved in an isolated system?
A) Momentum
B) Temperature
C) Pressure
D) Density
Answer: A
Explanation: With no external force, total momentum remains constant.
Exam Category: NEET
Topic: Laws of Motion
Exam Year: 2020
Image URL:
Solution Image URL:

Question: What is the SI unit of force?
A) Joule
B) Newton
C) Watt
D) Pascal
Answer: B
Explanation: Force is measured in newtons in the SI system.
Exam Category: Practice
Topic: Laws of Motion
Exam Year:`

function BulkQuestionImport({ onImport, disabled, currentQuestionCount, subject = 'Biology' }) {
  const [open, setOpen] = useState(false)
  const [sourceText, setSourceText] = useState('')
  const [questions, setQuestions] = useState([])
  const [parseErrors, setParseErrors] = useState([])
  const [verifiedYears, setVerifiedYears] = useState({})
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)
  const validation = useMemo(() => validateBulkQuestions(questions, subject), [questions, subject])
  const errorsByQuestion = validation.map(({ index, errors }) => [
    index,
    [...errors, ...(questions[index]?.examCategory && questions[index]?.examCategory !== 'Practice' && !verifiedYears[index]
      ? ['Confirm that this exam year was checked against a trusted source.']
      : [])],
  ])
  const canImport = questions.length > 0
    && parseErrors.length === 0
    && errorsByQuestion.every(([, errors]) => errors.length === 0)
    && !disabled
    && !importing

  function parse() {
    const parsed = parseBulkQuestions(sourceText)
    setQuestions(parsed.questions)
    setParseErrors(parsed.errors)
    setVerifiedYears({})
    setImportError('')
  }

  function updateQuestion(index, changes) {
    const changedFields = new Set(Object.keys(changes).flatMap((changedField) => {
      if (changedField === 'correctAnswer') return ['answer']
      if (changedField === 'examCategory') return ['examCategory', 'questionType']
      if (changedField === 'examYear') return ['examYear']
      if (changedField === 'topic') return ['topic']
      if (changedField === 'question') return ['question']
      if (changedField === 'imageUrl') return ['imageUrl']
      if (changedField === 'solutionImageUrl') return ['solutionImageUrl']
      return []
    }))
    setQuestions((previous) => previous.map((question, questionIndex) =>
      questionIndex === index
        ? {
          ...question,
          ...changes,
          parseErrors: (question.parseErrors || []).filter(({ field }) => !changedFields.has(field)),
        }
        : question,
    ))
    if (Object.hasOwn(changes, 'examCategory')) {
      setVerifiedYears((previous) => ({ ...previous, [index]: false }))
      const category = changes.examCategory
      const questionType = category === 'Practice'
        ? 'Practice'
        : category === 'NEET'
          ? 'NEET PYQ'
          : category === 'JEE Main'
            ? 'JEE Main PYQ'
            : category === 'JEE Advanced'
              ? 'JEE Advanced PYQ'
              : ''
      setQuestions((previous) => previous.map((question, questionIndex) =>
        questionIndex === index ? { ...question, questionType } : question,
      ))
    }
    if (Object.hasOwn(changes, 'examYear')) {
      setVerifiedYears((previous) => ({ ...previous, [index]: false }))
    }
  }

  function confirmParsedField(index, field) {
    setQuestions((previous) => previous.map((question, questionIndex) =>
      questionIndex === index
        ? { ...question, parseErrors: (question.parseErrors || []).filter((issue) => issue.field !== field) }
        : question,
    ))
  }

  function updateOption(questionIndex, optionIndex, value) {
    setQuestions((previous) => previous.map((question, index) => {
      if (index !== questionIndex) return question
      const oldOption = question.options[optionIndex]
      const options = question.options.map((option, currentIndex) =>
        currentIndex === optionIndex ? value : option,
      )
      return {
        ...question,
        options,
        correctAnswer: question.correctAnswer === oldOption ? value : question.correctAnswer,
      }
    }))
  }

  async function importQuestions() {
    setImportError('')
    setImporting(true)
    try {
      const readyQuestions = questions.map((question) => {
        const savedQuestion = { ...question }
        delete savedQuestion.parseErrors
        return {
          ...savedQuestion,
          id: `bulk-${crypto.randomUUID()}`,
          ...(savedQuestion.questionType === 'Practice' ? { examYear: '' } : {}),
        }
      })
      await onImport(readyQuestions)
      setQuestions([])
      setSourceText('')
      setOpen(false)
    } catch (error) {
      setImportError(error.message || 'The questions could not be imported.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <button
        className="admin-button admin-button-secondary"
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
      >
        {open ? 'Close Bulk Paste' : 'Bulk Paste Questions'}
      </button>
      {open && (
        <section className="admin-bulk-import" aria-label="Bulk paste questions">
          <div className="admin-bulk-heading">
            <div>
              <h4>Bulk Paste Questions</h4>
              <p>Paste one labeled question block at a time. Nothing imports until every preview item passes validation.</p>
            </div>
            <span>{currentQuestionCount} currently in chapter</span>
          </div>
          <details className="admin-bulk-format">
            <summary>View paste format</summary>
            <pre>{example}</pre>
            <p>Use Question, A–D, Answer (letter or exact option), Explanation, Exam Category, Topic, Exam Year, and optional image URLs. Separate questions with a blank line.</p>
          </details>
          <label className="admin-field admin-field-wide">
            Paste question blocks
            <textarea
              rows="12"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder={example}
            />
          </label>
          <button className="admin-button admin-button-secondary" type="button" onClick={parse} disabled={!sourceText.trim()}>
            Parse Preview
          </button>
          {parseErrors.length > 0 && (
            <ul className="admin-bulk-errors" role="alert">
              {parseErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          )}
          {questions.length > 0 && (
            <>
              <div className="admin-bulk-year-warning">
                The parser cannot verify exam history. Check each exam year against a trusted source and confirm it below.
              </div>
              <div className="admin-bulk-preview">
                {questions.map((question, index) => {
                  const errors = errorsByQuestion[index]?.[1] || []
                  return (
                    <fieldset className="admin-bulk-question" key={question.id}>
                      <legend>Question {index + 1}</legend>
                      {errors.length > 0 && (
                        <ul className="admin-bulk-errors">
                          {errors.map((error) => {
                            const parseIssue = question.parseErrors?.find(({ message }) => message === error)
                            return (
                              <li key={error}>
                                {error}
                                {parseIssue && (
                                  <button
                                    className="admin-link-button"
                                    type="button"
                                    onClick={() => confirmParsedField(index, parseIssue.field)}
                                  >
                                    Confirm first parsed {parseIssue.field} value
                                  </button>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                      <label className="admin-field admin-field-wide">
                        Question
                        <textarea rows="3" value={question.question} onChange={(event) => updateQuestion(index, { question: event.target.value })} />
                      </label>
                      <div className="admin-options-grid">
                        {question.options.map((option, optionIndex) => (
                          <label className="admin-field" key={optionIndex}>
                            Option {String.fromCharCode(65 + optionIndex)}
                            <input value={option} onChange={(event) => updateOption(index, optionIndex, event.target.value)} />
                          </label>
                        ))}
                      </div>
                      <label className="admin-field">
                        Correct answer
                        <select value={question.correctAnswer} onChange={(event) => updateQuestion(index, { correctAnswer: event.target.value })}>
                          <option value="">Select correct answer</option>
                          {question.options.map((option, optionIndex) => option && (
                            <option key={optionIndex} value={option}>{String.fromCharCode(65 + optionIndex)} — {option}</option>
                          ))}
                        </select>
                      </label>
                      <div className="admin-question-meta-fields">
                        <label className="admin-field">
                          Exam category
                          <select value={question.examCategory} onChange={(event) => updateQuestion(index, { examCategory: event.target.value, examYear: event.target.value === 'Practice' ? '' : question.examYear })}>
                            <option value="">Select exam category</option>
                            {(examCategories[subject] || examCategories.Biology).map((category) => (
                              <option key={category}>{category}</option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-field">
                          Exam year
                          <input value={question.examYear} disabled={question.examCategory === 'Practice'} onChange={(event) => updateQuestion(index, { examYear: event.target.value })} />
                        </label>
                        <label className="admin-field">
                          Topic
                          <input value={question.topic} onChange={(event) => updateQuestion(index, { topic: event.target.value })} />
                        </label>
                      </div>
                      {question.examCategory && question.examCategory !== 'Practice' && (
                        <label className="admin-bulk-confirm-year">
                          <input
                            type="checkbox"
                            checked={Boolean(verifiedYears[index])}
                            onChange={(event) => setVerifiedYears((previous) => ({ ...previous, [index]: event.target.checked }))}
                          />
                          I verified the {question.examCategory} {question.examYear || 'year'} against a trusted source.
                        </label>
                      )}
                      <label className="admin-field admin-field-wide">
                        Explanation
                        <textarea rows="3" value={question.explanation} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} />
                      </label>
                      <label className="admin-field admin-field-wide">
                        Optional image URL
                        <input type="url" value={question.imageUrl} onChange={(event) => updateQuestion(index, { imageUrl: event.target.value })} />
                      </label>
                      <label className="admin-field admin-field-wide">
                        Optional solution image URL
                        <input type="url" value={question.solutionImageUrl} onChange={(event) => updateQuestion(index, { solutionImageUrl: event.target.value })} />
                      </label>
                    </fieldset>
                  )
                })}
              </div>
              {importError && <p className="admin-error" role="alert">{importError}</p>}
              <button className="admin-button admin-button-primary" type="button" onClick={importQuestions} disabled={!canImport}>
                {importing ? 'Importing…' : `Append ${questions.length} Questions`}
              </button>
            </>
          )}
        </section>
      )}
    </>
  )
}

export default BulkQuestionImport
