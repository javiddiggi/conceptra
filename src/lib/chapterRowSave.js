function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

export function questionArraysMatch(left, right) {
  return stableJson(left) === stableJson(right)
}

export function formatSupabaseSaveError(context, error, status) {
  const statusValue = status ?? error?.status
  const statusLabel = statusValue ? `HTTP ${statusValue}` : ''
  const code = error?.code ? `code ${error.code}` : ''
  const identifiers = [statusLabel, code].filter(Boolean).join(', ')
  const message = error?.message || 'Supabase did not provide an error message.'
  const details = error?.details ? ` Details: ${error.details}` : ''
  const hint = error?.hint ? ` Hint: ${error.hint}` : ''
  const diagnostic = identifiers ? ` (${identifiers})` : ''
  return `${context}${diagnostic}: ${message}${details}${hint}`
}

export async function saveChapterRow({
  client,
  table,
  row,
  isNew,
  includeQuestions,
  expectedQuestions,
  returning = 'id',
}) {
  if (isNew) return client.from(table).insert(row)

  let expectedUpdatedAt
  if (includeQuestions) {
    const latestResult = await client
      .from(table)
      .select('questions, updated_at')
      .eq('id', row.id)
      .maybeSingle()
    if (latestResult.error) return latestResult
    if (!latestResult.data) {
      return {
        data: null,
        error: null,
        status: latestResult.status,
        conflict: true,
      }
    }
    if (!questionArraysMatch(latestResult.data.questions, expectedQuestions)) {
      return {
        data: null,
        error: null,
        status: latestResult.status,
        conflict: true,
      }
    }
    expectedUpdatedAt = latestResult.data.updated_at
  }

  let query = client
    .from(table)
    .update({
      ...row,
      updated_at: new Date(Math.max(
        Date.now(),
        expectedUpdatedAt ? Date.parse(expectedUpdatedAt) + 1 : 0,
      )).toISOString(),
    })
    .eq('id', row.id)
  if (includeQuestions) query = query.eq('updated_at', expectedUpdatedAt)
  const result = await query.select(returning).maybeSingle()
  if (result.error || result.data || !includeQuestions) return result
  return { ...result, conflict: true }
}
