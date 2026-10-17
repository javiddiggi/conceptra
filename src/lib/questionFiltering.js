export const examCategories = {
  Biology: ['NEET', 'Practice'],
  Physics: ['NEET', 'JEE Main', 'JEE Advanced', 'Practice'],
  Chemistry: ['NEET', 'JEE Main', 'JEE Advanced', 'Practice'],
}

export function getQuestionExamCategory(question) {
  if (typeof question.examCategory === 'string' && question.examCategory.trim()) {
    return question.examCategory.trim()
  }
  if (question.questionType?.trim().toLowerCase() === 'practice') return 'Practice'
  if (question.questionType?.trim().toLowerCase() === 'neet pyq') return 'NEET'
  if (question.questionType?.trim().toLowerCase() === 'jee main pyq') return 'JEE Main'
  if (question.questionType?.trim().toLowerCase() === 'jee advanced pyq') return 'JEE Advanced'
  return ''
}

export function getQuestionExamYear(question) {
  return String(question.examYear ?? question.neetYear ?? '').trim()
}

export function filterQuestionsByMode(questions, mode) {
  return questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => {
      const category = getQuestionExamCategory(question)
      return mode !== 'pyq' || Boolean(category && category !== 'Practice')
    })
}

export function filterQuestionsByExam(questions, examCategory) {
  return questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => examCategory === 'all'
      || getQuestionExamCategory(question) === examCategory)
}

export function sortQuestionsWithinTopics(groups) {
  return groups.map((group) => {
    const pyqs = group.questions
      .filter(({ question }) => getQuestionExamCategory(question) !== 'Practice'
        && getQuestionExamCategory(question))
      .sort((left, right) => {
        const leftYear = Number(getQuestionExamYear(left.question))
        const rightYear = Number(getQuestionExamYear(right.question))
        const leftHasYear = Number.isInteger(leftYear) && leftYear > 0
        const rightHasYear = Number.isInteger(rightYear) && rightYear > 0
        if (leftHasYear && rightHasYear && leftYear !== rightYear) return rightYear - leftYear
        if (leftHasYear !== rightHasYear) return leftHasYear ? -1 : 1
        return left.index - right.index
      })
    const practice = group.questions
      .filter(({ question }) => getQuestionExamCategory(question) === 'Practice')
      .sort((left, right) => left.index - right.index)
    const other = group.questions
      .filter(({ question }) => !getQuestionExamCategory(question))
      .sort((left, right) => left.index - right.index)
    return { ...group, questions: [...pyqs, ...other, ...practice], pyqCount: pyqs.length, otherCount: other.length }
  })
}
