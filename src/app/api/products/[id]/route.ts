import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import {
  mapProduct,
  setupRequiredResponse,
  UUID_RE,
  type ProductRow,
} from '@/lib/dto'
import { isPercent } from '@/lib/pricing'
import { MAX_GALLERY_ITEMS, parseGallery } from '@/lib/media'

const MAX_CARE_LENGTH = 2000

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/products/[id] — id may be a uuid OR a slug
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Admins may fetch inactive products; everyone else only sees active ones.
    const session = await getSessionUser(supabase)
    const isAdmin = session?.role === 'ADMIN'

    // uuid → match id or slug; anything else would break a uuid cast, so it
    // can only ever be a slug. Slugs are generated from [a-z0-9-] only —
    // anything else can't exist in the table, so answer 404 without querying
    // (also protects the .or() filter from PostgREST syntax injection).
    const isUuid = UUID_RE.test(id)
    if (!isUuid && !/^[A-Za-z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(isUuid ? `id.eq.${id},slug.eq.${id}` : `slug.eq.${id}`)
      .maybeSingle()
    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      console.error('GET /api/products/[id] query error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    const product = data as ProductRow | null
    if (!product || (!isAdmin && !product.active)) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product: mapProduct(product) })
  } catch (err) {
    console.error('GET /api/products/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PUT /api/products/[id] — ADMIN, partial update
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .maybeSingle()
    if (existingError) {
      if (isSchemaMissing(existingError)) return setupRequiredResponse()
      console.error('PUT /api/products/[id] fetch error:', existingError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 })
      }
      data.name = body.name.trim()
    }
    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || !body.description.trim()) {
        return NextResponse.json(
          { error: 'Description must be a non-empty string' },
          { status: 400 }
        )
      }
      data.description = body.description.trim()
    }
    if (body.category !== undefined) {
      if (typeof body.category !== 'string' || !body.category.trim()) {
        return NextResponse.json({ error: 'Category must be a non-empty string' }, { status: 400 })
      }
      data.category = body.category.trim()
    }
    if (body.image !== undefined) {
      if (typeof body.image !== 'string' || !body.image.trim()) {
        return NextResponse.json({ error: 'Image must be a non-empty string' }, { status: 400 })
      }
      data.image = body.image.trim()
    }
    if (body.gallery !== undefined) {
      const gallery = parseGallery(body.gallery)
      if (!gallery) {
        return NextResponse.json(
          { error: `Gallery must be up to ${MAX_GALLERY_ITEMS} photos or videos with web links` },
          { status: 400 }
        )
      }
      data.gallery = gallery
    }
    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
        return NextResponse.json({ error: 'A valid price is required' }, { status: 400 })
      }
      data.price = body.price
    }
    if (body.discountPercent !== undefined) {
      if (!isPercent(body.discountPercent)) {
        return NextResponse.json({ error: 'Discount must be between 0 and 100%' }, { status: 400 })
      }
      data.discount_percent = body.discountPercent
    }
    if (body.vatRate !== undefined) {
      if (!isPercent(body.vatRate)) {
        return NextResponse.json({ error: 'VAT must be between 0 and 100%' }, { status: 400 })
      }
      data.vat_rate = body.vatRate
    }
    if (body.stock !== undefined) {
      if (typeof body.stock !== 'number' || !Number.isInteger(body.stock) || body.stock < 0) {
        return NextResponse.json({ error: 'A valid stock count is required' }, { status: 400 })
      }
      data.stock = body.stock
    }
    if (body.materials !== undefined) {
      data.materials =
        typeof body.materials === 'string' && body.materials.trim()
          ? body.materials.trim()
          : ''
    }
    if (body.dimensions !== undefined) {
      data.dimensions =
        typeof body.dimensions === 'string' && body.dimensions.trim()
          ? body.dimensions.trim()
          : ''
    }
    if (body.careInstructions !== undefined) {
      const care =
        typeof body.careInstructions === 'string' ? body.careInstructions.trim() : ''
      if (care.length > MAX_CARE_LENGTH) {
        return NextResponse.json(
          { error: `Care instructions must be ${MAX_CARE_LENGTH} characters or fewer` },
          { status: 400 }
        )
      }
      data.care_instructions = care
    }
    if (body.featured !== undefined) {
      data.featured = body.featured === true
    }
    if (body.active !== undefined) {
      data.active = body.active === true
    }

    // Empty partial → no-op update, return the current row (old behavior).
    if (Object.keys(data).length === 0) {
      const { data: current, error: currentError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (currentError) {
        console.error('PUT /api/products/[id] fetch error:', currentError.message)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
      if (!current) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      return NextResponse.json({ product: mapProduct(current as ProductRow) })
    }

    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update(data)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (updateError) {
      console.error('PUT /api/products/[id] update error:', updateError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product: mapProduct(updated as ProductRow) })
  } catch (err) {
    console.error('PUT /api/products/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/products/[id] — ADMIN (cart rows cascade; order items keep snapshots)
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .maybeSingle()
    if (existingError) {
      if (isSchemaMissing(existingError)) return setupRequiredResponse()
      console.error('DELETE /api/products/[id] fetch error:', existingError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      console.error('DELETE /api/products/[id] delete error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/products/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
