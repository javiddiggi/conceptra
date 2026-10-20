import { examCategories } from './questionFiltering.js'

const fieldNames = {
  question: 'question',
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

const optionLabels = ['A', 'B', 'C', 'D']

function normalizeField(label) {
  return label.toLowerCase().replace(/[^a-z]/g, '')
}

function isQuestionStart(line) {
  return /^(?:question\s*\d*\s*:|q\s*\d+\s*[:.)-])/i.test(line.trim())
}

function normalizeCategory(value) {
  const category = value.trim()
  const normalized = category.toLowerCase()
  if (normalized === 'neet pyq') return 'NEET'
  if (normalized === 'jee main pyq') return 'JEE Main'
  if (normalized === 'jee advanced pyq') return 'JEE Advanced'
  return category
}

function questionTypeForCategory(category) {
  if (category === 'Practice') return 'Practice'
  if (category === 'NEET') return 'NEET PYQ'
  if (category === 'JEE Main') return 'JEE Main PYQ'
  if (category === 'JEE Advanced') return 'JEE Advanced PYQ'
  return ''
}

export function parseSingleQuestion(text, subject = 'Biology') {
  const errors = []
  const questionStarts = []
  const parsed = {
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    questionType: '',
    examCategory: '',
    examYear: '',
    topic: '',
    imageUrl: '',
    solutionImageUrl: '',
  }
  const seenFields = new Set()
  const seenOptions = new Set()
  let activeField = ''

  for (const [lineIndex, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line) continue

    if (isQuestionStart(line)) {
      questionStarts.push(lineIndex + 1)
      if (questionStarts.length > 1) continue
      parsed.question = line.replace(/^(?:question\s*\d*\s*:|q\s*\d+\s*[:.)-])\s*/i, '')
      activeField = 'question'
      continue
    }

    if (questionStarts.length > 1) continue

    const optionMatch = line.match(/^([A-D])\s*[).:-]\s*(.*)$/i)
    if (optionMatch) {
      const label = optionMatch[1].toUpperCase()
      const index = optionLabels.indexOf(label)
      if (seenOptions.has(label)) {
        errors.push(`Option ${label} is repeated.`)
      } else {
        parsed.options[index] = optionMatch[2].trim()
        seenOptions.add(label)
      }
      activeField = `option${index}`
      continue
    }

    const fieldMatch = line.match(/^([A-Za-z ]+?)\s*:\s*(.*)$/)
    if (fieldMatch) {
      const field = fieldNames[normalizeField(fieldMatch[1])]
      if (!field) {
        errors.push(`Line ${lineIndex + 1}: “${fieldMatch[1].trim()}” is not a recognized question label.`)
        activeField = ''
        continue
      }
      if (seenFields.has(field)) {
        errors.push(`${field === 'answer' ? 'Correct Answer' : field} is labeled more than once.`)
        activeField = ''
        continue
      }
      seenFields.add(field)
      parsed[field] = fieldMatch[2].trim()
      activeField = field
      continue
    }

    const optionContinuation = activeField.startsWith('option')
    if (activeField && optionContinuation) {
      const index = Number(activeField.slice('option'.length))
      parsed.options[index] = `${parsed.options[index]}${parsed.options[index] ? '\n' : ''}${line}`
    } else if (activeField) {
      parsed[activeField] = `${parsed[activeField]}${parsed[activeField] ? '\n' : ''}${line}`
    } else {
      errors.push(`Line ${lineIndex + 1}: could not determine which question field this belongs to.`)
    }
  }

  if (questionStarts.length > 1) {
    errors.push('Paste exactly one question. More than one Question: block was found.')
  } else if (!questionStarts.length) {
    errors.push('No question found. Start the paste with “Question:”.')
  }

  parsed.question = parsed.question.trim()
  parsed.options = parsed.options.map((option) => option.trim())
  parsed.explanation = parsed.explanation.trim()
  parsed.questionType = parsed.questionType.trim()
  parsed.topic = parsed.topic.trim()
  parsed.examYear = parsed.examYear.trim()
  parsed.imageUrl = parsed.imageUrl.trim()
  parsed.solutionImageUrl = parsed.solutionImageUrl.trim()
  parsed.examCategory = normalizeCategory(parsed.examCategory)

  if (!parsed.question) errors.push('Question text is required.')
  if (parsed.options.some((option) => !option)) errors.push('All four options (A–D) are required.')
  if (parsed.options.filter(Boolean).length !== new Set(parsed.options.filter(Boolean)).size) {
    errors.push('Options must be unique.')
  }

  const answer = parsed.answer?.trim() || ''
  delete parsed.answer
  const answerLabel = answer.match(/^([A-D])(?:[).:\s]|$)/i)?.[1]?.toUpperCase()
  if (/^(?:[A-D](?:\s*(?:,|and|&)\s*[A-D])+)\b/i.test(answer)) {
    errors.push('This question has multiple correct answers, but the current question format supports one correct answer only.')
  } else if (answerLabel) {
    parsed.correctAnswer = parsed.options[optionLabels.indexOf(answerLabel)]
  } else if (parsed.options.includes(answer)) {
    parsed.correctAnswer = answer
  }
  if (!parsed.correctAnswer || !parsed.options.includes(parsed.correctAnswer)) {
    errors.push('Correct Answer must identify one of the four options.')
  }

  const allowedCategories = examCategories[subject] || []
  if (parsed.examCategory && !allowedCategories.includes(parsed.examCategory)) {
    errors.push(`“${parsed.examCategory}” is not a valid exam category for ${subject}.`)
  }
  if (parsed.examCategory === 'Practice' && parsed.examYear) {
    errors.push('Practice questions cannot have an exam year.')
  } else if (parsed.examYear && !/^\d{4}$/.test(parsed.examYear)) {
    errors.push('Exam Year must be a four-digit year or blank.')
  }
  if (parsed.imageUrl && !/^https:\/\/\S+$/i.test(parsed.imageUrl)) {
    errors.push('Image URL must be a valid HTTPS URL.')
  }
  if (parsed.solutionImageUrl && !/^https:\/\/\S+$/i.test(parsed.solutionImageUrl)) {
    errors.push('Solution Image URL must be a valid HTTPS URL.')
  }

  if (!parsed.questionType) parsed.questionType = questionTypeForCategory(parsed.examCategory)
  else if (!parsed.examCategory) {
    parsed.examCategory = normalizeCategory(parsed.questionType)
    parsed.questionType = questionTypeForCategory(parsed.examCategory) || parsed.questionType
  }

  return { question: parsed, errors }
}

export async function appendPastedQuestion({ chapter, questions, savedQuestions, question, appendQuestions }) {
  if (!chapter || typeof chapter.isPublished === 'undefined') {
    return [...questions, question]
  }
  if (JSON.stringify(questions) !== JSON.stringify(savedQuestions)) {
    throw new Error('Save or discard your current question edits before pasting a question, so they are not confused with newer saved questions.')
  }
  return appendQuestions(chapter.id, [question])
}
