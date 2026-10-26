import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import {
  DEFAULT_CATEGORY_NAMES,
  mapCategory,
  parseCategoryInput,
  type CategoryRow,
} from '@/lib/categories'

// GET /api/categories — public, in display order
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('id,name,image,sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) {
      // Before schema.sql adds the table, fall back to the built-in names so
      // the shop keeps working
      if (isSchemaMissing(error)) {
        return NextResponse.json({
          categories: DEFAULT_CATEGORY_NAMES.map((name, i) => ({
            id: name,
            name,
            image: '',
            sortOrder: i + 1,
          })),
        })
      }
      console.error('GET /api/categories query error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    return NextResponse.json({ categories: ((data ?? []) as CategoryRow[]).map(mapCategory) })
  } catch (err) {
    console.error('GET /api/categories error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/categories { name, image?, sortOrder? } — ADMIN
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

    const parsed = parseCategoryInput(
      (await req.json().catch(() => null)) as Record<string, unknown> | null,
      false,
    )
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

    // New categories go last unless an order was given
    if (parsed.data.sort_order === undefined) {
      const { data: last } = await supabase
        .from('categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      parsed.data.sort_order = (last?.sort_order ?? 0) + 1
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(parsed.data)
      .select('id,name,image,sort_order')
      .single()
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
      }
      console.error('POST /api/categories insert error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ category: mapCategory(data as CategoryRow) }, { status: 201 })
  } catch (err) {
    console.error('POST /api/categories error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
