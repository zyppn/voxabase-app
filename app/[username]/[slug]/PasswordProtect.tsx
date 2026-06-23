'use client'
import { useState } from 'react'

export default function PasswordProtectPage({
  onUnlock,
}: {
  onUnlock: () => void
}) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/verify-portal-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: input }),
    })
    const data = await res.json()
    if (data.valid) {
      onUnlock()
    } else {
      setError('Incorrect password. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#090909] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#1a0d30] border border-[#8b3cf7]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Password protected</h1>
          <p className="text-gray-400 text-sm">Enter the password to access this portal</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#111114] border border-[#1e1e24] rounded-xl p-6 flex flex-col gap-4">
          {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">{error}</div>}
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            required
            autoFocus
            className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
            placeholder="Enter portal password"
          />
          <button
            type="submit"
            className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            Unlock portal
          </button>
        </form>
      </div>
    </div>
  )
}
