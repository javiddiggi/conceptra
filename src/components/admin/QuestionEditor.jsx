import { useEffect, useRef, useState } from 'react'
import {
  assignMissingQuestionTopics,
  flattenQuestionGroups,
  groupQuestionsByTopic,
} from '../../lib/questionTopics.js'

const optionLabels = ['A', 'B', 'C', 'D']
const maxQuestionImageSize = 10 * 1024 * 1024
const questionImageTypes = ['image/png', 'image/jpeg', 'image/webp']

function QuestionEditor({ questions, onChange, onSaveQuestion, saving }) {
  const questionRefs = useRef(new Map())
  const imagePreviewUrls = useRef(new Map())
  const [pendingFocusId, setPendingFocusId] = useState(null)
  const [imageErrors, setImageErrors] = useState({})
  const [imagePreviews, setImagePreviews] = useState({})

  useEffect(() => {
    if (pendingFocusId === null) return
    const questionElement = questionRefs.current.get(pendingFocusId)
    if (!questionElement) return

    const topicInput = questionElement.querySelector('[data-question-topic]')
    topicInput?.scrollIntoView({ behavior: 'instant', block: 'center' })
    topicInput?.focus({ preventScroll: true })
    setPendingFocusId(null)
  }, [pendingFocusId, questions])

  useEffect(() => () => {
    imagePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function updateQuestion(index, field, value) {
    const updatedQuestions = questions.map((question, questionIndex) =>
      questionIndex === index
        ? {
          ...question,
          [field]: value,
          ...(field === 'questionType' && value === 'Practice' ? { neetYear: '' } : {}),
        }
        : question,
    )
    if (field === 'topic' && value.trim()) {
      onChange(flattenQuestionGroups(groupQuestionsByTopic(updatedQuestions)))
      return
    }
    onChange(updatedQuestions)
  }

  function updateQuestionImage(index, file) {
    const question = questions[index]
    const previousPreview = imagePreviewUrls.current.get(question.id)
    if (previousPreview) URL.revokeObjectURL(previousPreview)
    imagePreviewUrls.current.delete(question.id)
    if (file) imagePreviewUrls.current.set(question.id, URL.createObjectURL(file))
    setImagePreviews((previews) => {
      const nextPreviews = { ...previews }
      if (file) nextPreviews[question.id] = imagePreviewUrls.current.get(question.id)
      else delete nextPreviews[question.id]
      return nextPreviews
    })

    onChange(questions.map((item, questionIndex) =>
      questionIndex === index
        ? { ...item, imageFile: file, imageRemoved: false }
        : item,
    ))
  }

  function handleQuestionImageChange(index, event) {
    const file = event.target.files?.[0] || null
    if (file && !questionImageTypes.includes(file.type)) {
      setImageErrors((errors) => ({ ...errors, [questions[index].id]: 'Choose a PNG, JPG, JPEG, or WEBP image.' }))
      event.target.value = ''
      return
    }
    if (file && file.size > maxQuestionImageSize) {
      setImageErrors((errors) => ({ ...errors, [questions[index].id]: 'Choose an image no larger than 10 MB.' }))
      event.target.value = ''
      return
    }
    setImageErrors((errors) => ({ ...errors, [questions[index].id]: '' }))
    updateQuestionImage(index, file)
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

  function addQuestion(topicAbove = '', insertionIndex = questions.length) {
    const existingIds = new Set(questions.map((question) => String(question.id)))
    let id = questions.length + 1
    while (existingIds.has(String(id))) id += 1

    const orderedQuestions = flattenQuestionGroups(groupQuestionsByTopic(questions))
    const precedingTopic = orderedQuestions[insertionIndex - 1]?.topic?.trim()
    const newQuestion = {
      id,
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      questionType: 'NEET PYQ',
      topic: '',
      neetYear: '',
      isDraft: true,
      defaultTopic: precedingTopic || topicAbove || 'General',
    }
    orderedQuestions.splice(insertionIndex, 0, newQuestion)
    onChange(orderedQuestions)
    setPendingFocusId(id)
  }

  function removeQuestion(index) {
    const question = questions[index]
    const previewUrl = imagePreviewUrls.current.get(question.id)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    imagePreviewUrls.current.delete(question.id)
    setImagePreviews((previews) => {
      const nextPreviews = { ...previews }
      delete nextPreviews[question.id]
      return nextPreviews
    })
    onChange(questions.filter((_, questionIndex) => questionIndex !== index))
  }

  function renderAddQuestionButton(topicAbove = '', insertionIndex = questions.length) {
    return (
      <button className="admin-button admin-button-primary" type="button" onClick={() => addQuestion(topicAbove, insertionIndex)} disabled={saving}>
        + Add Question
      </button>
    )
  }

  const questionsWithTopics = assignMissingQuestionTopics(questions)
  const topicGroups = groupQuestionsByTopic(questionsWithTopics)
  const existingTopics = topicGroups.map((group) => group.topic)

  return (
    <section className="admin-form-section">
      <div className="admin-section-title admin-question-toolbar">
        <div>
          <span className="admin-field-eyebrow">CHAPTER QUESTIONS</span>
          <h3>Questions</h3>
          <span className="admin-question-count">{questions.length} {questions.length === 1 ? 'question' : 'questions'}</span>
        </div>
      </div>
      {questions.length === 0 && (
        <div className="admin-question-empty">
          <p className="admin-hint">No questions added yet.</p>
          {renderAddQuestionButton()}
        </div>
      )}
      <datalist id="admin-question-topic-options">
        {existingTopics.map((topic) => <option key={topic} value={topic} />)}
      </datalist>
      <div className="admin-question-list">
        {topicGroups.map((group, groupIndex) => {
          const insertionIndex = topicGroups
            .slice(0, groupIndex + 1)
            .reduce((count, topicGroup) => count + topicGroup.questions.length, 0)
          const hasTopicSection = group.questions.some(({ index }) =>
            !questions[index].isDraft || questions[index].topic?.trim(),
          )
          return (
          <section className="admin-question-topic-group" key={group.topicKey || 'untitled'}>
            {hasTopicSection && <h4 className="admin-question-topic-heading">{group.topic}</h4>}
            {group.questions.map(({ question, index }, topicIndex) => (
          <fieldset
            className="admin-question-editor"
            key={question.id}
            ref={(element) => {
              if (element) questionRefs.current.set(question.id, element)
              else questionRefs.current.delete(question.id)
            }}
          >
            <div className="admin-question-heading">
              <legend>Question {String(topicIndex + 1).padStart(2, '0')}</legend>
              <button className="admin-link-button admin-danger-link" type="button" onClick={() => removeQuestion(index)}>
                Remove Question
              </button>
            </div>
            <label className="admin-field admin-field-wide admin-topic-field">
              Topic
              <input
                data-question-topic
                list="admin-question-topic-options"
                value={questions[index].topic ?? ''}
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
            <div className="admin-field admin-field-wide question-image-field">
              <label htmlFor={`question-image-${question.id}`}>Question Image (Optional)</label>
              <input
                id={`question-image-${question.id}`}
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                onChange={(event) => handleQuestionImageChange(index, event)}
              />
              <span className="admin-hint">PNG, JPG, or WEBP · up to 10 MB.</span>
              {imageErrors[question.id] && <span className="admin-error" role="alert">{imageErrors[question.id]}</span>}
              {question.imageRemoved ? (
                <div className="question-image-preview-actions">
                  <span className="admin-hint">The attached image will be removed when you publish.</span>
                  {question.imageUrl && (
                    <button
                      className="admin-link-button"
                      type="button"
                      onClick={() => updateQuestion(index, 'imageRemoved', false)}
                    >
                      Keep existing image
                    </button>
                  )}
                </div>
              ) : (imagePreviews[question.id] || question.imageUrl) && (
                <div className="question-image-preview">
                  <img
                    src={imagePreviews[question.id] || question.imageUrl}
                    alt={`Preview for question ${index + 1}`}
                  />
                  <button
                    className="admin-link-button admin-danger-link"
                    type="button"
                    onClick={() => {
                      const previewUrl = imagePreviewUrls.current.get(question.id)
                      if (previewUrl) URL.revokeObjectURL(previewUrl)
                      imagePreviewUrls.current.delete(question.id)
                      setImagePreviews((previews) => {
                        const nextPreviews = { ...previews }
                        delete nextPreviews[question.id]
                        return nextPreviews
                      })
                      onChange(questions.map((item, questionIndex) =>
                        questionIndex === index
                          ? { ...item, imageFile: null, imageRemoved: true }
                          : item,
                      ))
                    }}
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>
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
            {hasTopicSection && groupIndex < topicGroups.length - 1
              && renderAddQuestionButton(group.topic, insertionIndex)}
          </section>
          )
        })}
      </div>
      {questions.length > 0 && renderAddQuestionButton(
        topicGroups[topicGroups.length - 1]?.topic || '',
        flattenQuestionGroups(topicGroups).length,
      )}
    </section>
  )
}

export default QuestionEditor
