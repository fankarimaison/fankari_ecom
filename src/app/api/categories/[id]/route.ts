import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'
import { UUID_RE } from '@/lib/dto'
import { mapCategory, parseCategoryInput, type CategoryRow } from '@/lib/categories'

type RouteContext = { params: Promise<{ id: string }> }

async function requireAdmin() {
  const supabase = await createClient()
  const user = await getSessionUser(supabase)
  if (!user) return { supabase, error: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) }
  if (user.role !== 'ADMIN') {
    return { supabase, error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }
  return { supabase, error: null }
}

// PUT /api/categories/[id] { name?, image?, sortOrder? } — ADMIN. A rename
// is applied to the category's products too.
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { supabase, error: denied } = await requireAdmin()
    if (denied) return denied

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const parsed = parseCategoryInput(
      (await req.json().catch(() => null)) as Record<string, unknown> | null,
      true,
    )
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { data: current } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .maybeSingle()
    if (!current) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('categories')
      .update(parsed.data)
      .eq('id', id)
      .select('id,name,image,sort_order')
      .single()
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
      }
      console.error('PUT /api/categories/[id] update error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    if (parsed.data.name && parsed.data.name !== current.name) {
      const { error: renameError } = await supabase
        .from('products')
        .update({ category: parsed.data.name })
        .eq('category', current.name)
      if (renameError) {
        console.error('PUT /api/categories/[id] product rename error:', renameError.message)
        return NextResponse.json(
          { error: 'Category renamed, but its products could not be updated — try saving again' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ category: mapCategory(data as CategoryRow) })
  } catch (err) {
    console.error('PUT /api/categories/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/categories/[id] — ADMIN; refused while products still use it
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { supabase, error: denied } = await requireAdmin()
    if (denied) return denied

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const { data: current } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .maybeSingle()
    if (!current) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category', current.name)
    if (countError) {
      console.error('DELETE /api/categories/[id] count error:', countError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (count) {
      return NextResponse.json(
        {
          error: `${count} product${count === 1 ? ' is' : 's are'} still in "${current.name}" — move ${count === 1 ? 'it' : 'them'} to another category first`,
        },
        { status: 409 },
      )
    }

    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      console.error('DELETE /api/categories/[id] delete error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/categories/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
