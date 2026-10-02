'use client'
// Ends every session for this account (all browsers and devices), then returns to login.
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { IDLE_LIMIT_MS } from '@/lib/useIdleSignOut'

export default function SessionsCard() {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const days = Math.round(IDLE_LIMIT_MS / 86_400_000)

  const signOutEverywhere = async () => {
    setBusy(true); setError('')
    const { error } = await createClient().auth.signOut({ scope: 'global' })
    if (error) { setBusy(false); setError('Could not sign out everywhere. Please try again.'); return }
    window.location.href = '/login?signedout=all'
  }

  return (
    <div className="border border-rule rounded-xl p-6 flex flex-col">
      <h2 className="font-semibold text-paper mb-2">Sessions</h2>
      <p className="text-sm text-muted mb-5 flex-grow">
        You’re signed out automatically after {days} days without activity. Left your account open somewhere? Sign out of every device at once.
      </p>
      {error && <div role="alert" className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-4">{error}</div>}
      {confirming ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-paper">Sign out of all devices, including this one?</p>
          <div className="flex gap-2.5">
            <button type="button" onClick={signOutEverywhere} disabled={busy}
              className="flex-1 bg-paper hover:bg-paper-hover text-ink font-semibold py-2.5 rounded-lg disabled:opacity-50 text-sm">
              {busy ? 'Signing out...' : 'Yes, sign out everywhere'}
            </button>
            <button type="button" onClick={() => setConfirming(false)}
              className="px-5 border border-rule-2 hover:border-rule-3 text-muted hover:text-paper rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)}
          className="w-full bg-ink border border-rule-2 hover:border-rule-3 text-paper font-semibold py-2.5 rounded-lg text-sm">
          Sign out of all devices
        </button>
      )}
    </div>
  )
}
