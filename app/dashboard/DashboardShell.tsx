'use client'
import { useState, useEffect, useRef } from 'react'

interface Portal {
  id: string
  name: string
  slug: string
  owner_username: string | null
  invoice_amount: number | null
  invoice_paid: boolean
}

interface Props {
  email: string
  username: string
  businessName: string
  fullName: string
  plan: string
  stripeConnected: boolean
  portals: Portal[]
  viewMap: Record<string, { count: number; lastViewed: string | null }>
  usedBytes: number
  totalInvoiced: number
  totalPaid: number
}

const STORAGE_LIMITS: Record<string, number> = {
  free: 1_073_741_824,
  pro: 26_843_545_600,
  agency: 268_435_456_000,
}

export default function DashboardShell({
  email, username, businessName, fullName, plan, stripeConnected,
  portals, viewMap, usedBytes, totalInvoiced, totalPaid,
}: Props) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const activePortals = portals.filter(p => !p.invoice_paid || !p.invoice_amount)
  const completedPortals = portals.filter(p => p.invoice_paid && p.invoice_amount)

  const storageLimit = STORAGE_LIMITS[plan] || STORAGE_LIMITS.free
  const storagePercent = Math.min(Math.round((usedBytes / storageLimit) * 100), 100)
  const limitLabel = plan === 'free' ? '1 GB' : plan === 'pro' ? '25 GB' : '250 GB'
  const formatBytes = (b: number) => {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  const displayLabel = businessName || fullName || 'Your'
  const initials = (() => {
    const base = businessName || fullName
    if (base) return base.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase()
    return (email[0] || 'U').toUpperCase()
  })()

  const planBadge =
    plan === 'agency' ? { label: 'Agency', cls: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' } :
    plan === 'pro' ? { label: 'Pro', cls: 'bg-[#8b3cf7]/10 text-[#8b3cf7] border-[#8b3cf7]/20' } :
    { label: 'Free', cls: 'bg-[#1e1e24] text-gray-500 border-[#1e1e24]' }

  const shown = filter === 'active' ? activePortals : filter === 'completed' ? completedPortals : portals

  const navItems: { key: 'all' | 'active' | 'completed'; label: string; count: number }[] = [
    { key: 'all', label: 'All portals', count: portals.length },
    { key: 'active', label: 'Active', count: activePortals.length },
    { key: 'completed', label: 'Completed', count: completedPortals.length },
  ]

  return (
    <div className="min-h-screen bg-[#08080a] text-white flex">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-[#16161a] fixed inset-y-0 left-0 px-4 py-5">
        <div className="px-2 mb-7">
          <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" />
        </div>

        <a href="/dashboard/new"
          className="flex items-center justify-center gap-2 bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm mb-6 shadow-lg shadow-purple-900/20">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Portal
        </a>

        <nav className="flex flex-col gap-1">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setFilter(item.key)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${filter === item.key ? 'bg-[#16161a] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-[#101013]'}`}>
              <span className="flex items-center gap-2.5">
                {item.key === 'all' && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>}
                {item.key === 'active' && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>}
                {item.key === 'completed' && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                {item.label}
              </span>
              <span className="text-xs text-gray-600">{item.count}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          {/* Storage mini */}
          <div className="px-3 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-gray-600 uppercase tracking-wide font-semibold">Storage</span>
              <span className="text-[11px] text-gray-500">{formatBytes(usedBytes)} / {limitLabel}</span>
            </div>
            <div className="w-full bg-[#1e1e24] rounded-full h-1">
              <div className={`h-1 rounded-full ${storagePercent >= 90 ? 'bg-red-400' : storagePercent >= 70 ? 'bg-yellow-400' : 'bg-[#8b3cf7]'}`} style={{ width: `${storagePercent}%` }} />
            </div>
            {plan === 'free' && (
              <a href="/pricing" className="text-[11px] text-[#8b3cf7] hover:underline font-semibold mt-1.5 inline-block">Upgrade plan</a>
            )}
          </div>

          {/* Profile menu */}
          <div className="relative" ref={menuRef}>
            <div
              className={`absolute bottom-full left-0 right-0 mb-2 origin-bottom transition-all duration-200 ${menuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
            >
              <div className="bg-[#101013] border border-[#1f1f26] rounded-xl p-1.5 shadow-2xl shadow-black/60">
                <a href="/stripe-setup" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#16161a] hover:text-white transition-colors">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                  {stripeConnected ? 'Stripe account' : 'Connect Stripe'}
                </a>
                <a href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#16161a] hover:text-white transition-colors">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Settings
                </a>
                <div className="h-px bg-[#1f1f26] my-1 mx-2" />
                <a href="/api/auth/signout" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-400/10 hover:text-red-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                  Sign out
                </a>
              </div>
            </div>

            <button onClick={() => setMenuOpen(o => !o)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors ${menuOpen ? 'bg-[#16161a]' : 'hover:bg-[#101013]'}`}>
              <div className="w-8 h-8 rounded-full bg-[#8b3cf7] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm text-white font-medium truncate leading-tight">{displayLabel}</p>
                <p className="text-[11px] text-gray-600 truncate leading-tight">{email}</p>
              </div>
              <svg className={`w-4 h-4 text-gray-600 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 lg:ml-60 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#16161a] sticky top-0 bg-[#08080a]/85 backdrop-blur-sm z-20">
          <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" />
          <div className="flex items-center gap-2">
            <a href="/settings" className="p-2 rounded-lg border border-[#1f1f26] text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></a>
            <a href="/api/auth/signout" className="p-2 rounded-lg border border-[#1f1f26] text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg></a>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-10 py-9">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">{displayLabel} Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">Your portals live at <span className="text-[#8b3cf7]">voxabase.com/{username}/</span></p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${planBadge.cls}`}>{planBadge.label}</span>
          </div>

          {/* Stripe banner */}
          {!stripeConnected && (
            <div className="bg-[#1a0d30] border border-[#8b3cf7]/30 rounded-xl p-5 mb-7 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#8b3cf7]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Connect Stripe to collect payments</p>
                  <p className="text-gray-400 text-xs mt-0.5">Clients can't pay invoices until you connect your account</p>
                </div>
              </div>
              <a href="/stripe-setup" className="flex-shrink-0 bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors">Set up</a>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-9">
            {[
              { label: 'Total Portals', value: portals.length, accent: false },
              { label: 'Active', value: activePortals.length, accent: false },
              { label: 'Total Invoiced', value: `$${totalInvoiced.toLocaleString()}`, accent: false },
              { label: 'Collected', value: `$${totalPaid.toLocaleString()}`, accent: true },
            ].map(s => (
              <div key={s.label} className="bg-[#101013] border border-[#16161a] rounded-xl p-4">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold mb-1.5">{s.label}</p>
                <p className={`text-2xl font-bold ${s.accent ? 'text-green-400' : 'text-white'}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Mobile filter tabs */}
          <div className="lg:hidden flex items-center gap-2 mb-5 overflow-x-auto">
            {navItems.map(item => (
              <button key={item.key} onClick={() => setFilter(item.key)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === item.key ? 'bg-[#16161a] border-[#2a2a33] text-white' : 'border-[#1f1f26] text-gray-500'}`}>
                {item.label} <span className="text-gray-600">{item.count}</span>
              </button>
            ))}
          </div>

          {/* Section heading */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{filter === 'completed' ? 'Completed' : filter === 'active' ? 'Active Portals' : 'All Portals'}</h2>
            <a href="/dashboard/new" className="lg:hidden bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-3.5 py-1.5 rounded-lg transition-colors text-xs">+ New</a>
          </div>

          {/* Portal list */}
          {shown.length === 0 ? (
            <div className="border border-dashed border-[#1f1f26] rounded-xl p-14 text-center">
              <div className="w-14 h-14 bg-[#1a0d30] border border-[#8b3cf7]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
              </div>
              <p className="text-gray-300 font-medium mb-1.5">{filter === 'completed' ? 'No completed portals yet' : 'No portals yet'}</p>
              <p className="text-gray-600 text-sm mb-5">{filter === 'completed' ? 'Paid portals will appear here' : 'Create your first client portal to get started'}</p>
              {filter !== 'completed' && (
                <a href="/dashboard/new" className="inline-block bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm">Create your first portal</a>
              )}
            </div>
          ) : (
            <div className="grid gap-2.5">
              {shown.map(portal => {
                const v = viewMap[portal.id]
                const paid = portal.invoice_paid && portal.invoice_amount
                return (
                  <a key={portal.id} href={`/dashboard/portal/${portal.id}`}
                    className={`group bg-[#101013] border rounded-xl p-4 flex items-center justify-between transition-all ${paid ? 'border-[#16161a] hover:border-green-400/20 opacity-80 hover:opacity-100' : 'border-[#16161a] hover:border-[#8b3cf7]/40'}`}>
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${paid ? 'bg-green-400/5 border-green-400/20' : 'bg-[#1a0d30] border-[#8b3cf7]/20'}`}>
                        {paid ? (
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                          <svg className="w-5 h-5 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white text-sm truncate">{portal.name}</h3>
                        <p className="text-gray-500 text-xs mt-0.5 truncate">voxabase.com/{portal.owner_username || username}/{portal.slug}</p>
                        <p className="text-gray-600 text-xs mt-0.5 flex items-center gap-1">
                          <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.58-3.007-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {v ? <>{v.count} view{v.count !== 1 ? 's' : ''}{v.lastViewed && <span>&nbsp;· {timeAgo(v.lastViewed)}</span>}</> : 'No views yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {portal.invoice_amount && <span className="text-sm font-medium hidden sm:block" style={{ color: paid ? '#4ade80' : '#9ca3af' }}>${portal.invoice_amount}</span>}
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${portal.invoice_paid ? 'bg-green-400/10 text-green-400' : portal.invoice_amount ? 'bg-yellow-400/10 text-yellow-400' : 'bg-[#1e1e24] text-gray-500'}`}>
                        {portal.invoice_paid ? 'Paid' : portal.invoice_amount ? 'Unpaid' : 'No invoice'}
                      </span>
                      <svg className="w-4 h-4 text-gray-600 group-hover:text-[#8b3cf7] transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
