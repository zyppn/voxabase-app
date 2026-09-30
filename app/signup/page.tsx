'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
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

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const strength = getPasswordStrength(password)

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFullName(val)
    const suggested = val.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20)
    setUsername(suggested)
    if (suggested.length >= 3) checkUsername(suggested)
    else setUsernameAvailable(null)
  }

  const checkUsername = async (val: string) => {
    if (val.length < 3) { setUsernameAvailable(null); return }
    setCheckingUsername(true)
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', val)
      .maybeSingle()
    setUsernameAvailable(data === null)
    setCheckingUsername(false)
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setUsername(val)
    if (val.length >= 3) checkUsername(val)
    else setUsernameAvailable(null)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (strength.score < 2) { setError('Please choose a stronger password'); return }
    if (usernameAvailable !== true) { setError('Please choose an available username'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, business_name: businessName, username },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) {
      if (
        error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already exists') ||
        error.message?.toLowerCase().includes('user already')
      ) {
        setError('An account with this email already exists.')
      } else {
        setError(error.message || JSON.stringify(error))
      }
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center px-4 relative overflow-hidden">
        <div className="text-center max-w-md relative z-10">
          <img src="/vblogo.png" alt="VoxaBase" className="h-10 w-auto mx-auto mb-6" />
          <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-accent-text" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-paper mb-3">Check your email</h1>
          <p className="text-muted mb-2">We sent a confirmation link to <span className="text-paper">{email}</span>.</p>
          <p className="text-faint text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-accent-text hover:underline">Sign in instead</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-4 py-12 relative overflow-hidden">

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src="/vblogo.png" alt="VoxaBase" className="h-10 w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-paper mb-1">Create your account</h1>
          <p className="text-muted text-sm">Start delivering work like a studio</p>
        </div>

        <form onSubmit={handleSignup} className="bg-ink-2 border border-rule rounded-xl p-8 flex flex-col gap-4">
          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              {error}
              {error.includes('already exists') && (
                <span> <Link href="/login" className="underline font-semibold">Sign in here</Link></span>
              )}
            </div>
          )}

          <div>
            <label className="text-sm text-muted mb-1.5 block">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={handleFullNameChange}
              required
              className="w-full bg-ink border border-rule rounded-lg px-4 py-3 text-paper placeholder:text-faint focus:outline-none focus:border-accent transition-colors text-sm"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="text-sm text-muted mb-1.5 block">
              Username <span className="text-faint text-xs">— your portal URL</span>
            </label>
            <div className="flex items-center bg-ink border border-rule rounded-lg px-4 py-3 focus-within:border-accent transition-colors">
              <span className="text-faint text-sm">voxabase.com/</span>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                required
                minLength={3}
                className="flex-1 bg-transparent text-paper placeholder:text-faint focus:outline-none text-sm"
                placeholder="yourname"
              />
              {checkingUsername && <span className="text-faint text-xs ml-2">checking...</span>}
              {!checkingUsername && usernameAvailable === true && <span className="text-green-400 text-xs font-semibold ml-2">Available</span>}
              {!checkingUsername && usernameAvailable === false && <span className="text-red-400 text-xs font-semibold ml-2">Taken</span>}
            </div>
            <p className="text-xs text-faint mt-1">Lowercase letters, numbers, and hyphens only. Cannot be changed.</p>
          </div>

          <div>
            <label className="text-sm text-muted mb-1.5 block">
              Business name <span className="text-faint text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-ink border border-rule rounded-lg px-4 py-3 text-paper placeholder:text-faint focus:outline-none focus:border-accent transition-colors text-sm"
              placeholder="Studio Novo"
            />
          </div>

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
            <label className="text-sm text-muted mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-ink border border-rule rounded-lg px-4 py-3 text-paper placeholder:text-faint focus:outline-none focus:border-accent transition-colors text-sm"
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
            <label className="text-sm text-muted mb-1.5 block">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full bg-ink border rounded-lg px-4 py-3 text-paper placeholder:text-faint focus:outline-none focus:border-accent transition-colors text-sm ${
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
            disabled={loading || usernameAvailable !== true || password !== confirmPassword || strength.score < 2}
            className="w-full bg-paper hover:bg-white text-ink font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 mt-1 text-sm shadow-lg shadow-black/30"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-faint text-[11px] leading-relaxed whitespace-nowrap">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-muted hover:text-paper underline">Terms of Service</Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-muted hover:text-paper underline">Privacy Policy</Link>.
          </p>

          <p className="text-center text-faint text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-accent-text hover:underline font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  )
}