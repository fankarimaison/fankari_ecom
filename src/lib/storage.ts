/**
 * Public URLs for files in the Supabase Storage bucket that holds all site
 * images (logo, hero, product photos). Upload with `npm run images:upload`.
 */
export const STORAGE_BUCKET = 'fankari'

export const STORAGE_BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`

export function storageUrl(path: string): string {
  return `${STORAGE_BASE_URL}/${path.replace(/^\/+/, '')}`
}

export const LOGO_URL = storageUrl('logo.jpg')
export const HERO_IMAGE_URL = storageUrl('images/hero.jpg')
export const DEFAULT_PRODUCT_IMAGE_URL = storageUrl('images/p1.jpg')
