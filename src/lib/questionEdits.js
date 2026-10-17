import { examCategories, getQuestionExamCategory, getQuestionExamYear } from './questionFiltering.js'

export function validateQuestionEdit(question, subject) {
  const errors = []
  const allowedCategories = examCategories[subject] || []
  const category = getQuestionExamCategory(question)
  const year = getQuestionExamYear(question)

  if (!question.question?.trim()) errors.push('Question text is required.')
  if (!Array.isArray(question.options) || question.options.length !== 4
    || question.options.some((option) => typeof option !== 'string' || !option.trim())) {
    errors.push('All four options are required.')
  } else if (new Set(question.options.map((option) => option.trim())).size !== 4) {
    errors.push('Options must be unique.')
  }
  if (!question.correctAnswer || !question.options?.includes(question.correctAnswer)) {
    errors.push('Select a correct answer that matches one option.')
  }
  if (!question.explanation?.trim()) errors.push('Explanation is required.')
  if (!question.topic?.trim()) errors.push('Topic is required.')
  if (!allowedCategories.includes(category)) errors.push(`Choose a valid exam category for ${subject}.`)
  if (category === 'Practice' && year) errors.push('Practice questions cannot have an exam year.')
  if (category && category !== 'Practice' && year && !/^\d{4}$/.test(year)) {
    errors.push('Exam year must be a four-digit year or blank if unknown.')
  }
  return errors
}

export function replaceExistingQuestion(questions, questionId, baselineQuestion, editedQuestion) {
  const questionIndex = questions.findIndex((question) => String(question.id) === String(questionId))
  if (questionIndex === -1) throw new Error('This question no longer exists. Refresh the chapter and try again.')
  const currentQuestion = questions[questionIndex]
  if (String(baselineQuestion.id) !== String(questionId)
    || String(editedQuestion.id) !== String(questionId)) {
    throw new Error('The edited question identity changed. Cancel the edit and try again.')
  }
  if (JSON.stringify(currentQuestion) !== JSON.stringify(baselineQuestion)) {
    throw new Error('This question changed after editing began. Cancel the edit and reopen the latest version.')
  }

  const updatedQuestions = [...questions]
  updatedQuestions[questionIndex] = {
    ...currentQuestion,
    ...editedQuestion,
    id: currentQuestion.id,
  }
  return updatedQuestions
}
