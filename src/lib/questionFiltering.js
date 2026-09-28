export function filterQuestionsByMode(questions, mode) {
  return questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) =>
      mode !== 'pyq'
      || (typeof question.questionType === 'string'
        && question.questionType.trim().toLowerCase() === 'neet pyq'),
    )
}
