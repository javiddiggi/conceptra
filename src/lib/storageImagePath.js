const questionImagesPathSuffix = '/storage/v1/object/public/question-images/'

export function getOwnedQuestionImageStoragePath(imageUrl, configuredSupabaseUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl || typeof configuredSupabaseUrl !== 'string') return null

  try {
    const image = new URL(imageUrl)
    const project = new URL(configuredSupabaseUrl)
    const projectPath = project.pathname.replace(/\/+$/, '')
    const questionImagesPathPrefix = `${projectPath}${questionImagesPathSuffix}`
    if (
      image.origin !== project.origin
      || image.username
      || image.password
      || image.search
      || image.hash
      || project.username
      || project.password
      || project.search
      || project.hash
      || !image.pathname.startsWith(questionImagesPathPrefix)
    ) return null

    const encodedPath = image.pathname.slice(questionImagesPathPrefix.length)
    if (!encodedPath) return null
    const pathSegments = encodedPath.split('/').map((segment) => decodeURIComponent(segment))
    if (pathSegments.some((segment) =>
      !segment
      || segment === '.'
      || segment === '..'
      || segment.includes('/')
      || segment.includes('\\')
      || Array.from(segment).some((character) => {
        const codePoint = character.codePointAt(0)
        return codePoint < 0x20 || codePoint === 0x7f
      }),
    )) return null
    return pathSegments.join('/')
  } catch {
    return null
  }
}
