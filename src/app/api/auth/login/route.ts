import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchProfile, mapAuthUser } from '@/lib/dto'

// POST /api/auth/login — Supabase Auth password sign-in
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    // Map every Supabase failure (invalid credentials, "Email not confirmed",
    // user not found, …) to the single 401 message from the contract.
    if (error || !data.session || !data.user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const profile = await fetchProfile(supabase, data.user.id)
    return NextResponse.json({ user: mapAuthUser(data.user, profile) })
  } catch (err) {
    console.error('POST /api/auth/login error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
