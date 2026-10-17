import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBulkQuestions, validateBulkQuestions } from '../src/lib/bulkQuestionParser.js'
import {
  filterQuestionsByExam,
  filterQuestionsByMode,
  getQuestionExamCategory,
  getQuestionExamYear,
  sortQuestionsWithinTopics,
} from '../src/lib/questionFiltering.js'
import { getGoogleDriveNotesLinks, validateNotesUrl } from '../src/lib/notesLinks.js'
import {
  biologyChapters,
  chapterCatalog,
  getChapterPath,
  getSubjectChapters,
} from '../src/data/biologyData.js'
import { serializeQuestionImages } from '../src/lib/questionSerialization.js'
import { replaceExistingQuestion, validateQuestionEdit } from '../src/lib/questionEdits.js'
import { getOwnedQuestionImageStoragePath } from '../src/lib/storageImagePath.js'
import { groupQuestionsByTopic } from '../src/lib/questionTopics.js'
import AnswerFeedback from '../src/components/AnswerFeedback.js'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

function questionBlock(number, { type = 'NEET PYQ', year = '2022', topic = 'Mechanics' } = {}) {
  return `Question ${number}: What is force ${number}?\nA) One\nB) Two\nC) Three\nD) Four\nAnswer: B\nExplanation: Force is explained here.\nType: ${type}\nTopic: ${topic}\nYear: ${type === 'Practice' ? '' : year}`
}

test('parses a batch of 30 labeled questions with answer letters and practice values', () => {
  const input = Array.from({ length: 30 }, (_, index) =>
    questionBlock(index + 1, index === 29 ? { type: 'Practice', year: '' } : {}),
  ).join('\n\n')
  const { questions, errors } = parseBulkQuestions(input)

  assert.deepEqual(errors, [])
  assert.equal(questions.length, 30)
  assert.equal(questions[0].correctAnswer, 'Two')
  assert.equal(questions[0].options.length, 4)
  assert.equal(questions[29].questionType, 'Practice')
  assert.equal(questions[29].examYear, '')
  assert.deepEqual(validateBulkQuestions(questions).map(({ errors: issues }) => issues), Array(30).fill([]))
})

test('reports malformed blocks and validation errors instead of inventing values', () => {
  const { questions, errors } = parseBulkQuestions('Unlabeled text\n\nQuestion: Incomplete?\nA) One')
  assert.equal(errors.length, 1)
  assert.equal(questions.length, 1)
  assert.ok(validateBulkQuestions(questions)[0].errors.length > 0)
})

test('flags conflicting repeated answers and prevents importing until reviewed', () => {
  const input = questionBlock(1).replace('Answer: B', 'Answer: B\nCorrect Answer: C')
  const { questions } = parseBulkQuestions(input)
  const errors = validateBulkQuestions(questions)[0].errors

  assert.equal(questions[0].correctAnswer, 'Two')
  assert.ok(errors.some((error) => error.includes('Question 1: Answer is repeated with conflicting values')))
  assert.ok(errors.some((error) => error.includes('“B” and “C”')))
})

test('flags conflicting repeated exam categories', () => {
  const input = questionBlock(1)
    .replace('Type: NEET PYQ', 'Exam Category: NEET\nExam Type: JEE Main')
  const { questions } = parseBulkQuestions(input)

  assert.ok(validateBulkQuestions(questions, 'Physics')[0].errors
    .some((error) => error.includes('Question 1: Exam Category is repeated with conflicting values')))
})

test('flags conflicting repeated exam years', () => {
  const input = questionBlock(1).replace('Year: 2022', 'Exam Year: 2022\nNEET Year: 2023')
  const { questions } = parseBulkQuestions(input)

  assert.ok(validateBulkQuestions(questions)[0].errors
    .some((error) => error.includes('Question 1: Exam Year is repeated with conflicting values')))
})

test('flags conflicting repeated topics', () => {
  const input = questionBlock(1).replace('Topic: Mechanics', 'Topic: Mechanics\nTopic: Kinematics')
  const { questions } = parseBulkQuestions(input)

  assert.ok(validateBulkQuestions(questions)[0].errors
    .some((error) => error.includes('Question 1: Topic is repeated with conflicting values')))
})

test('allows a valid single-value question and flags repeated identical values for review', () => {
  const { questions: validQuestions } = parseBulkQuestions(questionBlock(1))
  assert.deepEqual(validateBulkQuestions(validQuestions)[0].errors, [])

  const repeatedInput = questionBlock(1).replace('Topic: Mechanics', 'Topic: Mechanics\nTopic: Mechanics')
  const { questions: repeatedQuestions } = parseBulkQuestions(repeatedInput)
  assert.ok(validateBulkQuestions(repeatedQuestions)[0].errors
    .some((error) => error.includes('Topic is repeated with the same value')))
  assert.deepEqual(validateBulkQuestions(
    repeatedQuestions.map((question) => ({ ...question, parseErrors: [] })),
  )[0].errors, [])
})

