'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import Logo from '@/app/_components/Logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <main className="vb-app min-h-screen bg-ink flex items-center justify-center px-4 relative overflow-hidden">

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Logo className="h-[26px] w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-paper mb-1">Reset your password</h1>
          <p className="text-muted text-sm">Enter your email and we will send you a reset link</p>
        </div>

        {sent ? (
          <div className="bg-ink-2 border border-rule rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-ink-3 border border-rule-2 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-paper mb-2">Check your email</h2>
            <p className="text-muted text-sm mb-6">We sent a password reset link to <span className="text-paper">{email}</span></p>
            <Link href="/login" className="text-accent-text hover:underline text-sm">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-ink-2 border border-rule rounded-xl p-8 flex flex-col gap-4">
            {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">{error}</div>}
            <div>
              <label htmlFor="forgot-email" className="text-sm text-muted mb-1.5 block">Email address</label>
              <input id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-ink border border-rule rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent transition-colors text-sm"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-paper hover:bg-paper-hover text-ink font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm shadow-lg shadow-black/30"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <p className="text-center text-faint text-sm">
              Remember your password?{' '}
              <Link href="/login" className="text-accent-text hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
