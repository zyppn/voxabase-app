import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const username = user.user_metadata?.username
      if (username) {
        await supabase
          .from('profiles')
          .update({ username })
          .eq('id', user.id)
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
