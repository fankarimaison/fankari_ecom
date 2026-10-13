import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING, getSessionUser } from '@/lib/auth'

// Unambiguous uppercase alphanumeric set (no 0/O, 1/I/L).
const ORDER_NUMBER_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateOrderNumber(): string {
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += ORDER_NUMBER_CHARS[Math.floor(Math.random() * ORDER_NUMBER_CHARS.length)]
  }
  return `TT-${suffix}`
}

async function nextOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateOrderNumber()
    const taken = await db.order.findUnique({ where: { orderNumber: candidate } })
    if (!taken) return candidate
  }
  // Practically unreachable fallback, still unique-ish.
  return `TT-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const round2 = (n: number) => Math.round(n * 100) / 100

// POST /api/orders — checkout (transaction: validate stock → order + snapshot items → decrement stock → clear cart)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to place an order' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const customerName = str(body.customerName)
    const email = str(body.email)
    const phone = str(body.phone)
    const address = str(body.address)
    const city = str(body.city)
    const postalCode = str(body.postalCode)
    const notes = str(body.notes)

    if (!customerName)
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    if (!address) return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
    if (!city) return NextResponse.json({ error: 'City is required' }, { status: 400 })

    const cartItems = await db.cartItem.findMany({
      where: { userId: user.id },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    })
    if (cartItems.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 })
    }

    for (const item of cartItems) {
      if (item.quantity > item.product.stock) {
        return NextResponse.json(
          { error: `Only ${item.product.stock} left in stock for ${item.product.name}` },
          { status: 400 }
        )
      }
    }

    const subtotal = round2(
      cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    )
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING
    const total = round2(subtotal + shipping)
    const orderNumber = await nextOrderNumber()

    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          status: 'CONFIRMED',
          subtotal,
          shipping,
          total,
          customerName,
          email,
          phone: phone || null,
          address,
          city,
          postalCode: postalCode || null,
          notes: notes || null,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              name: item.product.name,
              price: item.product.price,
              quantity: item.quantity,
              image: item.product.image,
            })),
          },
        },
        include: { items: true },
      })

      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      await tx.cartItem.deleteMany({ where: { userId: user.id } })

      return created
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    console.error('POST /api/orders error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// GET /api/orders — current user's orders, newest first
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to view your orders' }, { status: 401 })
    }

    const orders = await db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })

    return NextResponse.json({ orders })
  } catch (err) {
    console.error('GET /api/orders error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