test('only extracts cleanup paths from this project’s exact public question-images URLs', () => {
  const projectUrl = 'https://project-ref.supabase.co'
  assert.equal(
    getOwnedQuestionImageStoragePath(
      'https://project-ref.supabase.co/storage/v1/object/public/question-images/class-11/q1/diagram.png',
      projectUrl,
    ),
    'class-11/q1/diagram.png',
  )
  assert.equal(
    getOwnedQuestionImageStoragePath(
      'https://external.example/storage/v1/object/public/question-images/class-11/q1/diagram.png',
      projectUrl,
    ),
    null,
  )
  assert.equal(
    getOwnedQuestionImageStoragePath(
      'https://project-ref.supabase.co.attacker.example/storage/v1/object/public/question-images/class-11/q1/diagram.png',
      projectUrl,
    ),
    null,
  )
  assert.equal(
    getOwnedQuestionImageStoragePath(
      'https://project-ref.supabase.co/storage/v1/object/public/chapter-notes/class-11/notes.pdf',
      projectUrl,
    ),
    null,
  )
  assert.equal(getOwnedQuestionImageStoragePath('not a URL', projectUrl), null)
})

test('sorts PYQs by descending year stably and keeps practice separate without mutating input', () => {
  const questions = [
    { question: { id: 'old', questionType: 'NEET PYQ', examYear: '2019' }, index: 0 },
    { question: { id: 'practice', questionType: 'Practice' }, index: 1 },
    { question: { id: 'new-a', questionType: 'NEET PYQ', examYear: '2024' }, index: 2 },
    { question: { id: 'new-b', questionType: 'NEET PYQ', examYear: '2024' }, index: 3 },
    { question: { id: 'unknown', questionType: 'NEET PYQ', examYear: '' }, index: 4 },
  ]
  const sourceIds = questions.map(({ question }) => question.id)
  const [group] = sortQuestionsWithinTopics([{ topic: 'Mechanics', topicKey: 'mechanics', questions }])

  assert.deepEqual(group.questions.map(({ question }) => question.id), ['new-a', 'new-b', 'old', 'unknown', 'practice'])
  assert.equal(group.pyqCount, 4)
  assert.deepEqual(questions.map(({ question }) => question.id), sourceIds)
})

test('converts Google Drive share links and preserves existing HTTPS or public notes paths', () => {
  assert.deepEqual(getGoogleDriveNotesLinks('https://drive.google.com/file/d/abc_123/view?usp=sharing'), {
    view: 'https://drive.google.com/file/d/abc_123/preview',
    download: 'https://drive.google.com/uc?export=download&id=abc_123',
  })
  assert.equal(validateNotesUrl('https://project.supabase.co/storage/v1/object/public/chapter-notes/a.pdf'), 'https://project.supabase.co/storage/v1/object/public/chapter-notes/a.pdf')
  assert.equal(validateNotesUrl('/notes/class11/biology/a.pdf'), '/notes/class11/biology/a.pdf')
  assert.throws(() => validateNotesUrl('http://drive.google.com/file/d/abc/view'), /HTTPS/)
})

test('preserves Biology chapter URL generation and filters subjects by class', () => {
  const livingWorld = biologyChapters.find((chapter) => chapter.id === 'the-living-world')
  assert.equal(getChapterPath(livingWorld), '/class-11/biology/the-living-world')
  assert.equal(getSubjectChapters(11, 'Biology').length, 19)
  assert.equal(getSubjectChapters(11, 'Physics', [
    { class: 11, subject: 'Physics', id: 'physics-11-motion' },
    { class: 12, subject: 'Physics', id: 'physics-12-electricity' },
  ]).length, 1)
})

