/**
 * Home page banner carousel. The images live in site_content.heroImages as a
 * JSON array of URLs (Admin → Content); heroImage is kept as the first one
 * for older pages and as the fallback when the list is empty.
 */

export const MAX_HERO_IMAGES = 8

/** Parse heroImages; null when it is not a JSON array of http(s) URLs. */
export function parseHeroImages(raw: string | undefined): string[] | null {
  if (!raw || !raw.trim()) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value) || value.length > MAX_HERO_IMAGES) return null
    const urls = value.map((v) => (typeof v === 'string' ? v.trim() : ''))
    return urls.every((u) => /^https?:\/\//i.test(u) && u.length <= 1000) ? urls : null
  } catch {
    return null
  }
}

/** Banner slides to show: heroImages, else the single heroImage, else fallback. */
export function heroSlides(
  content: Record<string, string> | undefined,
  fallback: string,
): string[] {
  const list = parseHeroImages(content?.heroImages) ?? []
  if (list.length) return list
  return [content?.heroImage || fallback]
}
