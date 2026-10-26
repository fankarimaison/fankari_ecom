import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import { setupRequiredResponse } from '@/lib/dto'
import { HERO_IMAGE_URL, storageUrl } from '@/lib/storage'
import { isAmount, SHIPPING_CONTENT_DEFAULTS } from '@/lib/pricing'
import { isWhatsAppNumber, normalizeWhatsAppNumber } from '@/lib/whatsapp'
import { MAX_HERO_IMAGES, parseHeroImages } from '@/lib/hero'
import { DEFAULT_FOUNDERS, MAX_FOUNDERS, parseFounders } from '@/lib/about'
import { DEFAULT_TRUST_ITEMS, MAX_TRUST_ITEMS, MAX_TRUST_TEXT, parseTrustItems } from '@/lib/trust'

type SchemaError = { code?: string; message?: string }

/** Built-in defaults, merged under the site_content rows (matches schema.sql seed). */
const DEFAULT_CONTENT: Record<string, string> = {
  brandName: 'Fankari Maison',
  announcement:
    'Free shipping on all orders over ₹75 · Handcrafted in small batches',
  heroTitle: 'Carried by Hand, Made with Heart',
  heroSubtitle:
    'Small-batch tote bags handcrafted from natural canvas, jute and full-grain leather. Built for everyday adventures, designed to last a lifetime.',
  heroImage: HERO_IMAGE_URL,
  // JSON list of banner carousel images — starter slides until the admin saves
  // their own in Admin → Content → Banner images
  heroImages: JSON.stringify([
    HERO_IMAGE_URL,
    storageUrl('images/p2.jpg'),
    storageUrl('images/p5.jpg'),
    storageUrl('images/p8.jpg'),
  ]),
  aboutTitle: 'Crafted Slowly, Made to Last',
  aboutText:
    'Every Fankari Maison bag begins as raw natural fibre — sturdy cotton canvas, rustic jute, buttery full-grain leather — and passes through the hands of skilled artisans who cut, stitch and finish each piece in small batches. We believe the things you carry every day should be beautiful, honest and built to age gracefully. No mass production, no shortcuts: just time-honoured craft and materials that get better with every year you carry them.',
  // Highlights strip under the home banner (Admin → Content → Highlights)
  trustItems: JSON.stringify(DEFAULT_TRUST_ITEMS),
  // Footer (Admin → Content)
  footerText:
    'Small-batch totes handcrafted from natural canvas, jute and full-grain leather. Made slowly, carried daily, built to last.',
  contactEmail: 'hello@fankarimaison.com',
  contactPhone: '',
  contactAddress: 'The Artisan Workshop, Portland, OR',
  // About Us page (Admin → About page)
  aboutTagline:
    'A small studio with a big love for handmade things — and the people who make them.',
  aboutImage: storageUrl('images/p5.jpg'),
  aboutMission:
    'We started Fankari Maison to keep traditional craft alive — paying artisans fairly, using honest materials, and making bags that are loved for years, not seasons.',
  founders: JSON.stringify(DEFAULT_FOUNDERS),
  ...SHIPPING_CONTENT_DEFAULTS,
  // Seller's WhatsApp number — buyers send their order here after checkout
  whatsappNumber: '',
  // Shown on product pages that have no care instructions of their own
  defaultCareInstructions: [
    'Spot clean with a soft, damp cloth and mild soap',
    'Do not machine wash, bleach or tumble dry',
    'Dry flat in the shade, away from direct heat',
    'Store stuffed with paper so it keeps its shape',
  ].join('\n'),
}

/** Shipping keys are read by place_order(), so only accept well-formed values. */
function invalidShippingEntry(entries: [string, string][]): string | null {
  for (const [key, raw] of entries) {
    const value = raw.trim()
    if (key === 'shippingFee' || key === 'freeShippingThreshold') {
      if (value === '' || !isAmount(Number(value))) {
        return key === 'shippingFee'
          ? 'Shipping charge must be an amount of ₹0 or more'
          : 'Free-shipping threshold must be an amount of ₹0 or more'
      }
    }
    if (key === 'freeShippingEnabled' && value !== 'true' && value !== 'false') {
      return 'freeShippingEnabled must be "true" or "false"'
    }
  }
  return null
}

async function mergedContent(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.from('site_content').select('key,value')
  if (error) throw error

  const content = { ...DEFAULT_CONTENT }
  const rows = (data ?? []) as { key: string; value: string }[]
  for (const row of rows) {
    content[row.key] = row.value
  }
  return content
}

// GET /api/content
export async function GET() {
  try {
    const supabase = await createClient()
    const content = await mergedContent(supabase)
    return NextResponse.json({ content })
  } catch (err) {
    if (isSchemaMissing(err as SchemaError)) return setupRequiredResponse()
    console.error('GET /api/content error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PUT /api/content — ADMIN, upsert { key: value, ... }
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
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

    const invalid = invalidShippingEntry(entries)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    // Banner carousel: a JSON list of image links; the first doubles as heroImage
    const heroImages = entries.find(([key]) => key === 'heroImages')
    if (heroImages) {
      const urls = parseHeroImages(heroImages[1])
      if (!urls) {
        return NextResponse.json(
          { error: `Banner images must be up to ${MAX_HERO_IMAGES} image links` },
          { status: 400 },
        )
      }
      heroImages[1] = JSON.stringify(urls)
      if (urls.length) {
        const single = entries.find(([key]) => key === 'heroImage')
        if (single) single[1] = urls[0]
        else entries.push(['heroImage', urls[0]])
      }
    }

    // About page founders: a JSON list of { name, role, image, bio, quote }
    const founders = entries.find(([key]) => key === 'founders')
    if (founders) {
      const list = parseFounders(founders[1])
      if (!list) {
        return NextResponse.json(
          { error: `Founders must be up to ${MAX_FOUNDERS} people with short text and image links` },
          { status: 400 },
        )
      }
      founders[1] = JSON.stringify(list)
    }

    // Home highlights: a JSON list of { icon, text }
    const trust = entries.find(([key]) => key === 'trustItems')
    if (trust) {
      const list = parseTrustItems(trust[1])
      if (!list) {
        return NextResponse.json(
          { error: `Highlights must be up to ${MAX_TRUST_ITEMS} items of up to ${MAX_TRUST_TEXT} characters` },
          { status: 400 },
        )
      }
      trust[1] = JSON.stringify(list.map((i) => ({ ...i, text: i.text.trim() })))
    }

    // Stored as digits only, the form wa.me links need
    const whatsapp = entries.find(([key]) => key === 'whatsappNumber')
    if (whatsapp) {
      whatsapp[1] = normalizeWhatsAppNumber(whatsapp[1])
      if (whatsapp[1] && !isWhatsAppNumber(whatsapp[1])) {
        return NextResponse.json(
          { error: 'WhatsApp number must include the country code, e.g. 919876543210' },
          { status: 400 },
        )
      }
    }

    const rows = entries.map(([key, value]) => ({ key, value }))
    const { error } = await supabase
      .from('site_content')
      .upsert(rows, { onConflict: 'key' })
    if (error) {
      console.error('PUT /api/content upsert error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    const content = await mergedContent(supabase)
    return NextResponse.json({ content })
  } catch (err) {
    if (isSchemaMissing(err as SchemaError)) return setupRequiredResponse()
    console.error('PUT /api/content error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
