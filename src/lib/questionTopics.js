export function assignMissingQuestionTopics(questions) {
  const topicPositions = questions
    .map((question, index) => ({
      index,
      topic: typeof question.topic === 'string' ? question.topic.trim() : '',
    }))
    .filter(({ topic }) => topic)

  return questions.map((question, index) => {
    const topic = typeof question.topic === 'string' ? question.topic.trim() : ''
    if (topic) return { ...question, topic }
    const nearestTopic = topicPositions.reduce((nearest, candidate) => {
      if (!nearest) return candidate
      const candidateDistance = Math.abs(candidate.index - index)
      const nearestDistance = Math.abs(nearest.index - index)
      return candidateDistance < nearestDistance
        || (candidateDistance === nearestDistance && candidate.index < nearest.index)
        ? candidate
        : nearest
    }, null)
    return { ...question, topic: nearestTopic?.topic || 'General' }
  })
}

export function inheritQuestionTopicsAtPosition(questions) {
  let precedingTopic = ''
  return questions.map((question) => {
    const topic = (typeof question.topic === 'string' ? question.topic.trim() : '')
      || precedingTopic
      || question.defaultTopic?.trim()
      || 'General'
    precedingTopic = topic
    return { ...question, topic }
  })
}

export function groupQuestionsByTopic(questions) {
  const groups = []
  const groupsByTopic = new Map()

  assignMissingQuestionTopics(questions).forEach((question, index) => {
    const topic = question.topic
    const topicKey = topic.toLocaleLowerCase()
    let group = groupsByTopic.get(topicKey)
    if (!group) {
      group = { topic, topicKey, questions: [] }
      groupsByTopic.set(topicKey, group)
      groups.push(group)
    }
    group.questions.push({ question, index })
  })

  return groups
}

export function flattenQuestionGroups(groups) {
  return groups.flatMap((group) => group.questions.map(({ question }) => question))
}
