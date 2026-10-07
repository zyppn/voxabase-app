// Re-checks the signed-in user's password before a sensitive change, without
// touching their current session: the check signs in on a throwaway client and
// immediately revokes that temporary session.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { allow } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: '' }))
  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ ok: false, error: 'Enter your password.' }, { status: 400 })
  }

  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  // 10 tries every 10 minutes per account
  if (!(await allow(supabaseAdmin(), `verify:${user.id}`, 10, 10 * 60))) {
    return NextResponse.json({ ok: false, error: 'Too many attempts. Wait a few minutes and try again.' }, { status: 429 })
  }

  const temp = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { error } = await temp.auth.signInWithPassword({ email: user.email, password })
  if (error) return NextResponse.json({ ok: false, error: 'That password isn’t right.' }, { status: 401 })
  await temp.auth.signOut({ scope: 'local' })
  return NextResponse.json({ ok: true })
}
