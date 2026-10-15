import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const products = [
  {
    name: 'Classic Canvas Everyday Tote',
    slug: 'classic-canvas-everyday-tote',
    description:
      'Our signature everyday tote, handcrafted from 14oz natural cotton canvas with reinforced double-stitched handles. Roomy enough for groceries, laptops, or a weekend escape — this is the bag you will reach for every single day.',
    price: 42,
    stock: 24,
    category: 'Canvas',
    image: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p1.jpg',
    materials: '14oz natural cotton canvas, cotton webbing handles',
    dimensions: '38 × 35 × 12 cm',
    featured: true,
  },
  {
    name: 'Market Day Waxed Canvas Tote',
    slug: 'market-day-waxed-canvas-tote',
    description:
      'Built for the weekly market run and years beyond it. Heavy waxed canvas weathers beautifully, while vegetable-tanned leather straps and solid brass hardware add rugged refinement. Water-resistant and gets better with age.',
    price: 58,
    stock: 16,
    category: 'Canvas',
    image: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p2.jpg',
    materials: 'Waxed cotton canvas, vegetable-tanned leather, brass hardware',
    dimensions: '40 × 38 × 14 cm',
    featured: true,
  },
  {
    name: 'Boho Straw Beach Tote',
    slug: 'boho-straw-beach-tote',
    description:
      'Hand-woven by artisans from sustainably harvested straw, finished with playful pom-pom tassels. Spacious enough for towels, sunscreen and a good book — your perfect sunshine companion.',
    price: 49,
    stock: 20,
    category: 'Straw & Jute',
    image: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p3.jpg',
    materials: 'Natural woven straw, cotton tassels, cotton lining',
    dimensions: '45 × 35 × 15 cm',
    featured: true,
  },
  {
    name: 'Jute Market Bag',
    slug: 'jute-market-bag',
    description:
      'A plastic-free staple for farmers market mornings. Sturdy woven jute with smooth wooden handles and an interior pocket for your phone and keys. Strong enough to carry a week of produce.',
    price: 36,
    stock: 30,
    category: 'Straw & Jute',
    image: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p4.jpg',
    materials: 'Woven jute, wooden handles, cotton lining',
    dimensions: '42 × 36 × 14 cm',
    featured: false,
  },
  {
    name: 'Heritage Leather-Trim Tote',
    slug: 'heritage-leather-trim-tote',
    description:
      'Where canvas meets craftsmanship: durable cotton canvas body trimmed in full-grain cognac leather. Fits a 15" laptop with room to spare. Hand-burnished edges and saddle-stitched stress points make this a decade-long companion.',
    price: 89,
    stock: 12,
    category: 'Leather Trim',
    image: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p5.jpg',
    materials: 'Cotton canvas, full-grain leather trim, brass rivets',
    dimensions: '40 × 30 × 13 cm',
    featured: true,
  },
  {
    name: 'Saddle Leather Shopper',
    slug: 'saddle-leather-shopper',
    description:
      'Our most luxurious carry. Cut from a single hide of espresso full-grain leather and finished with a hand-set brass buckle. Designed to be carried daily and patina into a one-of-a-kind heirloom.',
    price: 120,
    stock: 8,
    category: 'Leather Trim',
    image: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p6.jpg',
    materials: 'Full-grain leather, solid brass hardware, suede lining',
    dimensions: '42 × 32 × 14 cm',
    featured: true,
  },
  {
    name: 'Minimalist Linen Carryall',
    slug: 'minimalist-linen-carryall',
    description:
      'Quietly elegant and featherlight. Made from washed European linen with clean French seams — perfect for errands, work, or a day out. Softens with every wash and folds flat when not in use.',
    price: 45,
    stock: 22,
    category: 'Linen',
    image: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p7.jpg',
    materials: '100% washed European linen',
    dimensions: '38 × 34 × 10 cm',
    featured: false,
  },
  {
    name: 'Embroidered Meadow Tote',
    slug: 'embroidered-meadow-tote',
    description:
      'Each meadow tote is hand-embroidered with wildflowers in terracotta and sage thread — no two are exactly alike. A wearable piece of slow craft that carries your essentials and a story.',
    price: 64,
    stock: 10,
    category: 'Special Edition',
    image: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p8.jpg',
    materials: 'Heavy cotton canvas, cotton embroidery thread',
    dimensions: '38 × 36 × 12 cm',
    featured: true,
  },
  {
    name: 'Quilted Patchwork Tote',
    slug: 'quilted-patchwork-tote',
    description:
      'Sewn from repurposed fabric squares in warm earth tones, each patchwork tote is one of a kind. Fully quilted and lined for structure, with a nod to generations of thrifty, beautiful handcraft.',
    price: 72,
    stock: 9,
    category: 'Special Edition',
    image: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p9.jpg',
    materials: 'Upcycled cotton fabrics, cotton batting, canvas lining',
    dimensions: '39 × 34 × 13 cm',
    featured: false,
  },
  {
    name: 'Macramé Fringe Festival Bag',
    slug: 'macrame-fringe-festival-bag',
    description:
      'Hand-knotted cotton cord in a boho fringe silhouette that sways as you walk. Made for festival days, beach strolls, and everything golden-hour. Fully lined so nothing slips through.',
    price: 54,
    stock: 14,
    category: 'Special Edition',
    image: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p10.jpg',
    materials: 'Braided cotton cord, cotton lining',
    dimensions: '36 × 38 × 11 cm',
    featured: false,
  },
]

const defaultContent: Record<string, string> = {
  brandName: 'Fankari Maison',
  announcement:
    'Free shipping on all orders over ₹75 · Handcrafted in small batches',
  heroTitle: 'Carried by Hand, Made with Heart',
  heroSubtitle:
    'Small-batch tote bags handcrafted from natural canvas, jute and full-grain leather. Built for everyday adventures, designed to last a lifetime.',
  heroImage: 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/hero.jpg',
  aboutTitle: 'Crafted Slowly, Made to Last',
  aboutText:
    'Every Fankari Maison bag begins as raw natural fibre — sturdy cotton canvas, rustic jute, buttery full-grain leather — and passes through the hands of skilled artisans who cut, stitch and finish each piece in small batches. We believe the things you carry every day should be beautiful, honest and built to age gracefully. No mass production, no shortcuts: just time-honoured craft and materials that get better with every year you carry them.',
}

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()
  await prisma.siteContent.deleteMany()

  // Users
  const adminPass = await bcrypt.hash('admin123', 10)
  const customerPass = await bcrypt.hash('customer123', 10)

  await prisma.user.create({
    data: {
      email: 'admin@fankarimaison.com',
      password: adminPass,
      name: 'Studio Admin',
      role: 'ADMIN',
    },
  })
  await prisma.user.create({
    data: {
      email: 'customer@example.com',
      password: customerPass,
      name: 'Demo Customer',
      role: 'CUSTOMER',
    },
  })
  console.log('✓ Users: admin@fankarimaison.com/admin123, customer@example.com/customer123')

  // Products
  for (const p of products) {
    await prisma.product.create({ data: p })
  }
  console.log(`✓ ${products.length} products`)

  // Content
  for (const [key, value] of Object.entries(defaultContent)) {
    await prisma.siteContent.create({ data: { key, value } })
  }
  console.log(`✓ ${Object.keys(defaultContent).length} content entries`)

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
