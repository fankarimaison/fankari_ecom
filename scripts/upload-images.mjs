// Uploads every file in public/images to the Supabase Storage bucket
// (fankari/images/<name>), overwriting existing objects.
//
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (never commit it — the
// publishable key cannot write to storage).
//
//   npm run images:upload

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) process.loadEnvFile(file)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (add the key to .env.local).')
  process.exit(1)
}

const BUCKET = 'fankari'
const DIR = 'public/images'
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' }

let failed = 0
for (const name of readdirSync(DIR)) {
  const type = TYPES[extname(name).toLowerCase()]
  if (!type) continue
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/images/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': type, 'x-upsert': 'true' },
    body: readFileSync(join(DIR, name)),
  })
  if (res.ok) {
    console.log(`✓ ${name} → ${url}/storage/v1/object/public/${BUCKET}/images/${name}`)
  } else {
    failed++
    console.error(`✗ ${name}: ${res.status} ${await res.text()}`)
  }
}
process.exit(failed ? 1 : 0)
