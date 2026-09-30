'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const router = useRouter()
  const supabase = createClient()

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
          <h1 className="text-2xl font-bold text-paper mb-1">Welcome back</h1>
          <p className="text-muted text-sm">Sign in to your Voxabase account</p>
        </div>

        <form onSubmit={handleLogin} className="bg-ink-2 border border-rule rounded-xl p-8 flex flex-col gap-4">
          {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">{error}</div>}
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
      </div>
    </main>
  )
}