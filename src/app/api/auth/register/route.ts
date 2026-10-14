import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchProfile, mapAuthUser } from '@/lib/dto'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/auth/register — Supabase Auth signup
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    // Duplicate email: explicit error code, or a returned user whose
    // identities array is empty (Supabase does this instead of erroring when
    // email confirmation is enabled and the address is already registered).
    const duplicate =
      error?.code === 'user_already_exists' ||
      (!!data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
    if (duplicate) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    if (error) {
      console.error('POST /api/auth/register signUp error:', error.code, error.message)
      if (error.code === 'email_address_invalid') {
        return NextResponse.json(
          { error: 'Please enter a valid email address' },
          { status: 400 }
        )
      }
      if (error.code === 'email_address_not_authorized') {
        return NextResponse.json(
          { error: 'This email address cannot receive sign-up emails. Please use a different address.' },
          { status: 400 }
        )
      }
      if (
        error.code === 'over_email_send_rate_limit' ||
        error.message?.toLowerCase().includes('rate limit')
      ) {
        return NextResponse.json(
          { error: 'Too many confirmation emails sent. Please wait a few minutes and try again.' },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    // Session present → email confirmation is disabled → signed in right away.
    if (data.session && data.user) {
      const profile = await fetchProfile(supabase, data.user.id)
      return NextResponse.json({ user: mapAuthUser(data.user, profile) })
    }

    // User created but no session → the project requires email confirmation.
    if (data.user) {
      return NextResponse.json({
        user: null,
        needsConfirmation: true,
        message: 'Account created! Check your email to confirm your address before signing in.',
      })
    }

    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  } catch (err) {
    console.error('POST /api/auth/register error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
