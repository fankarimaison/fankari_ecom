import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSchemaMissing } from '@/lib/auth'
import { setupRequiredResponse } from '@/lib/dto'

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/contact { name, phone, email, message } — public "Contact us" form
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const name = str(body.name)
    const phone = str(body.phone)
    const email = str(body.email)
    const message = str(body.message)

    if (!name || name.length > 120)
      return NextResponse.json({ error: 'Please tell us your name' }, { status: 400 })
    if (phone.replace(/\D/g, '').length < 8 || phone.length > 30)
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 })
    if (!EMAIL_RE.test(email) || email.length > 200)
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
    if (!message || message.length > 4000)
      return NextResponse.json(
        { error: 'Please write a message (up to 4000 characters)' },
        { status: 400 },
      )

    const supabase = await createClient()
    const { error } = await supabase.rpc('submit_contact_request', {
      p_name: name,
      p_phone: phone,
      p_email: email,
      p_message: message,
    })
    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      console.error('POST /api/contact rpc error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/contact error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
