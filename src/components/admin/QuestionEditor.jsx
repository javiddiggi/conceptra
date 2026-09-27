import { useEffect, useRef, useState } from 'react'

const optionLabels = ['A', 'B', 'C', 'D']

function QuestionEditor({ questions, onChange, onSaveQuestion, saving }) {
  const questionRefs = useRef(new Map())
  const [pendingFocusId, setPendingFocusId] = useState(null)

  useEffect(() => {
    if (pendingFocusId === null) return
    const questionElement = questionRefs.current.get(pendingFocusId)
    if (!questionElement) return

    const topicInput = questionElement.querySelector('[data-question-topic]')
    topicInput?.scrollIntoView({ behavior: 'instant', block: 'center' })
    topicInput?.focus({ preventScroll: true })
    setPendingFocusId(null)
  }, [pendingFocusId, questions])

  function updateQuestion(index, field, value) {
    onChange(questions.map((question, questionIndex) =>
      questionIndex === index
        ? {
          ...question,
          [field]: value,
          ...(field === 'questionType' && value === 'Practice' ? { neetYear: '' } : {}),
        }
        : question,
    ))
  }

  function updateOption(questionIndex, optionIndex, value) {
    const question = questions[questionIndex]
    const correctAnswer = question.correctAnswer ?? question.answer
    const previousValue = question.options[optionIndex]
    const options = question.options.map((option, index) =>
      index === optionIndex ? value : option,
    )
    onChange(questions.map((item, index) =>
      index === questionIndex
        ? { ...item, options, correctAnswer: correctAnswer && correctAnswer === previousValue ? value : correctAnswer }
        : item,
    ))
  }

  function addQuestion() {
    const existingIds = new Set(questions.map((question) => String(question.id)))
    let id = Date.now()
    while (existingIds.has(String(id))) id += 1

    onChange([
      ...questions,
      {
        id,
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        explanation: '',
        questionType: 'NEET PYQ',
        topic: '',
        neetYear: '',
      },
    ])
    setPendingFocusId(id)
  }

  function removeQuestion(index) {
    onChange(questions.filter((_, questionIndex) => questionIndex !== index))
  }

  function renderAddQuestionButton() {
    return (
      <button className="admin-button admin-button-primary" type="button" onClick={addQuestion} disabled={saving}>
        + Add Question
      </button>
    )
  }

  return (
    <section className="admin-form-section">
      <div className="admin-section-title admin-question-toolbar">
        <div>
          <span className="admin-field-eyebrow">CHAPTER QUESTIONS</span>
          <h3>Questions</h3>
          <span className="admin-question-count">{questions.length} {questions.length === 1 ? 'question' : 'questions'}</span>
        </div>
        {renderAddQuestionButton()}
      </div>
      {questions.length === 0 && <p className="admin-hint">No questions added yet.</p>}
      <div className="admin-question-list">
        {questions.map((question, index) => (
          <fieldset
            className="admin-question-editor"
            key={question.id}
            ref={(element) => {
              if (element) questionRefs.current.set(question.id, element)
              else questionRefs.current.delete(question.id)
            }}
          >
            <div className="admin-question-heading">
              <legend>Question {String(index + 1).padStart(2, '0')}</legend>
              <button className="admin-link-button admin-danger-link" type="button" onClick={() => removeQuestion(index)}>
                Remove Question
              </button>
            </div>
            <label className="admin-field admin-field-wide admin-topic-field">
              Topic
              <input
                data-question-topic
                value={question.topic ?? ''}
                onChange={(event) => updateQuestion(index, 'topic', event.target.value)}
                placeholder="e.g. Cell Structure, Chordata, Genetics"
              />
              <span className="admin-hint">Enter the specific Biology topic this question belongs to. Examples: Cell Structure, Cell Division, Chordata, Non-Chordata, Plant Kingdom, Genetics, Molecular Basis of Inheritance.</span>
            </label>
            <label className="admin-field admin-field-wide">
              Question
              <textarea
                rows="2"
                value={question.question}
                onChange={(event) => updateQuestion(index, 'question', event.target.value)}
                required
              />
            </label>
            <div className="admin-options-grid">
              {question.options.map((option, optionIndex) => (
                <label className="admin-field" key={optionLabels[optionIndex]}>
                  Option {optionLabels[optionIndex]}
                  <input
                    value={option}
                    onChange={(event) => updateOption(index, optionIndex, event.target.value)}
                    required
                  />
                </label>
              ))}
            </div>
            <label className="admin-field admin-field-wide">
              Correct Answer
              <select
                value={question.correctAnswer ?? question.answer ?? ''}
                onChange={(event) => updateQuestion(index, 'correctAnswer', event.target.value)}
                required
              >
                <option value="">Select the correct option</option>
                {question.options.map((option, optionIndex) => option && (
                  <option key={`${question.id}-${optionLabels[optionIndex]}`} value={option}>
                    {optionLabels[optionIndex]} — {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-question-meta-fields">
              <label className="admin-field">
                Question Type
                <select
                  value={question.questionType || 'NEET PYQ'}
                  onChange={(event) => updateQuestion(index, 'questionType', event.target.value)}
                >
                  <option value="NEET PYQ">NEET PYQ</option>
                  <option value="Practice">Practice</option>
                </select>
              </label>
              <label className="admin-field">
                NEET Year
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="Optional"
                  value={question.questionType === 'Practice' ? '' : question.neetYear ?? ''}
                  disabled={question.questionType === 'Practice'}
                  onChange={(event) => updateQuestion(index, 'neetYear', event.target.value)}
                />
              </label>
            </div>
            <span className="admin-hint admin-year-hint">Enter the original examination year only for verified NEET PYQs. Leave blank if unknown or for practice questions.</span>
            <label className="admin-field admin-field-wide admin-explanation-field">
              Explanation
              <textarea
                rows="4"
                value={question.explanation}
                onChange={(event) => updateQuestion(index, 'explanation', event.target.value)}
              />
            </label>
            <div className="admin-question-actions">
              <button className="admin-button admin-button-secondary" type="button" onClick={onSaveQuestion} disabled={saving}>
                {saving ? 'Saving…' : 'Save/Update Question'}
              </button>
              <span className="admin-hint">Saves by publishing the complete chapter with all current edits.</span>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="admin-question-add-bottom">
        {renderAddQuestionButton()}
      </div>
    </section>
  )
}

export default QuestionEditor
