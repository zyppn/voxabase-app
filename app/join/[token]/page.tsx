'use client'
// Team invite landing page: sign in (or sign up) with the invited email, then join.
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Logo from '@/app/_components/Logo'

type Invite = { ownerLabel: string; email: string; status: string }

export default function JoinTeamPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [invite, setInvite] = useState<Invite | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const next = `/join/${token}`

  useEffect(() => {
    fetch(`/api/team/join?token=${encodeURIComponent(token)}`)
      .then(async (r) => (r.ok ? setInvite(await r.json()) : setInvalid(true)))
      .catch(() => setInvalid(true))
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
  }, [token, supabase])

  const join = async () => {
    setBusy(true); setError('')
    const res = await fetch('/api/team/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { router.push('/dashboard?joined=1'); router.refresh(); return }
    if (res.status === 401 && /two-step/i.test(data.error || '')) { router.push(`/login?mfa=1&next=${encodeURIComponent(next)}`); return }
    setError(data.error || 'Could not join the team. Please try again.')
    setBusy(false)
  }

  const switchAccount = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    setUserEmail(null); setError('')
  }

  const loading = !invalid && (!invite || userEmail === undefined)
  const matches = !!invite && !!userEmail && userEmail.toLowerCase() === invite.email.toLowerCase()
  const q = `next=${encodeURIComponent(next)}${invite ? `&email=${encodeURIComponent(invite.email)}` : ''}`

  return (
    <main className="vb-app min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Logo className="h-[26px] w-auto mx-auto mb-8" />
        <div className="bg-ink-2 border border-rule rounded-xl p-8 text-center">
          {loading ? (
            <div className="py-6"><div className="w-6 h-6 mx-auto border-2 border-paper/60 border-t-transparent rounded-full animate-spin" /></div>
          ) : invalid || !invite ? (
            <>
              <h1 className="text-xl font-bold text-paper mb-2">This invite isn’t valid anymore</h1>
              <p className="text-sm text-muted">It may have been removed, or the team’s plan changed. Ask whoever invited you for a new link.</p>
              <Link href="/dashboard" className="inline-block mt-6 text-sm text-accent-text hover:underline">Go to your dashboard</Link>
            </>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-ink-3 border border-rule-2 grid place-items-center">
                <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
              </div>
              <h1 className="text-xl font-bold text-paper mb-2">Join {invite.ownerLabel} on Voxabase</h1>
              <p className="text-sm text-muted text-balance">
                You’ll be able to create portals, upload files and send deliveries for {invite.ownerLabel}.
                This invite is for <span className="text-paper font-medium">{invite.email}</span>.
              </p>

              {error && <p role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-sm text-red-400 text-left">{error}</p>}

              {matches ? (
                <button onClick={join} disabled={busy}
                  className="mt-6 w-full bg-paper hover:bg-paper-hover text-ink font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
                  {busy ? 'Joining…' : `Join ${invite.ownerLabel}`}
                </button>
              ) : userEmail ? (
                <>
                  <p className="mt-5 rounded-lg border border-rule bg-ink px-3 py-2.5 text-sm text-muted">
                    You’re signed in as <span className="text-paper">{userEmail}</span>. Switch to {invite.email} to accept.
                  </p>
                  <button onClick={switchAccount}
                    className="mt-4 w-full bg-paper hover:bg-paper-hover text-ink font-semibold py-2.5 rounded-lg text-sm">
                    Switch account
                  </button>
                </>
              ) : (
                <div className="mt-6 flex flex-col gap-2">
                  <Link href={`/signup?${q}`} className="w-full bg-paper hover:bg-paper-hover text-ink font-semibold py-2.5 rounded-lg text-sm">Create an account</Link>
                  <Link href={`/login?${q}`} className="w-full border border-rule-2 hover:border-rule-3 text-paper font-semibold py-2.5 rounded-lg text-sm">I already have an account</Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
