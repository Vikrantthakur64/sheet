import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  // import.meta.env.VITE_SUPABASE_URL,
  // import.meta.env.VITE_SUPABASE_ANON_KEY,
)

const SESSION_ID = 1

export async function loadSession() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', SESSION_ID)
    .single()

  if (error) { console.error('loadSession:', error.message); return null }
  return data
}

export async function saveSession(patch) {
  const { error } = await supabase
    .from('sessions')
    .update(patch)
    .eq('id', SESSION_ID)

  if (error) console.error('saveSession:', error.message)
}
