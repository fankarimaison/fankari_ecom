import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import {
  mapProduct,
  setupRequiredResponse,
  type ProductRow,
} from '@/lib/dto'
import { isPercent } from '@/lib/pricing'
import { MAX_GALLERY_ITEMS, parseGallery } from '@/lib/media'

const MAX_CARE_LENGTH = 2000

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'product'
  )
}

// GET /api/products?category=Canvas&search=leather&featured=1&sort=new|price_asc|price_desc
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')?.trim() ?? ''
    const search = searchParams.get('search')?.trim() ?? ''
    const featured = searchParams.get('featured') ?? ''
    const sort = searchParams.get('sort') ?? 'new'

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      console.error('GET /api/products query error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    // Catalog is small — category/search/featured/sort are applied in memory
    // over the created_at-desc query, exactly like the previous implementation.
    let products = ((data ?? []) as ProductRow[]).map(mapProduct)

    if (featured === '1') {
      products = products.filter((p) => p.featured)
    }

    if (category) {
      const cat = category.toLowerCase()
      products = products.filter((p) => p.category.toLowerCase() === cat)
    }

    if (search) {
      const q = search.toLowerCase()
      products = products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      )
    }

    if (sort === 'price_asc') {
      products = [...products].sort((a, b) => a.price - b.price)
    } else if (sort === 'price_desc') {
      products = [...products].sort((a, b) => b.price - a.price)
    }
    // 'new' (default) keeps the created_at desc order from the query.

    return NextResponse.json({ products })
  } catch (err) {
    console.error('GET /api/products error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/products — ADMIN
export async function POST(req: NextRequest) {
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
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const category = typeof body.category === 'string' ? body.category.trim() : ''
    const image = typeof body.image === 'string' ? body.image.trim() : ''
    const price = typeof body.price === 'number' && Number.isFinite(body.price) ? body.price : NaN
    const stock =
      typeof body.stock === 'number' && Number.isInteger(body.stock) ? body.stock : NaN

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!description)
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    if (Number.isNaN(price) || price < 0)
      return NextResponse.json({ error: 'A valid price is required' }, { status: 400 })
    if (Number.isNaN(stock) || stock < 0)
      return NextResponse.json({ error: 'A valid stock count is required' }, { status: 400 })
    if (!category) return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    if (!image) return NextResponse.json({ error: 'Image is required' }, { status: 400 })
    const gallery = parseGallery(body.gallery ?? [])
    if (!gallery)
      return NextResponse.json(
        { error: `Gallery must be up to ${MAX_GALLERY_ITEMS} photos or videos with web links` },
        { status: 400 },
      )

    const materials =
      typeof body.materials === 'string' && body.materials.trim() ? body.materials.trim() : ''
    const dimensions =
      typeof body.dimensions === 'string' && body.dimensions.trim() ? body.dimensions.trim() : ''
    const careInstructions =
      typeof body.careInstructions === 'string' ? body.careInstructions.trim() : ''
    if (careInstructions.length > MAX_CARE_LENGTH)
      return NextResponse.json(
        { error: `Care instructions must be ${MAX_CARE_LENGTH} characters or fewer` },
        { status: 400 },
      )
    const featured = body.featured === true
    const discountPercent = body.discountPercent ?? 0
    const vatRate = body.vatRate ?? 0
    if (!isPercent(discountPercent))
      return NextResponse.json({ error: 'Discount must be between 0 and 100%' }, { status: 400 })
    if (!isPercent(vatRate))
      return NextResponse.json({ error: 'VAT must be between 0 and 100%' }, { status: 400 })

    // Slug from the name, with -2, -3… suffixes on collision.
    const base = slugify(name)
    let slug = base
    let suffix = 1
    for (;;) {
      const { data: taken } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!taken) break
      suffix += 1
      slug = `${base}-${suffix}`
    }

    const { data: inserted, error } = await supabase
      .from('products')
      .insert({
        name,
        slug,
        description,
        price,
        discount_percent: discountPercent,
        vat_rate: vatRate,
        stock,
        category,
        image,
        // only sent when set, so creating plain products still works before
        // schema.sql adds the column
        ...(gallery.length ? { gallery } : {}),
        ...(careInstructions ? { care_instructions: careInstructions } : {}),
        materials,
        dimensions,
        featured,
        active: true,
      })
      .select('*')
      .maybeSingle()

    if (error || !inserted) {
      if (error) console.error('POST /api/products insert error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ product: mapProduct(inserted as ProductRow) }, { status: 201 })
  } catch (err) {
    console.error('POST /api/products error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
