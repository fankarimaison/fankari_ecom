import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Orders at or above this subtotal ship free.
 */
export const FREE_SHIPPING_THRESHOLD = 75

/** Flat shipping fee applied below the free-shipping threshold. */
export const FLAT_SHIPPING = 6.99

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'CUSTOMER' | 'ADMIN'
}

/**
 * Read the signed-in user from the Supabase session (cookies managed by
 * @supabase/ssr + middleware). Returns null when signed out.
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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email, role')
      .eq('id', user.id)
      .single()

    const role =
      profile?.role === 'ADMIN' ? ('ADMIN' as const) : ('CUSTOMER' as const)

    return {
      id: user.id,
      email: profile?.email ?? user.email ?? '',
      name: profile?.name ?? '',
      role,
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
