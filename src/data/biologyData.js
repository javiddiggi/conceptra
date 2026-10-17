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

const class11PhysicsChapters = [
  ['units-and-measurements', 'Units and Measurements'],
  ['motion-in-a-straight-line', 'Motion in a Straight Line'],
  ['motion-in-a-plane', 'Motion in a Plane'],
  ['laws-of-motion', 'Laws of Motion'],
  ['work-energy-and-power', 'Work, Energy and Power'],
  ['system-of-particles-and-rotational-motion', 'System of Particles and Rotational Motion'],
  ['gravitation', 'Gravitation'],
  ['mechanical-properties-of-solids', 'Mechanical Properties of Solids'],
  ['mechanical-properties-of-fluids', 'Mechanical Properties of Fluids'],
  ['thermal-properties-of-matter', 'Thermal Properties of Matter'],
  ['thermodynamics', 'Thermodynamics'],
  ['kinetic-theory', 'Kinetic Theory'],
  ['oscillations', 'Oscillations'],
  ['waves', 'Waves'],
]

const class12PhysicsChapters = [
  ['electric-charges-and-fields', 'Electric Charges and Fields'],
  ['electrostatic-potential-and-capacitance', 'Electrostatic Potential and Capacitance'],
  ['current-electricity', 'Current Electricity'],
  ['moving-charges-and-magnetism', 'Moving Charges and Magnetism'],
  ['magnetism-and-matter', 'Magnetism and Matter'],
  ['electromagnetic-induction', 'Electromagnetic Induction'],
  ['alternating-current', 'Alternating Current'],
  ['electromagnetic-waves', 'Electromagnetic Waves'],
  ['ray-optics-and-optical-instruments', 'Ray Optics and Optical Instruments'],
  ['wave-optics', 'Wave Optics'],
  ['dual-nature-of-radiation-and-matter', 'Dual Nature of Radiation and Matter'],
  ['atoms', 'Atoms'],
  ['nuclei', 'Nuclei'],
  ['semiconductor-electronics', 'Semiconductor Electronics: Materials, Devices and Simple Circuits'],
]

const class11ChemistryChapters = [
  ['some-basic-concepts-of-chemistry', 'Some Basic Concepts of Chemistry'],
  ['structure-of-atom', 'Structure of Atom'],
  ['classification-of-elements-and-periodicity-in-properties', 'Classification of Elements and Periodicity in Properties'],
  ['chemical-bonding-and-molecular-structure', 'Chemical Bonding and Molecular Structure'],
  ['thermodynamics', 'Thermodynamics'],
  ['equilibrium', 'Equilibrium'],
  ['redox-reactions', 'Redox Reactions'],
  ['organic-chemistry-basic-principles-and-techniques', 'Organic Chemistry – Some Basic Principles and Techniques'],
  ['hydrocarbons', 'Hydrocarbons'],
]

const class12ChemistryChapters = [
  ['solutions', 'Solutions'],
  ['electrochemistry', 'Electrochemistry'],
  ['chemical-kinetics', 'Chemical Kinetics'],
  ['the-d-and-f-block-elements', 'The d- and f-Block Elements'],
  ['coordination-compounds', 'Coordination Compounds'],
  ['haloalkanes-and-haloarenes', 'Haloalkanes and Haloarenes'],
  ['alcohols-phenols-and-ethers', 'Alcohols, Phenols and Ethers'],
  ['aldehydes-ketones-and-carboxylic-acids', 'Aldehydes, Ketones and Carboxylic Acids'],
  ['amines', 'Amines'],
  ['biomolecules', 'Biomolecules'],
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

const makeSubjectChapters = (classNumber, subject, chapters) =>
  chapters.map(([slug, title], index) => ({
    id: `${subject.toLowerCase()}-${classNumber}-${slug}`,
    class: classNumber,
    subject,
    chapterNumber: index + 1,
    title,
    description: '',
    notesPdf: null,
    youtubeUrl: '',
    questions: [],
  }))

export const physicsChapters = [
  ...makeSubjectChapters(11, 'Physics', class11PhysicsChapters),
  ...makeSubjectChapters(12, 'Physics', class12PhysicsChapters),
]

export const chemistryChapters = [
  ...makeSubjectChapters(11, 'Chemistry', class11ChemistryChapters),
  ...makeSubjectChapters(12, 'Chemistry', class12ChemistryChapters),
]

export const chapterCatalog = [
  ...biologyChapters,
  ...physicsChapters,
  ...chemistryChapters,
]

export const getChapterPath = (chapter) =>
  `/class-${chapter.class}/${(chapter.subject || 'Biology').toLowerCase()}/${chapter.id}`

export const getClassChapters = (classNumber, chapters = chapterCatalog) =>
  chapters.filter((chapter) => chapter.class === Number(classNumber))

export const getSubjectChapters = (classNumber, subject, chapters = chapterCatalog) =>
  chapters.filter((chapter) =>
    chapter.class === Number(classNumber)
    && (chapter.subject || 'Biology').toLowerCase() === subject.toLowerCase(),
  )

export const getChapter = (classNumber, chapterId) =>
  chapterCatalog.find(
    (chapter) =>
      chapter.class === Number(classNumber) && chapter.id === chapterId,
  )
