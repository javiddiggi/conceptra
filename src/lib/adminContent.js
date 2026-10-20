import { supabase } from './supabase.js'
import { serializeQuestionImages } from './questionSerialization.js'
import { replaceExistingQuestion } from './questionEdits.js'
import { getOwnedQuestionImageStoragePath } from './storageImagePath.js'

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
    subject: row.subject || 'Biology',
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

function getQuestionImageStoragePath(imageUrl, client) {
  return getOwnedQuestionImageStoragePath(imageUrl, client.supabaseUrl)
}

async function removeUploadedFiles(client, bucket, paths, label) {
  if (!paths.length) return
  const { error } = await client.storage.from(bucket).remove(paths)
  if (error) throw new Error(`${label} cleanup failed: ${error.message}`)
}

export async function saveChapter(chapter, notesFile, {
  isNew,
  includeQuestions = true,
  onIdentityStatus,
  previousQuestions = [],
  expectedQuestions = previousQuestions,
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
    notesUploadedPath = `class-${chapter.class}/${chapter.subject.toLowerCase()}/${chapter.id}/${Date.now()}-${safeName}`
    const { error: uploadError } = await client.storage
      .from(notesBucket)
      .upload(notesUploadedPath, notesFile, { contentType: 'application/pdf', upsert: true })
    if (uploadError) throw new Error(`Notes PDF upload failed: ${uploadError.message}`)
    const { data } = client.storage.from(notesBucket).getPublicUrl(notesUploadedPath)
    notesPdf = data.publicUrl
  }

  let questions
  try {
    if (includeQuestions) {
      questions = []
      for (const [index, question] of chapter.questions.entries()) {
        const {
          imageFile,
          imageRemoved,
          imageUrl: existingImageUrl,
          solutionImageFile,
          solutionImageRemoved,
          solutionImageUrl: existingSolutionImageUrl,
        } = question
        let imageUrl = imageRemoved ? null : existingImageUrl || null
        let solutionImageUrl = solutionImageRemoved ? null : existingSolutionImageUrl || null

        for (const [file, kind] of [[imageFile, 'question'], [solutionImageFile, 'solution']]) {
          if (!file) continue
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
          const safeQuestionId = String(question.id ?? index + 1).replace(/[^a-zA-Z0-9_-]/g, '-')
          const imagePath = `${chapter.id}/${safeQuestionId}/${kind}-${Date.now()}-${index}-${safeName}`
          const { error: uploadError } = await client.storage
            .from(questionImagesBucket)
            .upload(imagePath, file, { contentType: file.type, upsert: false })
          if (uploadError) throw new Error(`Question ${index + 1} ${kind} image upload failed: ${uploadError.message}`)
          questionImageUploads.push(imagePath)
          const uploadedUrl = client.storage.from(questionImagesBucket).getPublicUrl(imagePath).data.publicUrl
          if (kind === 'question') imageUrl = uploadedUrl
          else solutionImageUrl = uploadedUrl
        }

        if ((imageFile || imageRemoved) && existingImageUrl) {
          const oldImagePath = getQuestionImageStoragePath(existingImageUrl, client)
          if (oldImagePath) questionImagesToRemove.add(oldImagePath)
        }
        if ((solutionImageFile || solutionImageRemoved) && existingSolutionImageUrl) {
          const oldImagePath = getQuestionImageStoragePath(existingSolutionImageUrl, client)
          if (oldImagePath) questionImagesToRemove.add(oldImagePath)
        }
        questions.push(serializeQuestionImages(question, imageUrl, solutionImageUrl))
      }
      const retainedImageUrls = new Set(questions.flatMap((question) =>
        [question.imageUrl, question.solutionImageUrl].filter(Boolean),
      ))
      previousQuestions.forEach((question) => {
        for (const imageUrl of [question.imageUrl, question.solutionImageUrl]) {
          if (!imageUrl || retainedImageUrls.has(imageUrl)) continue
          const oldImagePath = getQuestionImageStoragePath(imageUrl, client)
          if (oldImagePath) questionImagesToRemove.add(oldImagePath)
        }
      })
    }
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
    subject: chapter.subject,
    chapter_number: chapter.chapterNumber,
    title: chapter.title.trim(),
    description: chapter.description.trim(),
    youtube_url: chapter.youtubeUrl.trim(),
    notes_pdf: notesPdf,
    ...(includeQuestions ? { questions } : {}),
    is_published: true,
  }
  let savedChapter
  let saveError
  if (isNew) {
    const result = await client.from(chaptersTable).insert(row)
    savedChapter = result.error ? null : { id: chapter.id }
    saveError = result.error
  } else {
    let saveQuery = client.from(chaptersTable).update(row).eq('id', chapter.id)
    if (includeQuestions) {
      saveQuery = saveQuery.eq('questions', JSON.stringify(expectedQuestions))
    }
    const result = await saveQuery.select('id').maybeSingle()
    savedChapter = result.data
    saveError = result.error
  }
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
  if (!savedChapter) {
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
    throw new Error(`Chapter questions changed while saving. Reload the latest chapter before publishing.${cleanupErrors.length ? ` ${cleanupErrors.join(' ')}` : ''}`)
  }

  const { error: restoreError } = await client.from(hiddenChaptersTable).delete().eq('id', chapter.id)
  if (restoreError) throw new Error(`Chapter saved, but its hidden status could not be cleared: ${restoreError.message}`)

  try {
    await removeUploadedFiles(client, questionImagesBucket, [...questionImagesToRemove], 'Old question image')
  } catch (error) {
    throw new Error(`Chapter saved, but ${error.message}`, { cause: error })
  }
}

