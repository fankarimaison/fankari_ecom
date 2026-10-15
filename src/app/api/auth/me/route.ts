import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

// GET /api/auth/me — always 200, { user: null } when signed out
export async function GET() {
  try {
    const user = await getSessionUser()
    return NextResponse.json({ user })
  } catch (err) {
    console.error('GET /api/auth/me error:', err)
    return NextResponse.json({ user: null })
  }
}
