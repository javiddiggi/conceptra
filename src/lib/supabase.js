import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

let validSupabaseUrl = false
if (supabaseUrl) {
  try {
    const parsedUrl = new URL(supabaseUrl)
    validSupabaseUrl = parsedUrl.protocol === 'https:'
      || (parsedUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsedUrl.hostname))
  } catch {
    validSupabaseUrl = false
  }
}

export const supabaseConfigurationError = !supabaseUrl || !supabaseAnonKey
  ? 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in .env.local.'
  : !validSupabaseUrl
    ? 'VITE_SUPABASE_URL must be a valid HTTPS Supabase URL (HTTP is allowed for localhost only).'
    : ''
export const isSupabaseConfigured = Boolean(validSupabaseUrl && supabaseAnonKey)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
