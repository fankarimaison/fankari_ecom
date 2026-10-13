import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

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

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  let candidate = base
  let suffix = 1
  // Append a numeric suffix until the slug is free.
  while (await db.product.findUnique({ where: { slug: candidate } })) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }
  return candidate
}

// GET /api/products?category=Canvas&search=leather&featured=1&sort=new|price_asc|price_desc
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')?.trim() ?? ''
    const search = searchParams.get('search')?.trim() ?? ''
    const featured = searchParams.get('featured') ?? ''
    const sort = searchParams.get('sort') ?? 'new'

    const products = await db.product.findMany({
      where: {
        active: true,
        ...(featured === '1' ? { featured: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    let result = products

    if (category) {
      const cat = category.toLowerCase()
      result = result.filter((p) => p.category.toLowerCase() === cat)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      )
    }

    if (sort === 'price_asc') {
      result = [...result].sort((a, b) => a.price - b.price)
    } else if (sort === 'price_desc') {
      result = [...result].sort((a, b) => b.price - a.price)
    }
    // 'new' (default) keeps the createdAt desc order from the query.

    return NextResponse.json({ products: result })
  } catch (err) {
    console.error('GET /api/products error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/products — ADMIN
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
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

    const materials =
      typeof body.materials === 'string' && body.materials.trim()
        ? body.materials.trim()
        : null
    const dimensions =
      typeof body.dimensions === 'string' && body.dimensions.trim()
        ? body.dimensions.trim()
        : null
    const featured = body.featured === true

    const slug = await uniqueSlug(name)

    const product = await db.product.create({
      data: {
        name,
        slug,
        description,
        price,
        stock,
        category,
        image,
        materials,
        dimensions,
        featured,
        active: true,
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (err) {
    console.error('POST /api/products error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
