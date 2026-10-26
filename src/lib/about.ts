/**
 * About Us page content. The founders live in site_content.founders as a JSON
 * array (Admin → About page); the rest of the page uses plain text keys.
 */

export type Founder = {
  name: string
  role: string
  image: string
  bio: string
  quote: string
}

export const MAX_FOUNDERS = 4

const LIMITS = { name: 80, role: 80, image: 1000, bio: 1500, quote: 300 } as const

/** Starter founders — shown until the admin saves their own. */
export const DEFAULT_FOUNDERS: Founder[] = [
  {
    name: 'Founder name',
    role: 'Co-founder · Design & Craft',
    image: '',
    bio: 'Add a few lines about this founder in Admin → About page — where they grew up, what drew them to handmade craft, and what they love most about making each bag.',
    quote: 'Every stitch carries a story.',
  },
  {
    name: 'Founder name',
    role: 'Co-founder · Studio & Community',
    image: '',
    bio: 'Add a few lines about this founder in Admin → About page — the artisans they work with, how the studio began, and what Fankari Maison means to them.',
    quote: 'Made slowly, carried for a lifetime.',
  },
]

/** Parse founders; null when it is not a valid founders list. */
export function parseFounders(raw: string | undefined): Founder[] | null {
  if (!raw || !raw.trim()) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value) || value.length > MAX_FOUNDERS) return null
    const founders: Founder[] = []
    for (const item of value) {
      if (!item || typeof item !== 'object') return null
      const f = item as Record<string, unknown>
      const founder = {} as Founder
      for (const key of Object.keys(LIMITS) as (keyof Founder)[]) {
        const v = f[key] ?? ''
        if (typeof v !== 'string' || v.length > LIMITS[key]) return null
        founder[key] = v.trim()
      }
      if (founder.image && !/^https?:\/\//i.test(founder.image)) return null
      founders.push(founder)
    }
    return founders
  } catch {
    return null
  }
}

/** Founders to show: the saved list (dropping blank entries), else the starters. */
export function foundersFromContent(content: Record<string, string> | undefined): Founder[] {
  if (content?.founders === undefined) return DEFAULT_FOUNDERS
  return (parseFounders(content.founders) ?? []).filter((f) => f.name || f.bio)
}

/** "Riya Mehta" → "RM" for the portrait placeholder. */
export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '·'
  )
}
