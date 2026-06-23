'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    // Listen for the PASSWORD_RECOVERY event which fires when
    // Supabase processes the token from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true)
        setError('')
      }
    })

    // Also check if already in a valid session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
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
    <main className="min-h-screen bg-[#090909] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52'%3E%3Cpolygon points='30,2 58,17 58,47 30,62 2,47 2,17' fill='none' stroke='%238b3cf7' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: '60px 52px'
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle, #8b3cf7, transparent 70%)'}} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src="/vblogo.png" alt="VoxaBase" className="h-10 w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
          <p className="text-gray-400 text-sm">Choose a strong password for your account</p>
        </div>

        {done ? (
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-green-400/10 border border-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Password updated</h2>
            <p className="text-gray-400 text-sm">Redirecting you to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#111114] border border-[#1e1e24] rounded-xl p-8 flex flex-col gap-4">
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                {error}
                {error.includes('link from your email') && (
                  <Link href="/forgot-password" className="block mt-1 text-[#8b3cf7] hover:underline">
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
              <label className="text-sm text-gray-400 mb-1.5 block">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
                placeholder="8+ characters"
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${strength.score >= i ? strength.color : 'bg-[#1e1e24]'}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${strength.score <= 1 ? 'text-red-400' : strength.score <= 2 ? 'text-yellow-400' : strength.score <= 3 ? 'text-blue-400' : 'text-green-400'}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full bg-[#090909] border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm ${
                  confirmPassword.length > 0
                    ? password === confirmPassword ? 'border-green-500' : 'border-red-500'
                    : 'border-[#1e1e24]'
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
              className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm shadow-lg shadow-purple-900/30 mt-1"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>

            <p className="text-center text-gray-500 text-sm">
              <Link href="/login" className="text-[#8b3cf7] hover:underline">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}