test('seeds ordered Physics and Chemistry catalogs for Classes 11 and 12 without changing Biology', () => {
  const class11Physics = getSubjectChapters(11, 'Physics')
  const class12Physics = getSubjectChapters(12, 'Physics')
  const class11Chemistry = getSubjectChapters(11, 'Chemistry')
  const class12Chemistry = getSubjectChapters(12, 'Chemistry')
  assert.equal(class11Physics.length, 14)
  assert.equal(class12Physics.length, 14)
  assert.equal(class11Chemistry.length, 9)
  assert.equal(class12Chemistry.length, 10)

  assert.deepEqual(class11Physics.map(({ title }) => title), [
    'Units and Measurements',
    'Motion in a Straight Line',
    'Motion in a Plane',
    'Laws of Motion',
    'Work, Energy and Power',
    'System of Particles and Rotational Motion',
    'Gravitation',
    'Mechanical Properties of Solids',
    'Mechanical Properties of Fluids',
    'Thermal Properties of Matter',
    'Thermodynamics',
    'Kinetic Theory',
    'Oscillations',
    'Waves',
  ])
  assert.deepEqual(class12Physics.map(({ title }) => title), [
    'Electric Charges and Fields',
    'Electrostatic Potential and Capacitance',
    'Current Electricity',
    'Moving Charges and Magnetism',
    'Magnetism and Matter',
    'Electromagnetic Induction',
    'Alternating Current',
    'Electromagnetic Waves',
    'Ray Optics and Optical Instruments',
    'Wave Optics',
    'Dual Nature of Radiation and Matter',
    'Atoms',
    'Nuclei',
    'Semiconductor Electronics: Materials, Devices and Simple Circuits',
  ])
  assert.deepEqual(class11Chemistry.map(({ title }) => title), [
    'Some Basic Concepts of Chemistry',
    'Structure of Atom',
    'Classification of Elements and Periodicity in Properties',
    'Chemical Bonding and Molecular Structure',
    'Thermodynamics',
    'Equilibrium',
    'Redox Reactions',
    'Organic Chemistry – Some Basic Principles and Techniques',
    'Hydrocarbons',
  ])
  assert.deepEqual(class12Chemistry.map(({ title }) => title), [
    'Solutions',
    'Electrochemistry',
    'Chemical Kinetics',
    'The d- and f-Block Elements',
    'Coordination Compounds',
    'Haloalkanes and Haloarenes',
    'Alcohols, Phenols and Ethers',
    'Aldehydes, Ketones and Carboxylic Acids',
    'Amines',
    'Biomolecules',
  ])
  assert.deepEqual(
    [...class11Physics, ...class12Physics, ...class11Chemistry, ...class12Chemistry]
      .map(({ class: classNumber, subject }) => [classNumber, subject]),
    [
      ...Array.from({ length: 14 }, () => [11, 'Physics']),
      ...Array.from({ length: 14 }, () => [12, 'Physics']),
      ...Array.from({ length: 9 }, () => [11, 'Chemistry']),
      ...Array.from({ length: 10 }, () => [12, 'Chemistry']),
    ],
  )
  assert.ok(class11Physics.every(({ id }) => id.startsWith('physics-11-')))
  assert.ok(class12Physics.every(({ id }) => id.startsWith('physics-12-')))
  assert.ok(class11Chemistry.every(({ id }) => id.startsWith('chemistry-11-')))
  assert.ok(class12Chemistry.every(({ id }) => id.startsWith('chemistry-12-')))
  assert.equal(
    [...class11Physics, ...class12Physics].some(({ title }) => title === 'Physical World'),
    false,
  )

  const ids = chapterCatalog.map(({ id }) => id)
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(chapterCatalog.slice(0, biologyChapters.length), biologyChapters)
  assert.deepEqual(
    biologyChapters.map(({ id, title, class: classNumber, chapterNumber }) => [id, title, classNumber, chapterNumber]),
    chapterCatalog.slice(0, biologyChapters.length)
      .map(({ id, title, class: classNumber, chapterNumber }) => [id, title, classNumber, chapterNumber]),
  )
})

test('supports exam filtering without classifying legacy Biology questions as JEE', () => {
  const questions = [
    { id: 1, questionType: 'NEET PYQ', neetYear: '2022' },
    { id: 2, questionType: 'Practice' },
    { id: 3, questionType: 'JEE Main PYQ', examCategory: 'JEE Main' },
    { id: 4, questionType: 'NEET PYQ', examCategory: 'JEE Advanced' },
  ]
  assert.equal(getQuestionExamCategory(questions[0]), 'NEET')
  assert.equal(getQuestionExamCategory(questions[1]), 'Practice')
  assert.equal(getQuestionExamCategory(questions[2]), 'JEE Main')
  assert.equal(getQuestionExamYear(questions[0]), '2022')
  assert.equal(filterQuestionsByExam(questions, 'NEET').length, 1)
  assert.equal(filterQuestionsByExam(questions, 'JEE Main').length, 1)
  assert.deepEqual(filterQuestionsByMode(questions, 'pyq').map(({ question }) => question.id), [1, 3, 4])
})

