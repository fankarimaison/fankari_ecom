import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchProfile, mapAuthUser } from '@/lib/dto'

// GET /api/auth/me — always 200, { user: null } when signed out
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ user: null })
    }

    // No 503 setup guard here: when the profile row is missing (e.g. signed up
    // before supabase/schema.sql was applied) fall back to auth defaults.
    const profile = await fetchProfile(supabase, user.id)
    return NextResponse.json({ user: mapAuthUser(user, profile) })
  } catch (err) {
    console.error('GET /api/auth/me error:', err)
    return NextResponse.json({ user: null })
  }
}
