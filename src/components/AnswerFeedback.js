import { createElement } from 'react'

function AnswerFeedback({ isCorrect, explanation, solutionImageUrl, questionNumber }) {
  return createElement(
    'div',
    {
      className: `answer-panel${isCorrect ? ' answer-panel-correct' : ' answer-panel-incorrect'}`,
      'aria-live': 'polite',
    },
    createElement('strong', { className: isCorrect ? 'answer-correct' : 'answer-incorrect' },
      isCorrect ? '✓ Correct' : '✗ Incorrect'),
    createElement(
      'div',
      { className: 'answer-explanation' },
      createElement('strong', null, 'Explanation:'),
      createElement('p', null, explanation || 'No explanation provided.'),
      solutionImageUrl && createElement(
        'div',
        { className: 'solution-image' },
        createElement('img', {
          src: solutionImageUrl,
          alt: `Solution explanation for question ${questionNumber}`,
          loading: 'lazy',
        }),
      ),
    ),
  )
}

export default AnswerFeedback
