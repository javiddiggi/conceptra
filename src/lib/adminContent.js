import { supabase } from './supabase.js'

const chaptersTable = 'biology_chapters'
const hiddenChaptersTable = 'hidden_biology_chapters'
const notesBucket = 'chapter-notes'

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and anon key to .env.local.')
  }
  return supabase
}

export async function getAdminIdentityStatus() {
  const client = requireSupabase()
  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  if (!sessionData.session) {
    return { userId: null, sessionExists: false, isAdmin: false }
  }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id || null
  if (!userId || userId !== sessionData.session.user.id) {
    return { userId, sessionExists: true, isAdmin: false }
  }

  const { data: adminRecord, error: adminError } = await client
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (adminError) throw adminError

  return { userId, sessionExists: true, isAdmin: Boolean(adminRecord) }
}

export function toStudentChapter(row) {
  return {
    id: row.id,
    class: row.class_number,
    subject: row.subject,
    chapterNumber: row.chapter_number,
    title: row.title,
    description: row.description || '',
    notesPdf: row.notes_pdf || null,
    youtubeUrl: row.youtube_url || '',
    questions: row.questions || [],
  }
}

export async function getPublicChapterChanges() {
  const client = requireSupabase()
  const [chaptersResult, hiddenResult] = await Promise.all([
    client.from(chaptersTable).select('*').eq('is_published', true),
    client.from(hiddenChaptersTable).select('id'),
  ])
  if (chaptersResult.error) throw chaptersResult.error
  if (hiddenResult.error) throw hiddenResult.error
  return {
    chapters: chaptersResult.data.map(toStudentChapter),
    hiddenIds: hiddenResult.data.map((row) => row.id),
  }
}

export async function getAdminChapters() {
  const client = requireSupabase()
  const { data, error } = await client
    .from(chaptersTable)
    .select('*')
    .order('class_number')
    .order('chapter_number')
  if (error) throw error
  return data.map((row) => ({ ...toStudentChapter(row), isPublished: row.is_published }))
}

export async function getHiddenChapterIds() {
  const client = requireSupabase()
  const { data, error } = await client.from(hiddenChaptersTable).select('id')
  if (error) throw error
  return data.map((row) => row.id)
}

export async function saveChapter(chapter, notesFile, { isNew, onIdentityStatus } = {}) {
  const client = requireSupabase()
  const identityStatus = await getAdminIdentityStatus()
  onIdentityStatus?.(identityStatus)
  if (!identityStatus.sessionExists || !identityStatus.userId) {
    throw new Error('No authenticated Supabase session is available. Sign in again before publishing.')
  }
  if (!identityStatus.isAdmin) {
    throw new Error(`The signed-in user (${identityStatus.userId}) is not present in public.admin_users. Sign in with the authorized admin account.`)
  }

  let notesPdf = chapter.notesPdf || null
  let uploadedPath = null

  if (notesFile) {
    const safeName = notesFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    uploadedPath = `class-${chapter.class}/biology/${chapter.id}/${Date.now()}-${safeName}`
    const { error: uploadError } = await client.storage
      .from(notesBucket)
      .upload(uploadedPath, notesFile, { contentType: 'application/pdf', upsert: true })
    if (uploadError) throw new Error(`Notes PDF upload failed: ${uploadError.message}`)
    const { data } = client.storage.from(notesBucket).getPublicUrl(uploadedPath)
    notesPdf = data.publicUrl
  }

  const row = {
    id: chapter.id,
    class_number: chapter.class,
    subject: 'Biology',
    chapter_number: chapter.chapterNumber,
    title: chapter.title.trim(),
    description: chapter.description.trim(),
    youtube_url: chapter.youtubeUrl.trim(),
    notes_pdf: notesPdf,
    questions: chapter.questions,
    is_published: true,
  }
  const saveQuery = isNew
    ? client.from(chaptersTable).insert(row)
    : client.from(chaptersTable).update(row).eq('id', chapter.id)
  const { error: saveError } = await saveQuery
  if (saveError) {
    if (uploadedPath) {
      const { error: cleanupError } = await client.storage.from(notesBucket).remove([uploadedPath])
      if (cleanupError) {
        throw new Error(`${saveError.message} The uploaded PDF could not be removed: ${cleanupError.message}`)
      }
    }
    throw new Error(`Chapter row save failed: ${saveError.message}`)
  }

  const { error: restoreError } = await client.from(hiddenChaptersTable).delete().eq('id', chapter.id)
  if (restoreError) throw new Error(`Chapter saved, but its hidden status could not be cleared: ${restoreError.message}`)
}

export async function hideChapter(chapterId) {
  const client = requireSupabase()
  const { error: hideError } = await client.from(hiddenChaptersTable).upsert({ id: chapterId })
  if (hideError) throw hideError

  const { error: unpublishError } = await client
    .from(chaptersTable)
    .update({ is_published: false })
    .eq('id', chapterId)
  if (unpublishError) throw unpublishError
}
