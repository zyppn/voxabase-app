'use client'
// Team seats (Agency): invite teammates, share their join link, remove them,
// and leave teams you've been added to.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { TEAM_SEATS, readWorkspaceCookie, setWorkspaceCookie } from '@/lib/workspace'

type Row = { id: string; email: string; status: 'pending' | 'active'; token: string; invited_at: string; joined_at: string | null }
type Membership = { id: string; owner_id: string; owner_label: string | null }

const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function TeamCard({ plan }: { plan: string }) {
  const [supabase] = useState(() => createClient())
  const [rows, setRows] = useState<Row[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loaded, setLoaded] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [justInvited, setJustInvited] = useState<string | null>(null)
  const isAgency = plan === 'agency'

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: mine }, { data: onTeams }] = await Promise.all([
        supabase.from('team_members').select('id, email, status, token, invited_at, joined_at').eq('owner_id', user.id).order('invited_at'),
        supabase.from('team_members').select('id, owner_id, owner_label').eq('member_id', user.id).eq('status', 'active'),
      ])
      if (!active) return
      setRows((mine || []) as Row[])
      setMemberships((onTeams || []) as Membership[])
      setLoaded(true)
    }
    load()
    return () => { active = false }
  }, [supabase])

  const link = (token: string) => `${window.location.origin}/join/${token}`

  const copy = async (row: Row) => {
    try { await navigator.clipboard.writeText(link(row.token)) } catch { return }
    setCopiedId(row.id)
    setTimeout(() => setCopiedId((c) => (c === row.id ? null : c)), 2000)
  }

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    const res = await fetch('/api/team/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error || 'Could not send the invite. Please try again.'); return }
    setEmail('')
    setRows((r) => [...r, data.invite])
    setJustInvited(data.invite.id)
  }

  const remove = async (id: string) => {
    setBusy(true)
    const { error } = await supabase.from('team_members').delete().eq('id', id)
    setBusy(false); setConfirmId(null)
    if (error) { setError('Could not remove them. Please try again.'); return }
    setRows((r) => r.filter((x) => x.id !== id))
  }

  const leave = async (m: Membership) => {
    setBusy(true)
    const { error } = await supabase.from('team_members').delete().eq('id', m.id)
    setBusy(false); setConfirmId(null)
    if (error) { setError('Could not leave the team. Please try again.'); return }
    setMemberships((list) => list.filter((x) => x.id !== m.id))
    if (readWorkspaceCookie() === m.owner_id) setWorkspaceCookie(null)
  }

  const mailto = (row: Row) =>
    `mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent('Join our team on Voxabase')}&body=${encodeURIComponent(`Hi! I've added you to our team on Voxabase. Use this link to join:\n\n${link(row.token)}\n\nSign in (or create an account) with ${row.email} to accept.`)}`

  const used = rows.length
  const full = used >= TEAM_SEATS

  return (
    <div className="mt-5 bg-ink-2 border border-rule rounded-xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h2 className="font-semibold text-paper flex items-center gap-2">
          Team
          {!isAgency && <span className="text-[11px] font-semibold text-accent-text border border-accent/30 bg-accent-soft px-2 py-0.5 rounded-full">Agency</span>}
        </h2>
        {isAgency && <span className="text-xs text-faint">{used} of {TEAM_SEATS} seats used</span>}
      </div>

      {isAgency ? (
        <p className="text-sm text-muted mb-5 max-w-2xl">
          Invite up to {TEAM_SEATS} teammates. They can create portals, upload files and send deliveries in your workspace.
          Only you can delete portals or manage billing, Stripe, branding and the team.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <p className="text-sm text-muted">Invite up to {TEAM_SEATS} teammates to work on your portals with you.</p>
          <Link href="/pricing" className="text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-3.5 py-2 rounded-lg">See Agency</Link>
        </div>
      )}

      {!isAgency && rows.length > 0 && (
        <p className="mt-3 text-sm text-amber-400/90">Your teammates can’t open your workspace while you’re off the Agency plan. They’ll get access back when you upgrade.</p>
      )}

      {error && <div role="alert" className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-4">{error}</div>}

      {isAgency && (
        <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2.5 mb-5">
          <label htmlFor="team-email" className="sr-only">Teammate’s email</label>
          <input id="team-email" type="email" required value={email} disabled={full}
            onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
            placeholder={full ? 'All seats are in use' : 'teammate@yourstudio.com'}
            className="flex-1 bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper text-sm placeholder:text-faint focus:outline-none focus:border-accent disabled:opacity-50" />
          <button type="submit" disabled={busy || full || !email}
            className="bg-paper hover:bg-white text-ink font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50">
            {busy ? 'Inviting…' : 'Invite'}
          </button>
        </form>
      )}

      {loaded && rows.length > 0 && (
        <ul className="divide-y divide-rule border border-rule rounded-lg">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span aria-hidden="true" className="w-8 h-8 rounded-full bg-ink-3 border border-rule-2 grid place-items-center text-xs font-bold text-paper flex-shrink-0">
                  {row.email[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-paper truncate">{row.email}</p>
                  <p className="text-xs text-faint flex items-center gap-1.5">
                    <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${row.status === 'active' ? 'bg-green-400' : 'bg-amber-400'}`} />
                    {row.status === 'active' ? `Joined ${row.joined_at ? fmt(row.joined_at) : ''}` : `Invited ${fmt(row.invited_at)} · waiting to join`}
                  </p>
                </div>
                {confirmId === row.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{row.status === 'active' ? 'Remove from team?' : 'Cancel invite?'}</span>
                    <button onClick={() => remove(row.id)} disabled={busy} className="text-xs font-semibold text-red-400 hover:bg-red-400/10 border border-red-400/30 px-3 py-1.5 rounded-lg">Yes</button>
                    <button onClick={() => setConfirmId(null)} className="text-xs text-muted hover:text-paper border border-rule-2 px-3 py-1.5 rounded-lg">No</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {row.status === 'pending' && isAgency && (
                      <>
                        <button onClick={() => copy(row)} className="text-xs text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-3 py-1.5 rounded-lg">
                          {copiedId === row.id ? 'Copied' : 'Copy invite link'}
                        </button>
                        <a href={mailto(row)} className="hidden sm:inline-block text-xs text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-3 py-1.5 rounded-lg">Email it</a>
                      </>
                    )}
                    <button onClick={() => setConfirmId(row.id)} className="text-xs text-muted hover:text-red-400 px-2 py-1.5">Remove</button>
                  </div>
                )}
              </div>
              {justInvited === row.id && row.status === 'pending' && (
                <p className="mt-2.5 ml-11 text-xs text-muted">
                  Invite created. Send them the link with <span className="text-paper">Copy invite link</span> or <span className="text-paper">Email it</span>. They sign in with {row.email} to join.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {loaded && isAgency && rows.length === 0 && (
        <p className="text-sm text-faint">No teammates yet.</p>
      )}

      {memberships.length > 0 && (
        <div className={isAgency || rows.length ? 'mt-6 pt-5 border-t border-rule' : 'mt-5'}>
          <h3 className="text-sm font-semibold text-paper mb-2">Teams you’re on</h3>
          <ul className="flex flex-col gap-2">
            {memberships.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 bg-ink border border-rule rounded-lg px-4 py-3">
                <span className="text-sm text-paper">{m.owner_label || 'Team'}</span>
                {confirmId === m.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Leave this team?</span>
                    <button onClick={() => leave(m)} disabled={busy} className="text-xs font-semibold text-red-400 hover:bg-red-400/10 border border-red-400/30 px-3 py-1.5 rounded-lg">Leave</button>
                    <button onClick={() => setConfirmId(null)} className="text-xs text-muted hover:text-paper border border-rule-2 px-3 py-1.5 rounded-lg">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(m.id)} className="text-xs text-muted hover:text-red-400 px-2 py-1.5">Leave team</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
