const class11Chapters = [
  ['the-living-world', 'The Living World'],
  ['biological-classification', 'Biological Classification'],
  ['plant-kingdom', 'Plant Kingdom'],
  ['animal-kingdom', 'Animal Kingdom'],
  ['morphology-of-flowering-plants', 'Morphology of Flowering Plants'],
  ['anatomy-of-flowering-plants', 'Anatomy of Flowering Plants'],
  ['structural-organisation-in-animals', 'Structural Organisation in Animals'],
  ['cell-the-unit-of-life', 'Cell: The Unit of Life'],
  ['biomolecules', 'Biomolecules'],
  ['cell-cycle-and-cell-division', 'Cell Cycle and Cell Division'],
  ['photosynthesis-in-higher-plants', 'Photosynthesis in Higher Plants'],
  ['respiration-in-plants', 'Respiration in Plants'],
  ['plant-growth-and-development', 'Plant Growth and Development'],
  ['breathing-and-exchange-of-gases', 'Breathing and Exchange of Gases'],
  ['body-fluids-and-circulation', 'Body Fluids and Circulation'],
  ['excretory-products-and-their-elimination', 'Excretory Products and their Elimination'],
  ['locomotion-and-movement', 'Locomotion and Movement'],
  ['neural-control-and-coordination', 'Neural Control and Coordination'],
  ['chemical-coordination-and-integration', 'Chemical Coordination and Integration'],
]

const class12Chapters = [
  ['sexual-reproduction-in-flowering-plants', 'Sexual Reproduction in Flowering Plants'],
  ['human-reproduction', 'Human Reproduction'],
  ['reproductive-health', 'Reproductive Health'],
  ['principles-of-inheritance-and-variation', 'Principles of Inheritance and Variation'],
  ['molecular-basis-of-inheritance', 'Molecular Basis of Inheritance'],
  ['evolution', 'Evolution'],
  ['human-health-and-disease', 'Human Health and Disease'],
  ['microbes-in-human-welfare', 'Microbes in Human Welfare'],
  ['biotechnology-principles-and-processes', 'Biotechnology: Principles and Processes'],
  ['biotechnology-and-its-applications', 'Biotechnology and its Applications'],
  ['organisms-and-populations', 'Organisms and Populations'],
  ['ecosystem', 'Ecosystem'],
  ['biodiversity-and-conservation', 'Biodiversity and Conservation'],
]

const makeChapters = (classNumber, chapters) =>
  chapters.map(([id, title], index) => ({
    id,
    class: classNumber,
    subject: 'Biology',
    chapterNumber: index + 1,
    title,
    notesPdf: null,
    youtubeUrl: '',
    questions: [],
  }))

export const biologyChapters = [
  ...makeChapters(11, class11Chapters),
  ...makeChapters(12, class12Chapters),
]

export const getChapterPath = (chapter) =>
  `/class-${chapter.class}/biology/${chapter.id}`

export const getClassChapters = (classNumber, chapters = biologyChapters) =>
  chapters.filter((chapter) => chapter.class === Number(classNumber))

export const getChapter = (classNumber, chapterId) =>
  biologyChapters.find(
    (chapter) =>
      chapter.class === Number(classNumber) && chapter.id === chapterId,
  )
