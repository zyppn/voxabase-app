import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Only allow safe, in-app relative paths as the post-exchange destination.
  const nextParam = searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // Send the user to the destination with a flag so the page can show a clear message.
      const failUrl = new URL(next, origin)
      failUrl.searchParams.set('error', 'exchange_failed')
      return NextResponse.redirect(failUrl.toString())
    }

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

  return NextResponse.redirect(`${origin}${next}`)
}
