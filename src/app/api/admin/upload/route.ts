import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'
import { STORAGE_BUCKET, storageUrl } from '@/lib/storage'
import { IMAGE_TYPES as EXTENSIONS, MAX_IMAGE_BYTES as MAX_BYTES } from '@/lib/media'

const FOLDERS = new Set(['products', 'site', 'categories'])

// POST /api/admin/upload — multipart { file, folder? } → { url }
// Stores the image in the public `fankari` bucket under images/<folder>/.
// Each upload gets a fresh name (never overwrites), so a replaced image never
// breaks old order snapshots and is never served stale from the CDN.
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

    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Choose an image to upload' }, { status: 400 })
    }
    const ext = EXTENSIONS[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Use a JPG, PNG, WebP, AVIF or GIF image' },
        { status: 400 },
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Images must be 5 MB or smaller' }, { status: 400 })
    }
    const folderParam = form?.get('folder')
    const folder =
      typeof folderParam === 'string' && FOLDERS.has(folderParam) ? folderParam : 'products'

    const path = `images/${folder}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: '31536000' })
    if (error) {
      console.error('POST /api/admin/upload storage error:', error.message)
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({ url: storageUrl(path) }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/upload error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