export async function appendChapterQuestions(chapterId, questions) {
  const client = requireSupabase()
  const identityStatus = await getAdminIdentityStatus()
  if (!identityStatus.sessionExists || !identityStatus.userId || !identityStatus.isAdmin) {
    throw new Error('Administrator access is required to import questions.')
  }
  const { data, error } = await client.rpc('append_chapter_questions', {
    target_chapter_id: chapterId,
    new_questions: questions,
  })
  if (error) throw new Error(`Question save failed: ${error.message}`)
  if (!Array.isArray(data)) throw new Error('Question save returned an invalid saved question list.')
  return data
}

export async function saveExistingChapterQuestion(chapterId, baselineQuestion, editedQuestion, onIdentityStatus) {
  const client = requireSupabase()
  const identityStatus = await getAdminIdentityStatus()
  onIdentityStatus?.(identityStatus)
  if (!identityStatus.sessionExists || !identityStatus.userId || !identityStatus.isAdmin) {
    throw new Error('Administrator access is required to save question changes.')
  }

  const { data: chapterRow, error: loadError } = await client
    .from(chaptersTable)
    .select('questions')
    .eq('id', chapterId)
    .single()
  if (loadError) throw new Error(`Could not load the latest saved questions: ${loadError.message}`)
  const latestQuestions = Array.isArray(chapterRow.questions) ? chapterRow.questions : []
  const mergedQuestions = replaceExistingQuestion(
    latestQuestions,
    baselineQuestion.id,
    baselineQuestion,
    editedQuestion,
  )
  const questionIndex = mergedQuestions.findIndex((question) => String(question.id) === String(baselineQuestion.id))
  const question = mergedQuestions[questionIndex]
  const {
    imageFile,
    imageRemoved,
    imageUrl: oldImageUrl,
    solutionImageFile,
    solutionImageRemoved,
    solutionImageUrl: oldSolutionImageUrl,
  } = question
  let imageUrl = imageRemoved ? null : oldImageUrl || null
  let solutionImageUrl = solutionImageRemoved ? null : oldSolutionImageUrl || null
  const uploadedPaths = []
  const pathsToRemove = new Set()
  let questionChangesSaved = false

  try {
    for (const [file, kind] of [[imageFile, 'question'], [solutionImageFile, 'solution']]) {
      if (!file) continue
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const safeQuestionId = String(question.id).replace(/[^a-zA-Z0-9_-]/g, '-')
      const imagePath = `${chapterId}/${safeQuestionId}/${kind}-${Date.now()}-${safeName}`
      const { error: uploadError } = await client.storage
        .from(questionImagesBucket)
        .upload(imagePath, file, { contentType: file.type, upsert: false })
      if (uploadError) throw new Error(`Question ${kind} image upload failed: ${uploadError.message}`)
      uploadedPaths.push(imagePath)
      const uploadedUrl = client.storage.from(questionImagesBucket).getPublicUrl(imagePath).data.publicUrl
      if (kind === 'question') imageUrl = uploadedUrl
      else solutionImageUrl = uploadedUrl
    }

    if ((imageFile || imageRemoved) && oldImageUrl) {
      const oldPath = getQuestionImageStoragePath(oldImageUrl, client)
      if (oldPath) pathsToRemove.add(oldPath)
    }
    if ((solutionImageFile || solutionImageRemoved) && oldSolutionImageUrl) {
      const oldPath = getQuestionImageStoragePath(oldSolutionImageUrl, client)
      if (oldPath) pathsToRemove.add(oldPath)
    }
    mergedQuestions[questionIndex] = serializeQuestionImages(question, imageUrl, solutionImageUrl)

    const retainedUrls = new Set(mergedQuestions.flatMap((item) =>
      [item.imageUrl, item.solutionImageUrl].filter(Boolean),
    ))
    for (const existingQuestion of latestQuestions) {
      for (const existingUrl of [existingQuestion.imageUrl, existingQuestion.solutionImageUrl]) {
        if (!existingUrl || retainedUrls.has(existingUrl)) continue
        const oldPath = getQuestionImageStoragePath(existingUrl, client)
        if (oldPath) pathsToRemove.add(oldPath)
      }
    }

    const { data: savedRow, error: saveError } = await client
      .from(chaptersTable)
      .update({ questions: mergedQuestions })
      .eq('id', chapterId)
      .eq('questions', JSON.stringify(latestQuestions))
      .select('questions')
      .maybeSingle()
    if (saveError) throw new Error(`Question changes could not be saved: ${saveError.message}`)
    if (!savedRow) {
      throw new Error('The chapter questions changed while this edit was saving. Your changes were not applied; reopen the question and try again.')
    }
    questionChangesSaved = true
    let warning = ''
    try {
      await removeUploadedFiles(client, questionImagesBucket, [...pathsToRemove], 'Old question image')
    } catch (cleanupError) {
      warning = `Question saved, but ${cleanupError.message}`
    }
    return { questions: savedRow.questions, warning }
  } catch (error) {
    const cleanupErrors = []
    if (!questionChangesSaved) {
      try {
        await removeUploadedFiles(client, questionImagesBucket, uploadedPaths, 'New question image')
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError.message)
      }
    }
    if (cleanupErrors.length) {
      throw new Error(`${error.message} ${cleanupErrors.join(' ')}`, { cause: error })
    }
    throw error
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