test('parses explicit JEE categories and a separate solution image URL', () => {
  const input = `${questionBlock(1, { year: '2021' })
    .replace('Type: NEET PYQ', 'Exam Type: JEE Advanced')
    .replace('Year: 2021', 'Exam Year: 2021')}\nSolution Image URL: https://example.com/solution.png`
  const { questions, errors } = parseBulkQuestions(input)
  assert.deepEqual(errors, [])
  assert.equal(questions[0].examCategory, 'JEE Advanced')
  assert.equal(questions[0].questionType, 'JEE Advanced PYQ')
  assert.equal(questions[0].examYear, '2021')
  assert.equal(questions[0].solutionImageUrl, 'https://example.com/solution.png')
  assert.deepEqual(validateBulkQuestions(questions, 'Physics')[0].errors, [])
  assert.ok(validateBulkQuestions(questions, 'Biology')[0].errors.some((error) => error.includes('exam category')))
})

test('preserves question and solution image URLs and all other fields when serializing', () => {
  const original = {
    id: 8,
    question: 'Example?',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    answer: 'A',
    explanation: 'Because.',
    questionType: 'NEET PYQ',
    examCategory: 'NEET',
    examYear: '2023',
    topic: 'Topic',
    imageUrl: 'https://example.com/question.png',
    solutionImageUrl: 'https://example.com/solution.png',
  }
  const serialized = serializeQuestionImages(original, original.imageUrl, original.solutionImageUrl)
  assert.deepEqual(serialized, original)
  assert.equal(original.solutionImageUrl, 'https://example.com/solution.png')
})

test('edits an existing bulk question by ID without duplicating it or losing saved image fields', () => {
  const existing = {
    id: 'bulk-existing',
    question: 'Original?',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    answer: 'A',
    explanation: 'Original explanation.',
    questionType: 'NEET PYQ',
    examCategory: 'NEET',
    examYear: '2021',
    topic: 'Mechanics',
    imageUrl: 'https://example.com/question.png',
    solutionImageUrl: 'https://example.com/solution.png',
    source: 'bulk',
  }
  const edited = {
    ...existing,
    question: 'Corrected question?',
    correctAnswer: 'B',
    answer: 'B',
    examYear: '2024',
    topic: 'Kinematics',
  }
  const saved = replaceExistingQuestion([existing], existing.id, existing, edited)

  assert.equal(saved.length, 1)
  assert.equal(saved[0].id, existing.id)
  assert.equal(saved[0].question, 'Corrected question?')
  assert.equal(saved[0].correctAnswer, 'B')
  assert.equal(saved[0].answer, 'B')
  assert.equal(saved[0].examYear, '2024')
  assert.equal(saved[0].imageUrl, existing.imageUrl)
  assert.equal(saved[0].solutionImageUrl, existing.solutionImageUrl)
  assert.equal(saved[0].source, 'bulk')
})

test('updates topic grouping after an existing question is edited', () => {
  const first = { id: 1, topic: 'Mechanics', question: 'One?' }
  const second = { id: 2, topic: 'Mechanics', question: 'Two?' }
  const moved = replaceExistingQuestion(
    [first, second],
    second.id,
    second,
    { ...second, topic: 'Kinematics' },
  )
  const groups = groupQuestionsByTopic(moved)

  assert.deepEqual(groups.map(({ topic, questions }) => [topic, questions.map(({ question }) => question.id)]), [
    ['Mechanics', [1]],
    ['Kinematics', [2]],
  ])
})

test('rejects stale question edits and invalid exam-year/category combinations', () => {
  const original = {
    id: 'saved',
    question: 'Question?',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    explanation: 'Explanation.',
    topic: 'Mechanics',
    examCategory: 'NEET',
    questionType: 'NEET PYQ',
    examYear: '2020',
  }
  assert.throws(
    () => replaceExistingQuestion(
      [{ ...original, explanation: 'Updated elsewhere.' }],
      original.id,
      original,
      { ...original, correctAnswer: 'B' },
    ),
    /changed after editing began/,
  )
  assert.ok(validateQuestionEdit({ ...original, examCategory: 'Practice' }, 'Physics')
    .some((error) => error.includes('cannot have an exam year')))
  assert.deepEqual(validateQuestionEdit({
    ...original,
    examCategory: 'JEE Main',
    questionType: 'JEE Main PYQ',
    examYear: '2024',
    correctAnswer: 'B',
  }, 'Physics'), [])
})

test('renders solution image with answer feedback after student submission', () => {
  const html = renderToStaticMarkup(createElement(AnswerFeedback, {
    isCorrect: true,
    explanation: 'Use conservation of momentum.',
    solutionImageUrl: 'https://example.com/solution.png',
    questionNumber: 4,
  }))
  assert.match(html, /Use conservation of momentum\./)
  assert.match(html, /src="https:\/\/example\.com\/solution\.png"/)
  assert.match(html, /Solution explanation for question 4/)
})
