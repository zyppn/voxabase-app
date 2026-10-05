'use client'
// One-time Backblaze B2 setup (not linked from the app). Shows whether file
// storage is ready, and applies the bucket settings with the master key.
import { useEffect, useState } from 'react'

type Status = {
  configured?: boolean
  keyWorks?: boolean
  bucketFound?: boolean
  uploads?: boolean
  versions?: boolean
}

function Check({ ok, children }: { ok: boolean | undefined; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${ok ? 'bg-green-400/10 border-green-400/30 text-green-400' : 'bg-ink-3 border-rule-2 text-faint'}`}>
        {ok
          ? <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      </span>
      <span className={ok ? 'text-paper' : 'text-muted'}>{children}</span>
    </li>
  )
}

export default function StorageSetupPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [keyId, setKeyId] = useState('')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = () => fetch('/api/files/storage-setup').then((r) => r.json()).then(setStatus).catch(() => setStatus({}))
  useEffect(() => { load() }, [])

  const apply = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/files/storage-setup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ keyId, key }),
    }).catch(() => null)
    const j = res ? await res.json().catch(() => ({})) : {}
    setBusy(false)
    if (!res?.ok) { setError(j.error || 'Something went wrong. Please try again.'); return }
    setKey('')
    setKeyId('')
    load()
  }

  const ready = status?.configured && status.keyWorks && status.bucketFound && status.uploads && status.versions
  const input = 'w-full bg-ink-2 border border-rule-2 rounded-lg px-3 py-2.5 text-sm text-paper placeholder:text-faint focus:outline-none focus:border-rule-3'

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2 tracking-tight">File storage</h1>
        <p className="text-muted text-sm mb-6">Delivered files are stored in Backblaze B2. This page checks the setup and applies the bucket settings once.</p>

        <div className="border border-rule bg-card rounded-xl p-5 mb-6">
          {!status ? <p className="text-sm text-muted">Checking…</p> : (
            <ul>
              <Check ok={status.configured}>B2 settings added in Vercel</Check>
              <Check ok={status.keyWorks}>Application key works</Check>
              <Check ok={status.bucketFound}>Bucket found</Check>
              <Check ok={status.uploads}>Uploads allowed from the app</Check>
              <Check ok={status.versions}>Deleted files are removed for good</Check>
            </ul>
          )}
        </div>

        {ready ? (
          <p className="text-sm text-green-400">All set. New uploads go to Backblaze.</p>
        ) : status?.configured && status.keyWorks && status.bucketFound ? (
          <form onSubmit={apply} className="border border-rule bg-card rounded-xl p-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-paper">Apply bucket settings</p>
              <p className="mt-1 text-xs leading-relaxed text-faint">
                The app&rsquo;s own key can&rsquo;t change bucket settings, so this needs your <strong>Master Application Key</strong> once.
                It&rsquo;s used for this one request and isn&rsquo;t saved anywhere.
              </p>
            </div>
            <input className={input} placeholder="keyID" value={keyId} onChange={(e) => setKeyId(e.target.value)} autoComplete="off" spellCheck={false} />
            <input className={input} placeholder="applicationKey" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button disabled={busy || !keyId || !key} className="w-full bg-paper hover:bg-paper-hover text-ink font-semibold px-6 py-3 rounded-lg text-sm disabled:opacity-50">
              {busy ? 'Applying…' : 'Apply settings'}
            </button>
          </form>
        ) : status && (
          <p className="text-sm text-muted">
            {!status.configured ? 'Add B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET, B2_ENDPOINT and B2_REGION in Vercel, then redeploy.'
              : !status.keyWorks ? 'Backblaze didn’t accept the key in Vercel. Check B2_KEY_ID and B2_APPLICATION_KEY.'
              : 'Check that B2_BUCKET matches the bucket name exactly, and that the key has access to it.'}
          </p>
        )}
      </div>
    </div>
  )
}
