const fieldNames = {
  question: 'question',
  a: 'optionA',
  b: 'optionB',
  c: 'optionC',
  d: 'optionD',
  answer: 'answer',
  correctanswer: 'answer',
  explanation: 'explanation',
  type: 'questionType',
  questiontype: 'questionType',
  exam: 'examCategory',
  examtype: 'examCategory',
  examcategory: 'examCategory',
  topic: 'topic',
  year: 'examYear',
  examyear: 'examYear',
  neetyear: 'examYear',
  image: 'imageUrl',
  imageurl: 'imageUrl',
  solutionimage: 'solutionImageUrl',
  solutionimageurl: 'solutionImageUrl',
}

const scalarFieldLabels = {
  question: 'Question',
  answer: 'Answer',
  questionType: 'Question Type',
  examCategory: 'Exam Category',
  examYear: 'Exam Year',
  topic: 'Topic',
  imageUrl: 'Image URL',
  solutionImageUrl: 'Solution Image URL',
}
const scalarFields = new Set(Object.keys(scalarFieldLabels))

function normalizeField(label) {
  return label.toLowerCase().replace(/[^a-z]/g, '')
}

function isQuestionStart(line) {
  return /^(?:question\s*\d*\s*:|q\s*\d+\s*[:.)-])/i.test(line.trim())
}

export function parseBulkQuestions(text) {
  const questions = []
  const errors = []
  let current = null
  let activeField = ''

  const finishQuestion = () => {
    if (!current) return
    delete current._scalarValues
    const answer = current.answer.trim()
    const optionByLabel = {
      A: current.optionA,
      B: current.optionB,
      C: current.optionC,
      D: current.optionD,
    }
    const answerLetter = answer.match(/^([A-D])(?:[).:\s]|$)/i)?.[1]?.toUpperCase()
    current.correctAnswer = answerLetter ? optionByLabel[answerLetter] : answer
    delete current.answer
    delete current.optionA
    delete current.optionB
    delete current.optionC
    delete current.optionD
    current.options = [optionByLabel.A, optionByLabel.B, optionByLabel.C, optionByLabel.D]
    current.id = `bulk-${questions.length + 1}`
    const questionType = current.questionType.trim()
    const normalizedType = questionType.toLowerCase()
    const category = current.examCategory.trim()
    current.examCategory = category || (
      normalizedType === 'practice' ? 'Practice'
        : normalizedType === 'neet pyq' ? 'NEET'
          : normalizedType === 'jee main pyq' ? 'JEE Main'
            : normalizedType === 'jee advanced pyq' ? 'JEE Advanced'
              : ''
    )
    current.questionType = current.examCategory === 'Practice'
      ? 'Practice'
      : current.examCategory === 'NEET'
        ? 'NEET PYQ'
        : current.examCategory === 'JEE Main'
          ? 'JEE Main PYQ'
          : current.examCategory === 'JEE Advanced'
            ? 'JEE Advanced PYQ'
            : questionType
    current.topic = current.topic.trim()
    current.examYear = current.examYear.trim()
    current.imageUrl = current.imageUrl.trim()
    current.solutionImageUrl = current.solutionImageUrl.trim()
    questions.push(current)
    current = null
    activeField = ''
  }

  for (const [lineIndex, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line) {
      if (current && current.question && current.options?.every(Boolean)) finishQuestion()
      activeField = ''
      continue
    }
    if (isQuestionStart(line)) {
      finishQuestion()
      current = {
        question: line.replace(/^(?:question\s*\d*\s*:|q\s*\d+\s*[:.)-])\s*/i, ''),
        optionA: '', optionB: '', optionC: '', optionD: '',
        answer: '', explanation: '', questionType: '', topic: '', examYear: '', imageUrl: '',
        examCategory: '', solutionImageUrl: '', parseErrors: [],
        _scalarValues: { question: line.replace(/^(?:question\s*\d*\s*:|q\s*\d+\s*[:.)-])\s*/i, '') },
      }
      activeField = 'question'
      continue
    }
    if (!current) {
      errors.push(`Line ${lineIndex + 1}: content appears before the first Question: line.`)
      continue
    }

    const optionMatch = line.match(/^([A-D])\s*[).:-]\s*(.*)$/i)
    if (optionMatch) {
      const key = `option${optionMatch[1].toUpperCase()}`
      if (current[key]) errors.push(`Question ${questions.length + 1}: option ${optionMatch[1].toUpperCase()} is repeated.`)
      current[key] = optionMatch[2].trim()
      activeField = key
      continue
    }

    const fieldMatch = line.match(/^([A-Za-z ]+?)\s*:\s*(.*)$/)
    if (fieldMatch) {
      const key = fieldNames[normalizeField(fieldMatch[1])]
      if (key) {
        const value = fieldMatch[2].trim()
        if (scalarFields.has(key) && Object.hasOwn(current._scalarValues, key)) {
          const previousValue = current._scalarValues[key]
          const sameValue = previousValue === value
          const fieldLabel = scalarFieldLabels[key]
          current.parseErrors.push({
            field: key,
            message: `Question ${questions.length + 1}: ${fieldLabel} is repeated with ${sameValue ? 'the same value' : `conflicting values (“${previousValue}” and “${value}”)`}. Review the value in the preview and confirm which value to import.`,
          })
        } else {
          current[key] = value
          if (scalarFields.has(key)) current._scalarValues[key] = value
        }
        activeField = key
        continue
      }
    }

    if (activeField) current[activeField] = `${current[activeField]}${current[activeField] ? '\n' : ''}${line}`
    else errors.push(`Line ${lineIndex + 1}: could not determine which question field this belongs to.`)
  }
  finishQuestion()

  if (!questions.length && text.trim()) errors.push('No questions found. Start each block with “Question:”.')
  return { questions, errors }
}

export function validateBulkQuestions(questions, subject = 'Biology') {
  const allowedCategories = {
    Biology: ['NEET', 'Practice'],
    Physics: ['NEET', 'JEE Main', 'JEE Advanced', 'Practice'],
    Chemistry: ['NEET', 'JEE Main', 'JEE Advanced', 'Practice'],
  }[subject] || []
  return questions.map((question, index) => {
    const errors = (question.parseErrors || []).map(({ message }) => message)
    if (!question.question.trim()) errors.push('Question text is required.')
    if (question.options.length !== 4 || question.options.some((option) => !option.trim())) {
      errors.push('All four options are required.')
    }
    if (question.options.filter(Boolean).length !== new Set(question.options.filter(Boolean)).size) {
      errors.push('Options must be unique.')
    }
    if (!question.correctAnswer || !question.options.includes(question.correctAnswer)) {
      errors.push('Select a correct answer that matches one option.')
    }
    if (!allowedCategories.includes(question.examCategory)) errors.push(`Choose an exam category for ${subject}.`)
    if (!question.topic.trim()) errors.push('Topic is required.')
    if (!question.explanation.trim()) errors.push('Explanation is required.')
    if (question.examCategory !== 'Practice' && question.examCategory && !/^\d{4}$/.test(question.examYear.trim())) {
      errors.push('Enter the verified four-digit exam year.')
    }
    if (question.examCategory === 'Practice' && question.examYear.trim()) {
      errors.push('Practice questions cannot have an exam year.')
    }
    if (question.imageUrl && !/^https:\/\/\S+$/i.test(question.imageUrl)) {
      errors.push('Image URL must be a valid HTTPS URL.')
    }
    if (question.solutionImageUrl && !/^https:\/\/\S+$/i.test(question.solutionImageUrl)) {
      errors.push('Solution image URL must be a valid HTTPS URL.')
    }
    return { index, errors }
  })
}
