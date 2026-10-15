import { auth } from '@clerk/nextjs/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client for route handlers, server components and
 * server actions. Every query carries the signed-in user's Clerk session
 * token (Supabase third-party auth), so RLS sees the Clerk user id as
 * auth.jwt()->>'sub'. Signed-out requests run as anon.
 */
export async function createClient() {
  const { getToken } = await auth()

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: async () => (await getToken()) ?? null,
    },
  )
}
