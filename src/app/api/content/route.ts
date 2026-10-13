import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

/** Built-in defaults, merged under the SiteContent table rows (matches scripts/seed.ts). */
const DEFAULT_CONTENT: Record<string, string> = {
  brandName: 'Terra & Thread',
  announcement:
    'Free shipping on all orders over $75 · Handcrafted in small batches',
  heroTitle: 'Carried by Hand, Made with Heart',
  heroSubtitle:
    'Small-batch tote bags handcrafted from natural canvas, jute and full-grain leather. Built for everyday adventures, designed to last a lifetime.',
  heroImage: '/images/hero.jpg',
  aboutTitle: 'Crafted Slowly, Made to Last',
  aboutText:
    'Every Terra & Thread bag begins as raw natural fibre — sturdy cotton canvas, rustic jute, buttery full-grain leather — and passes through the hands of skilled artisans who cut, stitch and finish each piece in small batches. We believe the things you carry every day should be beautiful, honest and built to age gracefully. No mass production, no shortcuts: just time-honoured craft and materials that get better with every year you carry them.',
}

async function mergedContent(): Promise<Record<string, string>> {
  const content = { ...DEFAULT_CONTENT }
  const rows = await db.siteContent.findMany()
  for (const row of rows) {
    content[row.key] = row.value
  }
  return content
}

// GET /api/content
export async function GET() {
  try {
    const content = await mergedContent()
    return NextResponse.json({ content })
  } catch (err) {
    console.error('GET /api/content error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PUT /api/content — ADMIN, upsert { key: value, ... }
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const entries = Object.entries(body).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No valid content keys provided (values must be strings)' },
        { status: 400 }
      )
    }

    for (const [key, value] of entries) {
      await db.siteContent.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    const content = await mergedContent()
    return NextResponse.json({ content })
  } catch (err) {
    console.error('PUT /api/content error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
