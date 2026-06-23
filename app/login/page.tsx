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
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    } else {
      router.push('/dashboard')
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
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to your VoxaBase account</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#111114] border border-[#1e1e24] rounded-xl p-8 flex flex-col gap-4">
          {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">{error}</div>}
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] transition-colors text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-gray-400">Password</label>
              <Link href="/forgot-password" className="text-xs text-[#8b3cf7] hover:underline">Forgot password?</Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] transition-colors text-sm"
              placeholder="Your password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 mt-1 text-sm shadow-lg shadow-purple-900/30"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-gray-500 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#8b3cf7] hover:underline font-medium">Create one</Link>
          </p>
        </form>
      </div>
    </main>
  )
}