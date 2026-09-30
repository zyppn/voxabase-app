'use client'
// Optional two-step verification (TOTP authenticator apps), backed by Supabase MFA.
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type Enrolling = { factorId: string; qr: string; secret: string }

export default function TwoStepCard() {
  const supabase = createClient()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmOff, setConfirmOff] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactorId(data?.totp?.[0]?.id ?? null)
    setLoaded(true)
    return data
  }, [supabase])

  useEffect(() => {
    let active = true
    supabase.auth.mfa.listFactors().then(({ data }) => {
      if (!active) return
      setFactorId(data?.totp?.[0]?.id ?? null)
      setLoaded(true)
    })
    return () => { active = false }
  }, [supabase])

  const start = async () => {
    setBusy(true); setError(''); setNotice('')
    // Clear any half-finished setup from an earlier attempt
    const data = await load()
    for (const f of data?.all ?? []) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    const { data: enrolled, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16)}`,
    })
    setBusy(false)
    if (error || !enrolled) { setError('Could not start setup. Please try again.'); return }
    setEnrolling({ factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret })
    setCode('')
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrolling) return
    setBusy(true); setError('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.factorId, code: code.trim() })
    setBusy(false)
    if (error) { setError('That code didn’t match. Check your app and try the newest code.'); return }
    setEnrolling(null)
    setNotice('Two-step verification is on. You’ll enter a code from your app when you sign in.')
    await load()
  }

  const cancel = async () => {
    if (enrolling) await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId })
    setEnrolling(null); setCode(''); setError('')
  }

  const turnOff = async () => {
    if (!factorId) return
    setBusy(true); setError(''); setNotice('')
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    setBusy(false); setConfirmOff(false)
    if (error) { setError('Could not turn it off. Sign out, sign back in with your code, and try again.'); return }
    setNotice('Two-step verification is off.')
    await load()
  }

  return (
    <div className="bg-ink-2 border border-rule rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="font-semibold text-paper">Two-step verification</h2>
        {loaded && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${factorId ? 'bg-green-400/10 text-green-400' : 'bg-ink-3 text-faint'}`}>
            {factorId ? 'On' : 'Off'}
          </span>
        )}
      </div>
      <p className="text-sm text-muted mb-5">
        Ask for a 6-digit code from an authenticator app (Google Authenticator, 1Password, Authy) when you sign in.
      </p>

      {error && <div role="alert" className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-4">{error}</div>}
      {notice && <div role="status" className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg p-3 mb-4">{notice}</div>}

      {enrolling ? (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <ol className="text-sm text-muted flex flex-col gap-1 list-decimal pl-5">
            <li>Open your authenticator app and scan this code.</li>
            <li>Enter the 6-digit code it shows.</li>
          </ol>
          <div className="self-start bg-white rounded-xl p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrolling.qr} alt="QR code for your authenticator app" width={168} height={168} />
          </div>
          <p className="text-xs text-faint">
            Can’t scan? Enter this key instead: <span className="font-mono text-paper break-all select-all">{enrolling.secret}</span>
          </p>
          <div>
            <label htmlFor="totp-code" className="text-sm text-muted mb-1.5 block">6-digit code</label>
            <input id="totp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456"
              className="w-full bg-ink border border-rule-2 rounded-lg px-4 py-3 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm tracking-[0.3em]" />
          </div>
          <div className="flex gap-2.5">
            <button type="submit" disabled={busy || code.length !== 6}
              className="flex-1 bg-paper hover:bg-white text-ink font-semibold py-3 rounded-lg disabled:opacity-50 text-sm">
              {busy ? 'Checking...' : 'Turn on'}
            </button>
            <button type="button" onClick={cancel}
              className="px-5 border border-rule-2 hover:border-rule-3 text-muted hover:text-paper rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      ) : factorId ? (
        confirmOff ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-paper">Turn off two-step verification? Your account will only need a password to sign in.</p>
            <div className="flex gap-2.5">
              <button type="button" onClick={turnOff} disabled={busy}
                className="flex-1 bg-red-500/90 hover:bg-red-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50 text-sm">
                {busy ? 'Turning off...' : 'Yes, turn off'}
              </button>
              <button type="button" onClick={() => setConfirmOff(false)}
                className="px-5 border border-rule-2 hover:border-rule-3 text-muted hover:text-paper rounded-lg text-sm">Keep on</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmOff(true)}
            className="w-full bg-ink border border-rule-2 hover:border-rule-3 text-paper font-semibold py-3 rounded-lg text-sm">
            Turn off
          </button>
        )
      ) : (
        <button type="button" onClick={start} disabled={busy || !loaded}
          className="w-full bg-ink border border-rule-2 hover:border-rule-3 text-paper font-semibold py-3 rounded-lg disabled:opacity-50 text-sm">
          {busy ? 'Starting...' : 'Set up two-step verification'}
        </button>
      )}
    </div>
  )
}
