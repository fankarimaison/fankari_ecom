import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const OUT_DIR = '/home/z/my-project/public/images'

const products: Array<{ file: string; prompt: string }> = [
  {
    file: 'p1.jpg',
    prompt:
      'Professional product photography of a handcrafted natural beige cotton canvas tote bag with sturdy handles, standing upright on a warm cream studio background, soft diffused lighting, artisanal craftsmanship, minimalist composition, high quality, detailed',
  },
  {
    file: 'p2.jpg',
    prompt:
      'Professional product photography of a rugged olive green waxed canvas utility tote bag with leather straps and brass hardware, on a warm neutral studio background, soft shadows, artisanal craftsmanship, high quality, detailed',
  },
  {
    file: 'p3.jpg',
    prompt:
      'Professional product photography of a bohemian woven straw beach tote bag with pom-pom tassels, standing on a sandy beige studio background, warm golden lighting, artisanal summer vibe, high quality, detailed',
  },
  {
    file: 'p4.jpg',
    prompt:
      'Professional product photography of a rustic natural jute market bag with wooden handles, on a warm cream studio background, soft natural lighting, eco-friendly artisanal style, high quality, detailed',
  },
  {
    file: 'p5.jpg',
    prompt:
      'Professional product photography of a premium tan brown leather tote bag with visible stitching and cognac tones, on a warm neutral studio background, elegant soft lighting, luxury artisan craftsmanship, high quality, detailed',
  },
  {
    file: 'p6.jpg',
    prompt:
      'Professional product photography of a dark espresso brown full-grain leather shopper tote bag with brass buckle, on a warm beige studio background, moody soft lighting, premium artisan quality, high quality, detailed',
  },
  {
    file: 'p7.jpg',
    prompt:
      'Professional product photography of a minimalist off-white linen tote bag with simple clean lines, on a warm stone-colored studio background, airy soft lighting, Scandinavian simplicity, high quality, detailed',
  },
  {
    file: 'p8.jpg',
    prompt:
      'Professional product photography of a cream canvas tote bag with hand-embroidered wildflower floral design in terracotta and sage colors, on a warm ivory studio background, soft lighting, artisanal handmade charm, high quality, detailed',
  },
  {
    file: 'p9.jpg',
    prompt:
      'Professional product photography of a colorful quilted patchwork tote bag made from repurposed fabric squares in warm earth tones, on a cream studio background, cozy soft lighting, handmade quilt aesthetic, high quality, detailed',
  },
  {
    file: 'p10.jpg',
    prompt:
      'Professional product photography of a cream cotton macrame tote bag with decorative knotted fringe detail, on a warm beige studio background, boho soft lighting, artisanal hand-knotted texture, high quality, detailed',
  },
]

async function main() {
  const zai = await ZAI.create()
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  // Hero image (wide landscape)
  try {
    if (!fs.existsSync(path.join(OUT_DIR, 'hero.jpg'))) {
      const res = await zai.images.generations.create({
        prompt:
          'Warm inviting artisan workshop scene with several handcrafted canvas and leather tote bags arranged on a wooden table, rolls of natural fabric and leather tools in background, golden hour sunlight through window, cozy earthy tones of terracotta cream and sage, editorial lifestyle photography, high quality, detailed',
        size: '1344x768',
      })
      fs.writeFileSync(
        path.join(OUT_DIR, 'hero.jpg'),
        Buffer.from(res.data[0].base64, 'base64')
      )
      console.log('OK hero.jpg')
    }
  } catch (e) {
    console.error('FAIL hero.jpg', (e as Error).message)
  }

  for (const p of products) {
    const out = path.join(OUT_DIR, p.file)
    if (fs.existsSync(out)) {
      console.log('SKIP', p.file)
      continue
    }
    let ok = false
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        const res = await zai.images.generations.create({
          prompt: p.prompt,
          size: '1024x1024',
        })
        fs.writeFileSync(out, Buffer.from(res.data[0].base64, 'base64'))
        console.log('OK', p.file)
        ok = true
      } catch (e) {
        console.error(`FAIL ${p.file} attempt ${attempt}`, (e as Error).message)
        await new Promise((r) => setTimeout(r, 1500 * attempt))
      }
    }
  }
  console.log('DONE')
}

main()
