import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'CUSTOMER' | 'ADMIN'
}

/**
 * Read the signed-in user from the Supabase Auth session (only the studio
 * admin ever signs in). Returns null when signed out. The profile row is
 * created/refreshed from the session token by the sync_profile() RPC (role is
 * ADMIN when the user's app_metadata has {"role":"admin"} — set from the
 * Supabase dashboard / SQL, never by the user).
 *
 * Accepts an optional existing server client to avoid creating a second one:
 *   const supabase = await createClient()
 *   const user = await getSessionUser(supabase)
 */
export async function getSessionUser(
  client?: SupabaseClient,
): Promise<SessionUser | null> {
  try {
    const supabase = client ?? (await createClient())
    // getUser() verifies the token with Supabase Auth (getSession() would not)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile, error } = await supabase.rpc('sync_profile')
    if (error || !profile) {
      if (error) console.error('sync_profile failed:', error.message)
      return null
    }

    return {
      id: user.id,
      email: profile.email ?? '',
      name: profile.name ?? '',
      role: profile.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
    }
  } catch {
    return null
  }
}

/**
 * Guard helper for route handlers. Returns the session user, or null so the
 * handler can respond, e.g.:
 *   const user = await requireUser()
 *   if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
 */
export async function requireUser(): Promise<SessionUser | null> {
  return getSessionUser()
}

/**
 * True when the error looks like "table does not exist" — i.e. the Supabase
 * schema (supabase/schema.sql) has not been applied yet.
 */
export function isSchemaMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === 'PGRST205' || error.code === '42P01') return true
  const msg = (error.message ?? '').toLowerCase()
  return (
    msg.includes('could not find the table') ||
    msg.includes('does not exist in the schema cache') ||
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('schema cache')
  )
}
