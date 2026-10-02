'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/app/_components/Logo'

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-yellow-500' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-blue-500' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const strength = getPasswordStrength(password)

  useEffect(() => {
    let cancelled = false

    // The reset link points at /auth/callback, which exchanges the PKCE code
    // server-side and sets the auth cookies, then redirects here. So by the
    // time this page loads the session already exists in cookies and the
    // browser client just needs to read it. We also keep direct-link
    // fallbacks (code / token_hash / hash) in case a link skips the callback.
    const markReady = () => { if (!cancelled) { setSessionReady(true); setError('') } }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        markReady()
      }
    })

    const url = new URL(window.location.href)
    const exchangeFailed = url.searchParams.get('error') === 'exchange_failed'
    const code = url.searchParams.get('code')
    const token_hash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type')

    const establish = async () => {
      if (exchangeFailed) {
        if (!cancelled) setError('This reset link has expired or was already used. Please request a new one.')
        return
      }

      // Primary path: session already established by /auth/callback. Retry a
      // few times to allow the cookie-backed session to hydrate on the client.
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) { markReady(); return }
        await new Promise((r) => setTimeout(r, 300))
      }

      // Fallbacks for links that did not go through the server callback.
      try {
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
          if (!exErr) { markReady(); return }
          const { data: { session: after } } = await supabase.auth.getSession()
          if (after) { markReady(); return }
        } else if (token_hash && type) {
          const { error: otpErr } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
          if (!otpErr) { markReady(); return }
        } else {
          // Hash (#access_token) link — the listener above will handle it.
          return
        }
      } catch {
        /* fall through to error below */
      }

      if (!cancelled) setError('This reset link has expired or was already used. Please request a new one.')
    }

    establish()

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionReady) {
      setError('Session not ready. Please use the link from your email.')
      return
    }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (strength.score < 2) { setError('Please choose a stronger password'); return }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  return (
    <main className="vb-app min-h-screen bg-ink flex items-center justify-center px-4 relative overflow-hidden">

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Logo className="h-[26px] w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-paper mb-1">Set new password</h1>
          <p className="text-muted text-sm">Choose a strong password for your account</p>
        </div>

        {done ? (
          <div className="bg-ink-2 border border-rule rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-green-400/10 border border-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-paper mb-2">Password updated</h2>
            <p className="text-muted text-sm">Redirecting you to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-ink-2 border border-rule rounded-xl p-8 flex flex-col gap-4">
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                {error}
                {error.includes('link from your email') && (
                  <Link href="/forgot-password" className="block mt-1 text-accent-text hover:underline">
                    Request a new reset link
                  </Link>
                )}
              </div>
            )}

            {!sessionReady && !error && (
              <div className="text-yellow-400 text-sm bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
                Waiting for session... Make sure you clicked the link from your email.
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="text-sm text-muted mb-1.5 block">New password</label>
              <input id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-ink border border-rule rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm"
                placeholder="8+ characters"
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${strength.score >= i ? strength.color : 'bg-ink-3'}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${strength.score <= 1 ? 'text-red-400' : strength.score <= 2 ? 'text-yellow-400' : strength.score <= 3 ? 'text-blue-400' : 'text-green-400'}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="text-sm text-muted mb-1.5 block">Confirm new password</label>
              <input id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full bg-ink border rounded-lg px-4 py-3 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm ${
                  confirmPassword.length > 0
                    ? password === confirmPassword ? 'border-green-500' : 'border-red-500'
                    : 'border-rule'
                }`}
                placeholder="Re-enter your password"
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !sessionReady || password !== confirmPassword || password.length < 8 || strength.score < 2}
              className="w-full bg-paper hover:bg-paper-hover text-ink font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm shadow-lg shadow-black/30 mt-1"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>

            <p className="text-center text-faint text-sm">
              <Link href="/login" className="text-accent-text hover:underline">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}