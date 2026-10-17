export function getGoogleDriveNotesLinks(notesUrl) {
  try {
    const parsed = new URL(notesUrl)
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'drive.google.com') return null
    const fileId = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || parsed.searchParams.get('id')
    if (!fileId || !/^[\w-]+$/.test(fileId)) return null
    return {
      view: `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`,
      download: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
    }
  } catch {
    return null
  }
}

export function validateNotesUrl(notesUrl) {
  const trimmedUrl = notesUrl.trim()
  if (!trimmedUrl) return ''
  if (trimmedUrl.startsWith('/notes/')) return trimmedUrl
  let parsed
  try {
    parsed = new URL(trimmedUrl)
  } catch {
    throw new Error('Enter an HTTPS PDF URL or a Google Drive share link.')
  }
  if (parsed.protocol !== 'https:') throw new Error('Notes links must use HTTPS.')
  if (parsed.hostname === 'drive.google.com' && !getGoogleDriveNotesLinks(trimmedUrl)) {
    throw new Error('Use a Google Drive file share link containing a file ID.')
  }
  return trimmedUrl
}
