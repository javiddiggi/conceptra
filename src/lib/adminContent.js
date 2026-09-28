import { supabase } from './supabase.js'

const chaptersTable = 'biology_chapters'
const hiddenChaptersTable = 'hidden_biology_chapters'
const notesBucket = 'chapter-notes'
const questionImagesBucket = 'question-images'

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

function getQuestionImageStoragePath(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl) return null
  try {
    const segments = new URL(imageUrl).pathname.split('/').filter(Boolean).map(decodeURIComponent)
    const bucketIndex = segments.lastIndexOf(questionImagesBucket)
    return bucketIndex === -1 ? null : segments.slice(bucketIndex + 1).join('/')
  } catch {
    return imageUrl.replace(/^\/+/, '').replace(new RegExp(`^${questionImagesBucket}/`), '') || null
  }
}

async function removeUploadedFiles(client, bucket, paths, label) {
  if (!paths.length) return
  const { error } = await client.storage.from(bucket).remove(paths)
  if (error) throw new Error(`${label} cleanup failed: ${error.message}`)
}

export async function saveChapter(chapter, notesFile, {
  isNew,
  onIdentityStatus,
  previousQuestions = [],
} = {}) {
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
  let notesUploadedPath = null
  const questionImageUploads = []
  const questionImagesToRemove = new Set()

  if (notesFile) {
    const safeName = notesFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    notesUploadedPath = `class-${chapter.class}/biology/${chapter.id}/${Date.now()}-${safeName}`
    const { error: uploadError } = await client.storage
      .from(notesBucket)
      .upload(notesUploadedPath, notesFile, { contentType: 'application/pdf', upsert: true })
    if (uploadError) throw new Error(`Notes PDF upload failed: ${uploadError.message}`)
    const { data } = client.storage.from(notesBucket).getPublicUrl(notesUploadedPath)
    notesPdf = data.publicUrl
  }

  let questions
  try {
    questions = []
    for (const [index, question] of chapter.questions.entries()) {
      const { imageFile, imageRemoved, imageUrl: existingImageUrl, ...questionData } = question
      let imageUrl = imageRemoved ? null : existingImageUrl || null

      if (imageFile) {
        const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const safeQuestionId = String(question.id ?? index + 1).replace(/[^a-zA-Z0-9_-]/g, '-')
        const imagePath = `${chapter.id}/${safeQuestionId}/${Date.now()}-${index}-${safeName}`
        const { error: uploadError } = await client.storage
          .from(questionImagesBucket)
          .upload(imagePath, imageFile, { contentType: imageFile.type, upsert: false })
        if (uploadError) throw new Error(`Question ${index + 1} image upload failed: ${uploadError.message}`)
        questionImageUploads.push(imagePath)
        imageUrl = client.storage.from(questionImagesBucket).getPublicUrl(imagePath).data.publicUrl
      }

      if ((imageFile || imageRemoved) && existingImageUrl) {
        const oldImagePath = getQuestionImageStoragePath(existingImageUrl)
        if (oldImagePath) questionImagesToRemove.add(oldImagePath)
      }
      questions.push({ ...questionData, ...(imageUrl ? { imageUrl } : {}) })
    }
    const retainedImageUrls = new Set(questions.map((question) => question.imageUrl).filter(Boolean))
    previousQuestions.forEach((question) => {
      if (!question.imageUrl || retainedImageUrls.has(question.imageUrl)) return
      const oldImagePath = getQuestionImageStoragePath(question.imageUrl)
      if (oldImagePath) questionImagesToRemove.add(oldImagePath)
    })
  } catch (error) {
    const cleanupErrors = []
    try {
      await removeUploadedFiles(client, questionImagesBucket, questionImageUploads, 'Question image')
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError.message)
    }
    try {
      await removeUploadedFiles(client, notesBucket, notesUploadedPath ? [notesUploadedPath] : [], 'Notes PDF')
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError.message)
    }
    throw new Error(`${error.message}${cleanupErrors.length ? ` ${cleanupErrors.join(' ')}` : ''}`, { cause: error })
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
    questions,
    is_published: true,
  }
  const saveQuery = isNew
    ? client.from(chaptersTable).insert(row)
    : client.from(chaptersTable).update(row).eq('id', chapter.id)
  const { error: saveError } = await saveQuery
  if (saveError) {
    const cleanupErrors = []
    try {
      await removeUploadedFiles(client, questionImagesBucket, questionImageUploads, 'Question image')
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError.message)
    }
    try {
      await removeUploadedFiles(client, notesBucket, notesUploadedPath ? [notesUploadedPath] : [], 'Notes PDF')
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError.message)
    }
    throw new Error(`Chapter row save failed: ${saveError.message}${cleanupErrors.length ? ` ${cleanupErrors.join(' ')}` : ''}`)
  }

  const { error: restoreError } = await client.from(hiddenChaptersTable).delete().eq('id', chapter.id)
  if (restoreError) throw new Error(`Chapter saved, but its hidden status could not be cleared: ${restoreError.message}`)

  try {
    await removeUploadedFiles(client, questionImagesBucket, [...questionImagesToRemove], 'Old question image')
  } catch (error) {
    throw new Error(`Chapter saved, but ${error.message}`, { cause: error })
  }
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
