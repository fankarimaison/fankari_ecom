/**
 * The strip of highlights under the home page banner ("Handcrafted in small
 * batches", "Built to last"…). Stored in site_content.trustItems as a JSON
 * array of { icon, text } (Admin → Content → Highlights).
 */

export type TrustItem = { icon: string; text: string }

/** Icons the admin can pick from (names map to lucide icons in trust-icons.tsx). */
export const TRUST_ICONS = [
  'hand-heart',
  'leaf',
  'truck',
  'shield-check',
  'sparkles',
  'heart',
  'gift',
  'package',
  'recycle',
  'award',
  'star',
  'gem',
  'scissors',
  'palette',
  'globe',
  'clock',
  'rotate-ccw',
  'badge-check',
  'smile',
  'sun',
  'flower',
  'map-pin',
  'message-circle',
  'lock',
  'tag',
] as const

export const MAX_TRUST_ITEMS = 8
export const MAX_TRUST_TEXT = 80

/** Written in a highlight, replaced by the live shipping offer from Admin → Shipping. */
export const SHIPPING_TOKEN = '{shipping}'

export const DEFAULT_TRUST_ITEMS: TrustItem[] = [
  { icon: 'hand-heart', text: 'Handcrafted in small batches' },
  { icon: 'leaf', text: 'Natural materials' },
  { icon: 'truck', text: SHIPPING_TOKEN },
  { icon: 'shield-check', text: 'Built to last' },
]

/** Parse trustItems; null when it is not a valid list. */
export function parseTrustItems(raw: string | undefined): TrustItem[] | null {
  if (!raw || !raw.trim()) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value) || value.length > MAX_TRUST_ITEMS) return null
    const items: TrustItem[] = []
    for (const item of value) {
      if (!item || typeof item !== 'object') return null
      const { icon, text } = item as Record<string, unknown>
      if (typeof icon !== 'string' || !(TRUST_ICONS as readonly string[]).includes(icon)) return null
      if (typeof text !== 'string' || text.trim().length > MAX_TRUST_TEXT) return null
      // untrimmed so the admin editor can hold a half-typed "Built "
      items.push({ icon, text })
    }
    return items
  } catch {
    return null
  }
}

/** Highlights to show: the saved list (dropping blank ones), else the defaults. */
export function trustItemsFromContent(content: Record<string, string> | undefined): TrustItem[] {
  if (content?.trustItems === undefined) return DEFAULT_TRUST_ITEMS
  return (parseTrustItems(content.trustItems) ?? [])
    .map((i) => ({ ...i, text: i.text.trim() }))
    .filter((i) => i.text)
}
