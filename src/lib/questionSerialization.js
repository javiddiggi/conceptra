export function serializeQuestionImages(question, imageUrl, solutionImageUrl) {
  const questionData = { ...question }
  delete questionData.imageFile
  delete questionData.imageRemoved
  delete questionData.solutionImageFile
  delete questionData.solutionImageRemoved
  delete questionData.imageUrl
  delete questionData.solutionImageUrl
  return {
    ...questionData,
    ...(imageUrl ? { imageUrl } : !question.imageRemoved && question.imageUrl ? { imageUrl: question.imageUrl } : {}),
    ...(solutionImageUrl ? { solutionImageUrl }
      : !question.solutionImageRemoved && question.solutionImageUrl
        ? { solutionImageUrl: question.solutionImageUrl }
        : {}),
  }
}
