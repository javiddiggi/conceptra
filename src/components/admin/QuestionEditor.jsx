import { useEffect, useRef, useState } from 'react'
import {
  assignMissingQuestionTopics,
  createQuestionDraft,
  flattenQuestionGroups,
  groupQuestionsByTopic,
  updateQuestionTopic,
} from '../../lib/questionTopics.js'
import { examCategories, getQuestionExamCategory, getQuestionExamYear } from '../../lib/questionFiltering.js'
import { validateQuestionEdit } from '../../lib/questionEdits.js'

const optionLabels = ['A', 'B', 'C', 'D']
const maxQuestionImageSize = 10 * 1024 * 1024
const questionImageTypes = ['image/png', 'image/jpeg', 'image/webp']

function orderQuestionsByTopic(questions) {
  return groupQuestionsByTopic(questions)
    .flatMap((group) => group.questions.map(({ index }) => questions[index]))
}

function QuestionEditor({
  questions,
  onChange,
  onSaveQuestion,
  onSaveExistingQuestion,
  saving,
  subject = 'Biology',
  pasteOpen,
  onTogglePaste,
  defaultTopic,
  onDefaultTopicChange,
  children,
}) {
  const questionRefs = useRef(new Map())
  const imagePreviewUrls = useRef(new Map())
  const [pendingFocusId, setPendingFocusId] = useState(null)
  const [imageErrors, setImageErrors] = useState({})
  const [imagePreviews, setImagePreviews] = useState({})
  const [topicInputValues, setTopicInputValues] = useState({})
  const solutionPreviewUrls = useRef(new Map())
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [editErrors, setEditErrors] = useState([])

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
    solutionPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function updateQuestion(index, field, value) {
    const target = questions[index]
    const isEditingSavedQuestion = !target.isDraft && String(target.id) === editingQuestionId
    const update = (question) => ({
      ...question,
      [field]: value,
      ...(field === 'correctAnswer' && Object.hasOwn(question, 'answer') ? { answer: value } : {}),
      ...(field === 'examYear' && Object.hasOwn(question, 'neetYear') ? { neetYear: value } : {}),
      ...(field === 'examCategory'
        ? {
          questionType: value === 'Practice' ? 'Practice'
            : value === 'NEET' ? 'NEET PYQ'
              : value === 'JEE Main' ? 'JEE Main PYQ'
                : value === 'JEE Advanced' ? 'JEE Advanced PYQ' : '',
          ...(value === 'Practice' ? { examYear: '', neetYear: '' } : {}),
        }
        : {}),
    })
    if (isEditingSavedQuestion) {
      setEditingQuestion((question) => update(question))
      if (field === 'topic') onDefaultTopicChange(value.trim())
      setEditErrors([])
      return
    }
    if (!target.isDraft) return
    const updatedQuestions = field === 'topic'
      ? updateQuestionTopic(questions, target.id, value)
      : questions.map((question, questionIndex) =>
        questionIndex === index ? update(question) : question,
      )
    if (field === 'topic') onDefaultTopicChange(value.trim())
    onChange(updatedQuestions)
  }

  function updateQuestionData(index, update) {
    const target = questions[index]
    if (target.isDraft) {
      onChange(questions.map((question, questionIndex) =>
        questionIndex === index ? update(question) : question,
      ))
      return
    }
    if (String(target.id) === editingQuestionId) {
      setEditingQuestion((question) => update(question))
    }
  }

  function startEditing(question) {
    setEditingQuestionId(String(question.id))
    setEditingQuestion({ ...question })
    setEditErrors([])
  }

  function clearEditingPreviews(questionId) {
    const key = String(questionId)
    const imagePreview = imagePreviewUrls.current.get(questionId)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    imagePreviewUrls.current.delete(questionId)
    const solutionPreview = solutionPreviewUrls.current.get(key)
    if (solutionPreview) URL.revokeObjectURL(solutionPreview)
    solutionPreviewUrls.current.delete(key)
    setImagePreviews((previews) => {
      const nextPreviews = { ...previews }
      delete nextPreviews[questionId]
      delete nextPreviews[`${key}-solution`]
      return nextPreviews
    })
  }

  function cancelEditing(question) {
    if (!question.isDraft) {
      setTopicInputValues((values) => {
        const nextValues = { ...values }
        delete nextValues[question.id]
        return nextValues
      })
      clearEditingPreviews(question.id)
      setEditingQuestionId(null)
      setEditingQuestion(null)
      setEditErrors([])
      setImageErrors((errors) => {
        const nextErrors = { ...errors }
        delete nextErrors[question.id]
        delete nextErrors[`${question.id}-solution`]
        return nextErrors
      })
      return
    }
    removeQuestion(questions.findIndex((item) => item.id === question.id))
  }

  async function saveExistingQuestion(question) {
    const errors = validateQuestionEdit(editingQuestion, subject)
    if (errors.length) {
      setEditErrors(errors)
      return
    }
    setEditErrors([])
    try {
      await onSaveExistingQuestion(question.id, editingQuestion)
      clearEditingPreviews(question.id)
      setImageErrors((errors) => {
        const nextErrors = { ...errors }
        delete nextErrors[question.id]
        delete nextErrors[`${question.id}-solution`]
        return nextErrors
      })
      setEditingQuestionId(null)
      setEditingQuestion(null)
    } catch (error) {
      setEditErrors([error.message || 'Question changes could not be saved.'])
    }
  }

  function updateSolutionImage(index, file) {
    const question = questions[index]
    const key = String(question.id)
    const previousPreview = solutionPreviewUrls.current.get(key)
    if (previousPreview) URL.revokeObjectURL(previousPreview)
    solutionPreviewUrls.current.delete(key)
    const nextPreview = file ? URL.createObjectURL(file) : ''
    if (nextPreview) solutionPreviewUrls.current.set(key, nextPreview)
    const previewKey = `${key}-solution`
    setImagePreviews((previews) => {
      const nextPreviews = { ...previews }
      if (nextPreview) nextPreviews[previewKey] = nextPreview
      else delete nextPreviews[previewKey]
      return nextPreviews
    })
    updateQuestionData(index, (item) => ({ ...item, solutionImageFile: file, solutionImageRemoved: false }))
  }

  function handleSolutionImageChange(index, event) {
    const file = event.target.files?.[0] || null
    const errorKey = `${questions[index].id}-solution`
    if (file && !questionImageTypes.includes(file.type)) {
      setImageErrors((errors) => ({ ...errors, [errorKey]: 'Choose a PNG, JPG, JPEG, or WEBP image.' }))
      event.target.value = ''
      return
    }
    if (file && file.size > maxQuestionImageSize) {
      setImageErrors((errors) => ({ ...errors, [errorKey]: 'Choose an image no larger than 10 MB.' }))
      event.target.value = ''
      return
    }
    setImageErrors((errors) => ({ ...errors, [errorKey]: '' }))
    updateSolutionImage(index, file)
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

    updateQuestionData(index, (item) => ({ ...item, imageFile: file, imageRemoved: false }))
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
    const originalQuestion = questions[questionIndex]
    const question = !originalQuestion.isDraft && String(originalQuestion.id) === editingQuestionId
      ? editingQuestion
      : originalQuestion
    if (!originalQuestion.isDraft && String(originalQuestion.id) !== editingQuestionId) return
    const correctAnswer = question.correctAnswer ?? question.answer
    const previousValue = question.options[optionIndex]
    const options = question.options.map((option, index) =>
      index === optionIndex ? value : option,
    )
    const nextAnswer = correctAnswer && correctAnswer === previousValue ? value : correctAnswer
    updateQuestionData(questionIndex, (item) => ({
      ...item,
      options,
      correctAnswer: nextAnswer,
      ...(Object.hasOwn(item, 'answer') ? { answer: nextAnswer } : {}),
    }))
  }

  function addQuestion(topicAbove = '', insertionIndex = questions.length) {
    const existingIds = new Set(questions.map((question) => String(question.id)))
    let id = questions.length + 1
    while (existingIds.has(String(id))) id += 1

    const orderedQuestions = orderQuestionsByTopic(questions)
    const precedingTopic = orderedQuestions[insertionIndex - 1]?.topic?.trim()
    const newQuestion = createQuestionDraft(
      id,
      topicAbove || defaultTopic || precedingTopic,
    )
    orderedQuestions.splice(insertionIndex, 0, newQuestion)
    onChange(orderedQuestions)
    setPendingFocusId(id)
  }

  function removeQuestion(index) {
    const question = questions[index]
    setTopicInputValues((values) => {
      const nextValues = { ...values }
      delete nextValues[question.id]
      return nextValues
    })
    const previewUrl = imagePreviewUrls.current.get(question.id)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    imagePreviewUrls.current.delete(question.id)
    const solutionPreview = solutionPreviewUrls.current.get(String(question.id))
    if (solutionPreview) URL.revokeObjectURL(solutionPreview)
    solutionPreviewUrls.current.delete(String(question.id))
    setImagePreviews((previews) => {
      const nextPreviews = { ...previews }
      delete nextPreviews[question.id]
      delete nextPreviews[`${question.id}-solution`]
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
        {renderAddQuestionButton()}
      </div>
      {questions.length === 0 && (
        <div className="admin-question-empty">
          <p className="admin-hint">No questions added yet.</p>
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
            {group.questions.map(({ question, index }, topicIndex) => {
          const isEditing = question.isDraft || String(question.id) === editingQuestionId
          const values = question.isDraft || !isEditing ? question : editingQuestion
          return (
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
              {question.isDraft ? (
                <>
                  <button className="admin-link-button admin-danger-link" type="button" onClick={() => removeQuestion(index)}>
                    Remove Question
                  </button>
                  <button className="admin-button admin-button-secondary" type="button" onClick={() => cancelEditing(question)}>
                    Cancel
                  </button>
                </>
              ) : isEditing ? (
                <>
                  <button className="admin-button admin-button-primary" type="button" onClick={() => saveExistingQuestion(question)} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button className="admin-button admin-button-secondary" type="button" onClick={() => cancelEditing(question)} disabled={saving}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="admin-button admin-button-secondary" type="button" onClick={() => startEditing(questions[index])} disabled={saving || editingQuestionId !== null}>
                    Edit
                  </button>
                  <button className="admin-link-button admin-danger-link" type="button" onClick={() => removeQuestion(index)}>
                    Remove Question
                  </button>
                </>
              )}
            </div>
            {isEditing && editErrors.length > 0 && (
              <ul className="admin-validation-errors" role="alert">
                {editErrors.map((message) => <li key={message}>{message}</li>)}
              </ul>
            )}
            <label className="admin-field admin-field-wide admin-topic-field">
              Topic
              <input
                data-question-topic
                list="admin-question-topic-options"
                value={topicInputValues[question.id] ?? values.topic ?? ''}
                onChange={(event) => {
                  setTopicInputValues((current) => ({ ...current, [question.id]: event.target.value }))
                  onDefaultTopicChange(event.target.value.trim())
                }}
                onBlur={(event) => {
                  updateQuestion(index, 'topic', event.target.value)
                  setTopicInputValues((current) => {
                    const nextValues = { ...current }
                    delete nextValues[question.id]
                    return nextValues
                  })
                }}
                disabled={!isEditing}
                placeholder="e.g. Cell Structure, Chordata, Genetics"
              />
              <span className="admin-hint">Enter the specific Biology topic this question belongs to. Examples: Cell Structure, Cell Division, Chordata, Non-Chordata, Plant Kingdom, Genetics, Molecular Basis of Inheritance.</span>
            </label>
            <label className="admin-field admin-field-wide">
              Question
              <textarea
                rows="2"
                value={values.question}
                onChange={(event) => updateQuestion(index, 'question', event.target.value)}
                disabled={!isEditing}
                required
              />
            </label>
            <div className="admin-field admin-field-wide question-image-field">
              <label htmlFor={`question-image-${question.id}`}>Question Image (Optional)</label>
              {isEditing && <input
                id={`question-image-${question.id}`}
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                onChange={(event) => handleQuestionImageChange(index, event)}
              />}
              <span className="admin-hint">PNG, JPG, or WEBP · up to 10 MB.</span>
              {imageErrors[question.id] && <span className="admin-error" role="alert">{imageErrors[question.id]}</span>}
              {values.imageRemoved ? (
                <div className="question-image-preview-actions">
                  <span className="admin-hint">The attached image will be removed when you save changes.</span>
                  {isEditing && values.imageUrl && (
                    <button
                      className="admin-link-button"
                      type="button"
                      onClick={() => updateQuestion(index, 'imageRemoved', false)}
                    >
                      Keep existing image
                    </button>
                  )}
                </div>
              ) : (imagePreviews[question.id] || values.imageUrl) && (
                <div className="question-image-preview">
                  <img
                    src={imagePreviews[question.id] || values.imageUrl}
                    alt={`Preview for question ${index + 1}`}
                  />
                  {isEditing && <button
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
                      updateQuestionData(index, (item) => ({ ...item, imageFile: null, imageRemoved: true }))
                    }}
                  >
                    Remove image
                  </button>}
                </div>
              )}
            </div>
            <div className="admin-options-grid">
              {values.options.map((option, optionIndex) => (
                <label className="admin-field" key={optionLabels[optionIndex]}>
                  Option {optionLabels[optionIndex]}
                  <input
                    value={option}
                    onChange={(event) => updateOption(index, optionIndex, event.target.value)}
                    disabled={!isEditing}
                    required
                  />
                </label>
              ))}
            </div>
            <label className="admin-field admin-field-wide">
              Correct Answer
              <select
                value={values.correctAnswer ?? values.answer ?? ''}
                onChange={(event) => updateQuestion(index, 'correctAnswer', event.target.value)}
                disabled={!isEditing}
                required
              >
                <option value="">Select the correct option</option>
                {values.options.map((option, optionIndex) => option && (
                  <option key={`${question.id}-${optionLabels[optionIndex]}`} value={option}>
                    {optionLabels[optionIndex]} — {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-question-meta-fields">
              <label className="admin-field">
                Exam Category
                <select
                  value={getQuestionExamCategory(values)}
                  onChange={(event) => updateQuestion(index, 'examCategory', event.target.value)}
                  disabled={!isEditing}
                >
                  <option value="">Select exam category</option>
                  {(examCategories[subject] || examCategories.Biology).map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                Exam Year
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="Optional"
                  value={getQuestionExamCategory(values) === 'Practice' ? '' : getQuestionExamYear(values)}
                  disabled={!isEditing || getQuestionExamCategory(values) === 'Practice'}
                  onChange={(event) => updateQuestion(index, 'examYear', event.target.value)}
                />
              </label>
            </div>
            <span className="admin-hint admin-year-hint">Enter the original year only for a verified exam PYQ. Leave blank if unknown or for practice questions.</span>
            <div className="admin-field admin-field-wide question-image-field">
              <label htmlFor={`solution-image-${question.id}`}>Solution / Explanation Image (Optional)</label>
              {isEditing && <input
                id={`solution-image-${question.id}`}
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                onChange={(event) => handleSolutionImageChange(index, event)}
              />}
              <span className="admin-hint">Separate from the question diagram · PNG, JPG, or WEBP · up to 10 MB.</span>
              {imageErrors[`${question.id}-solution`] && <span className="admin-error" role="alert">{imageErrors[`${question.id}-solution`]}</span>}
              {values.solutionImageRemoved ? (
                <div className="question-image-preview-actions">
                  <span className="admin-hint">The solution image will be removed when you save changes.</span>
                  {isEditing && values.solutionImageUrl && (
                    <button className="admin-link-button" type="button" onClick={() => updateQuestion(index, 'solutionImageRemoved', false)}>
                      Keep existing image
                    </button>
                  )}
                </div>
              ) : (imagePreviews[`${question.id}-solution`] || values.solutionImageUrl) && (
                <div className="question-image-preview">
                  <img
                    src={imagePreviews[`${question.id}-solution`] || values.solutionImageUrl}
                    alt={`Solution image preview for question ${index + 1}`}
                  />
                  {isEditing && <button
                    className="admin-link-button admin-danger-link"
                    type="button"
                    onClick={() => {
                      const key = String(question.id)
                      const previewUrl = solutionPreviewUrls.current.get(key)
                      if (previewUrl) URL.revokeObjectURL(previewUrl)
                      solutionPreviewUrls.current.delete(key)
                      setImagePreviews((previews) => {
                        const nextPreviews = { ...previews }
                        delete nextPreviews[`${key}-solution`]
                        return nextPreviews
                      })
                      updateQuestionData(index, (item) => ({ ...item, solutionImageFile: null, solutionImageRemoved: true }))
                    }}
                  >
                    Remove solution image
                  </button>}
                </div>
              )}
            </div>
            <label className="admin-field admin-field-wide admin-explanation-field">
              Explanation
              <textarea
                rows="4"
                value={values.explanation}
                onChange={(event) => updateQuestion(index, 'explanation', event.target.value)}
                disabled={!isEditing}
              />
            </label>
            {question.isDraft && <div className="admin-question-actions">
              <button className="admin-button admin-button-secondary" type="button" onClick={onSaveQuestion} disabled={saving}>
                {saving ? 'Saving…' : 'Save/Update Question'}
              </button>
              <span className="admin-hint">Saves by publishing the complete chapter with all current edits.</span>
            </div>}
          </fieldset>
          )
            })}
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
      {children}
      <div className="admin-question-bottom-actions">
        <button
          className="admin-button admin-button-secondary"
          type="button"
          onClick={onTogglePaste}
          disabled={saving}
          aria-expanded={pasteOpen}
        >
          Paste One Question
        </button>
      </div>
    </section>
  )
}

export default QuestionEditor
