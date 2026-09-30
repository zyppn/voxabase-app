'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CodeInput from '@/app/_components/CodeInput'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [mfaFactor, setMfaFactor] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [signedOutNote] = useState(() => {
    if (typeof window === 'undefined') return ''
    const q = new URLSearchParams(window.location.search)
    if (q.get('expired') === '1') return 'You were signed out after 7 days without activity. Sign in to continue.'
    if (q.get('signedout') === 'all') return 'You’ve been signed out of all devices.'
    return ''
  })
  const router = useRouter()
  const supabase = createClient()

  // Accounts with two-step verification need a code after the password
  const needsSecondStep = async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const id = factors?.totp?.[0]?.id
      if (id) { setMfaFactor(id); return true }
    }
    return false
  }

  useEffect(() => {
    // Sent here from a protected page: already signed in, only the code is missing
    if (new URLSearchParams(window.location.search).get('mfa') !== '1') return
    let active = true
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(async ({ data }) => {
      if (!active || !data || data.nextLevel !== 'aal2' || data.currentLevel === 'aal2') return
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const id = factors?.totp?.[0]?.id
      if (active && id) setMfaFactor(id)
    })
    return () => { active = false }
  }, [supabase])

  const verifyCode = async (code: string) => {
    if (!mfaFactor || loading) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactor, code })
    if (error) {
      setError('That code didn’t match. Try the newest one.')
      setMfaCode('')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handleMfa = (e: React.FormEvent) => {
    e.preventDefault()
    if (mfaCode.length === 6) verifyCode(mfaCode)
  }

  const backToSignIn = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    setMfaFactor(null); setMfaCode(''); setError(''); setPassword('')
    window.history.replaceState(null, '', '/login')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setUnconfirmed(false)
    setResend('idle')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Supabase refuses sign-in until the signup link is clicked; say so instead of "wrong password"
      if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message)) {
        setUnconfirmed(true)
      } else {
        setError('Invalid email or password. Please try again.')
      }
      setLoading(false)
    } else if (await needsSecondStep()) {
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const resendConfirmation = async () => {
    setResend('sending')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setResend(error ? 'failed' : 'sent')
  }

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-4 relative overflow-hidden">

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src="/vblogo.png" alt="Voxabase" className="h-10 w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-paper mb-1">{mfaFactor ? 'Two-step verification' : 'Welcome back'}</h1>
          <p className="text-muted text-sm">{mfaFactor ? 'One more step to keep your account safe' : 'Sign in to your Voxabase account'}</p>
        </div>

        {mfaFactor ? (
        <form onSubmit={handleMfa} className="bg-ink-2 border border-rule rounded-xl p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-accent-text" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-paper font-semibold text-lg mb-1.5">Enter your verification code</h2>
          <p className="text-sm text-muted mb-6 max-w-sm text-balance">Open your authenticator app and enter the 6&#8209;digit code for Voxabase.</p>
          <CodeInput id="mfa-code" label="6-digit verification code" value={mfaCode} autoFocus
            onChange={(v) => { setMfaCode(v); if (error) setError('') }}
            onComplete={verifyCode} disabled={loading} invalid={!!error} />
          <div aria-live="polite" className="min-h-6 mt-3 text-sm">
            {error ? <p className="text-red-400">{error}</p> : loading ? <p className="text-muted">Verifying…</p> : null}
          </div>
          <button type="submit" disabled={loading || mfaCode.length !== 6}
            className="w-full bg-paper hover:bg-white text-ink font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 mt-2 text-sm">
            {loading ? 'Verifying...' : 'Verify and sign in'}
          </button>
          <div className="w-full flex items-center justify-between gap-3 mt-5 pt-5 border-t border-rule text-xs">
            <button type="button" onClick={backToSignIn} className="text-muted hover:text-paper">← Use a different account</button>
            <a href="mailto:support@voxabase.com?subject=Lost%20authenticator" className="text-accent-text hover:underline">Lost your authenticator?</a>
          </div>
        </form>
        ) : (
        <form onSubmit={handleLogin} className="bg-ink-2 border border-rule rounded-xl p-8 flex flex-col gap-4">
          {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">{error}</div>}
          {signedOutNote && !error && (
            <div role="status" className="text-sm bg-accent/10 border border-accent/25 rounded-lg p-3 text-paper">{signedOutNote}</div>
          )}
          {unconfirmed && (
            <div role="status" className="text-sm bg-accent/10 border border-accent/25 rounded-lg p-3 text-paper">
              <p>Please confirm your email first. We sent a confirmation link to <span className="font-semibold">{email}</span> when you signed up.</p>
              {resend === 'sent' ? (
                <p className="mt-2 text-accent-text">New link sent. Check your inbox (and spam).</p>
              ) : (
                <button
                  type="button"
                  onClick={resendConfirmation}
                  disabled={resend === 'sending'}
                  className="mt-2 text-accent-text font-semibold hover:underline disabled:opacity-50"
                >
                  {resend === 'sending' ? 'Sending...' : resend === 'failed' ? 'Could not send. Try again' : 'Resend the link'}
                </button>
              )}
            </div>
          )}
          <div>
            <label className="text-sm text-muted mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-ink border border-rule rounded-lg px-4 py-3 text-paper placeholder:text-faint focus:outline-none focus:border-accent transition-colors text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-muted">Password</label>
              <Link href="/forgot-password" className="text-xs text-accent-text hover:underline">Forgot password?</Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-ink border border-rule rounded-lg px-4 py-3 text-paper placeholder:text-faint focus:outline-none focus:border-accent transition-colors text-sm"
              placeholder="Your password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-paper hover:bg-white text-ink font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 mt-1 text-sm shadow-lg shadow-black/30"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-faint text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-accent-text hover:underline font-medium">Create one</Link>
          </p>
        </form>
        )}
      </div>
    </main>
  )
}