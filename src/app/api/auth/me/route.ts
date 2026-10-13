import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ user: null })
    }

    const user = await db.user.findUnique({ where: { id: session.id } })
    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    console.error('GET /api/auth/me error:', err)
    return NextResponse.json({ user: null })
  }
}
