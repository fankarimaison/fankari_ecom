import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/products/[id] — id may be a Prisma id OR a slug (active only)
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    const product = await db.product.findFirst({
      where: { active: true, OR: [{ id }, { slug: id }] },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (err) {
    console.error('GET /api/products/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PUT /api/products/[id] — ADMIN, partial update
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const existing = await db.product.findUnique({ where: { id } })
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
    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
        return NextResponse.json({ error: 'A valid price is required' }, { status: 400 })
      }
      data.price = body.price
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
          : null
    }
    if (body.dimensions !== undefined) {
      data.dimensions =
        typeof body.dimensions === 'string' && body.dimensions.trim()
          ? body.dimensions.trim()
          : null
    }
    if (body.featured !== undefined) {
      data.featured = body.featured === true
    }
    if (body.active !== undefined) {
      data.active = body.active === true
    }

    const product = await db.product.update({ where: { id }, data })

    return NextResponse.json({ product })
  } catch (err) {
    console.error('PUT /api/products/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/products/[id] — ADMIN
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await db.product.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/products/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
