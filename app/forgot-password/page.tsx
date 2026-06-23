'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

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
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <main className="min-h-screen bg-[#090909] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52'%3E%3Cpolygon points='30,2 58,17 58,47 30,62 2,47 2,17' fill='none' stroke='%238b3cf7' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: '60px 52px'
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle, #8b3cf7, transparent 70%)'}} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src="/vblogo.png" alt="VoxaBase" className="h-10 w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-1">Reset your password</h1>
          <p className="text-gray-400 text-sm">Enter your email and we will send you a reset link</p>
        </div>

        {sent ? (
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-[#8b3cf7]/10 border border-[#8b3cf7]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
            <p className="text-gray-400 text-sm mb-6">We sent a password reset link to <span className="text-white">{email}</span></p>
            <Link href="/login" className="text-[#8b3cf7] hover:underline text-sm">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#111114] border border-[#1e1e24] rounded-xl p-8 flex flex-col gap-4">
            {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">{error}</div>}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] transition-colors text-sm"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm shadow-lg shadow-purple-900/30"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <p className="text-center text-gray-500 text-sm">
              Remember your password?{' '}
              <Link href="/login" className="text-[#8b3cf7] hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
