/**
 * Product gallery: extra photos and videos shown on the product page after
 * the main image (products.image stays the cover used in cards, the bag and
 * order snapshots). Stored in products.gallery as [{ type, url }] in order.
 */

export type MediaType = 'image' | 'video'

export interface MediaItem {
  type: MediaType
  url: string
}

export const MAX_GALLERY_ITEMS = 12

/** Upload limits — kept in step with POST /api/admin/upload-url. */
export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}
export const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024

/**
 * Validate a gallery from a request body or a database row. Returns null when
 * the shape is wrong (only http(s) URLs, at most MAX_GALLERY_ITEMS).
 */
export function parseGallery(value: unknown): MediaItem[] | null {
  if (!Array.isArray(value) || value.length > MAX_GALLERY_ITEMS) return null
  const items: MediaItem[] = []
  for (const raw of value) {
    const type = (raw as { type?: unknown })?.type
    const url = (raw as { url?: unknown })?.url
    if (type !== 'image' && type !== 'video') return null
    if (typeof url !== 'string' || url.length > 1000 || !/^https?:\/\//i.test(url.trim())) {
      return null
    }
    items.push({ type, url: url.trim() })
  }
  return items
}
