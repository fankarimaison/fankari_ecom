/** A product category (Admin → Categories), as returned by /api/categories. */
export interface CategoryDTO {
  id: string
  name: string
  /** picture for the category tile; '' when none */
  image: string
  sortOrder: number
}

export interface CategoryRow {
  id: string
  name: string
  image: string | null
  sort_order: number
}

export function mapCategory(row: CategoryRow): CategoryDTO {
  return { id: row.id, name: row.name, image: row.image ?? '', sortOrder: row.sort_order }
}

/** Shown until supabase/schema.sql creates the categories table. */
export const DEFAULT_CATEGORY_NAMES = [
  'Canvas',
  'Straw & Jute',
  'Leather Trim',
  'Linen',
  'Special Edition',
]

export const MAX_CATEGORY_NAME = 60

/** Validate { name, image, sortOrder } from a request; partial when `partial`. */
export function parseCategoryInput(
  body: Record<string, unknown> | null,
  partial: boolean,
): { data: Partial<Pick<CategoryRow, 'name' | 'image' | 'sort_order'>> } | { error: string } {
  if (!body) return { error: 'Invalid request body' }
  const data: Partial<Pick<CategoryRow, 'name' | 'image' | 'sort_order'>> = {}

  if (body.name !== undefined || !partial) {
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (!name) return { error: 'Category name is required' }
    if (name.length > MAX_CATEGORY_NAME)
      return { error: `Category name must be ${MAX_CATEGORY_NAME} characters or fewer` }
    data.name = name
  }
  if (body.image !== undefined) {
    const image = typeof body.image === 'string' ? body.image.trim() : null
    if (image === null || (image && !/^https?:\/\//i.test(image)))
      return { error: 'Picture must be a web link (http:// or https://)' }
    data.image = image
  }
  if (body.sortOrder !== undefined) {
    if (typeof body.sortOrder !== 'number' || !Number.isInteger(body.sortOrder))
      return { error: 'Sort order must be a whole number' }
    data.sort_order = body.sortOrder
  }
  return { data }
}
