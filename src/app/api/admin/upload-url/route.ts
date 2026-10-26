import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'
import { STORAGE_BUCKET, storageUrl } from '@/lib/storage'
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  VIDEO_TYPES,
} from '@/lib/media'

// POST /api/admin/upload-url { contentType, size } → { uploadUrl, url, type }
// Product gallery uploads go straight from the browser to Supabase Storage
// through a one-time signed URL — videos are far larger than a serverless
// request body allows. Files land in the public `fankari` bucket under
// images/products/ or videos/products/ with a fresh name (never overwritten).
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
    const contentType = typeof body?.contentType === 'string' ? body.contentType : ''
    const size = typeof body?.size === 'number' ? body.size : NaN

    const isVideo = contentType in VIDEO_TYPES
    const ext = IMAGE_TYPES[contentType] ?? VIDEO_TYPES[contentType]
    if (!ext) {
      return NextResponse.json(
        { error: 'Use a JPG, PNG, WebP, AVIF or GIF image, or an MP4, WebM or MOV video' },
        { status: 400 },
      )
    }
    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: 'Choose a file to upload' }, { status: 400 })
    }
    if (size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
      return NextResponse.json(
        { error: isVideo ? 'Videos must be 50 MB or smaller' : 'Images must be 5 MB or smaller' },
        { status: 400 },
      )
    }

    const path = `${isVideo ? 'videos' : 'images'}/products/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(path)
    if (error || !data) {
      console.error('POST /api/admin/upload-url storage error:', error?.message)
      return NextResponse.json(
        { error: `Upload failed: ${error?.message ?? 'no upload URL'}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      url: storageUrl(path),
      type: isVideo ? 'video' : 'image',
    })
  } catch (err) {
    console.error('POST /api/admin/upload-url error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
