import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

// POST /api/auth/login { email, password } — studio admin sign-in (Supabase
// Auth, email + password). The session is stored in cookies. Accounts without
// the admin role are signed straight back out.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!email || !password) {
      return NextResponse.json({ error: 'Enter your email and password' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const status = error.status === 429 ? 429 : 401
      return NextResponse.json(
        {
          error:
            status === 429
              ? 'Too many attempts — please wait a moment and try again'
              : 'Incorrect email or password',
        },
        { status },
      )
    }

    const user = await getSessionUser(supabase)
    if (!user || user.role !== 'ADMIN') {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'This account does not have admin access' },
        { status: 403 },
      )
    }

    return NextResponse.json({ user })
  } catch (err) {
    console.error('POST /api/auth/login error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
