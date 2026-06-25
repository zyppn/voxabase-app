'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from './AppShell'

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

export default function DashboardShell({
  email, username, businessName, fullName, plan, stripeConnected,
  portals, viewMap, usedBytes, totalInvoiced, totalPaid,
}: Props) {
  const searchParams = useSearchParams()
  const initialFilter = (searchParams.get('filter') as 'all' | 'active' | 'completed') || 'all'
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>(
    ['all', 'active', 'completed'].includes(initialFilter) ? initialFilter : 'all'
  )
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'name' | 'amount' | 'views'>('newest')

  const activePortals = portals.filter(p => !p.invoice_paid || !p.invoice_amount)
  const completedPortals = portals.filter(p => p.invoice_paid && p.invoice_amount)

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

  const baseList = filter === 'active' ? activePortals : filter === 'completed' ? completedPortals : portals
  const q = search.trim().toLowerCase()
  const filtered = q
    ? baseList.filter(p => p.name.toLowerCase().includes(q) || (p.slug || '').toLowerCase().includes(q))
    : baseList
  const shown = [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'amount') return (b.invoice_amount || 0) - (a.invoice_amount || 0)
    if (sort === 'views') return (viewMap[b.id]?.count || 0) - (viewMap[a.id]?.count || 0)
    return 0
  })

  const navItems: { key: 'all' | 'active' | 'completed'; label: string; count: number }[] = [
    { key: 'all', label: 'All portals', count: portals.length },
    { key: 'active', label: 'Active', count: activePortals.length },
    { key: 'completed', label: 'Completed', count: completedPortals.length },
  ]

  return (
    <AppShell
      counts={{ all: portals.length, active: activePortals.length, completed: completedPortals.length }}
      usedBytes={usedBytes}
      plan={plan}
      displayLabel={displayLabel}
      email={email}
      initials={initials}
      stripeConnected={stripeConnected}
      activeFilter={filter}
      onFilterClick={setFilter}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
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
            <a href="/stripe-setup" className="flex-shrink-0 bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-4 py-2 rounded-lg text-xs">Set up</a>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-9">
          {[
            { label: 'Total Portals', value: portals.length, tone: 'brand',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /> },
            { label: 'Active', value: activePortals.length, tone: 'brand',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /> },
            { label: 'Total Invoiced', value: `$${totalInvoiced.toLocaleString()}`, tone: 'neutral',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z" /> },
            { label: 'Collected', value: `$${totalPaid.toLocaleString()}`, tone: 'green',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
          ].map(s => {
            const toneCls = s.tone === 'green' ? 'bg-green-400/10 text-green-400' : s.tone === 'brand' ? 'bg-[#8b3cf7]/10 text-[#8b3cf7]' : 'bg-[#1e1e24] text-gray-400'
            return (
              <div key={s.label} className="bg-[#101013] border border-[#16161a] rounded-xl p-4 flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${toneCls}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">{s.icon}</svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold mb-0.5 truncate">{s.label}</p>
                  <p className={`text-xl font-semibold ${s.tone === 'green' ? 'text-green-400' : 'text-white'}`}>{s.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile filter tabs */}
        <div className="lg:hidden flex items-center gap-2 mb-5 overflow-x-auto">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setFilter(item.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${filter === item.key ? 'bg-[#16161a] border-[#2a2a33] text-white' : 'border-[#1f1f26] text-gray-500'}`}>
              {item.label} <span className="text-gray-600">{item.count}</span>
            </button>
          ))}
        </div>

        {/* Toolbar: heading + search + sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">{filter === 'completed' ? 'Completed' : filter === 'active' ? 'Active Portals' : 'All Portals'}</h2>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <svg className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search portals..."
                className="w-full sm:w-60 bg-[#101013] border border-[#1f1f26] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7]" />
            </div>
            <div className="relative">
              <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
                className="appearance-none bg-[#101013] border border-[#1f1f26] rounded-lg pl-3 pr-8 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#8b3cf7] cursor-pointer">
                <option value="newest">Newest</option>
                <option value="name">Name</option>
                <option value="amount">Amount</option>
                <option value="views">Most viewed</option>
              </select>
              <svg className="w-4 h-4 text-gray-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </div>
            <a href="/dashboard/new" className="lg:hidden flex-shrink-0 bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-3.5 py-2 rounded-lg text-xs">+ New</a>
          </div>
        </div>

        {/* Portal list / table */}
        {shown.length === 0 ? (
          <div className="border border-dashed border-[#1f1f26] rounded-xl p-14 text-center">
            <div className="w-14 h-14 bg-[#1a0d30] border border-[#8b3cf7]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
            </div>
            {q ? (
              <>
                <p className="text-gray-300 font-medium mb-1.5">No portals match "{search}"</p>
                <p className="text-gray-600 text-sm">Try a different search term</p>
              </>
            ) : (
              <>
                <p className="text-gray-300 font-medium mb-1.5">{filter === 'completed' ? 'No completed portals yet' : 'No portals yet'}</p>
                <p className="text-gray-600 text-sm mb-5">{filter === 'completed' ? 'Paid portals will appear here' : 'Create your first client portal to get started'}</p>
                {filter !== 'completed' && (
                  <a href="/dashboard/new" className="inline-block bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-5 py-2.5 rounded-lg text-sm">Create your first portal</a>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="border border-[#16161a] rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_140px_120px_110px] gap-4 px-4 py-2.5 bg-[#0d0d10] border-b border-[#16161a] text-[11px] uppercase tracking-wide font-semibold text-gray-600">
              <span>Portal</span>
              <span>Views</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
            </div>
            <div className="divide-y divide-[#141418]">
              {shown.map(portal => {
                const v = viewMap[portal.id]
                const paid = portal.invoice_paid && portal.invoice_amount
                return (
                  <a key={portal.id} href={`/dashboard/portal/${portal.id}`}
                    className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_140px_120px_110px] gap-4 items-center px-4 py-3 hover:bg-[#0d0d10]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${paid ? 'bg-green-400/5 border-green-400/20' : 'bg-[#1a0d30] border-[#8b3cf7]/20'}`}>
                        {paid ? (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white text-sm truncate">{portal.name}</h3>
                        <p className="text-gray-500 text-xs mt-0.5 truncate">/{portal.owner_username || username}/{portal.slug}</p>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.58-3.007-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {v ? (<span className="truncate">{v.count}{v.lastViewed && <span className="text-gray-600"> · {timeAgo(v.lastViewed)}</span>}</span>) : <span className="text-gray-600">—</span>}
                    </div>
                    <div className="hidden md:block text-right text-sm font-medium" style={{ color: paid ? '#4ade80' : portal.invoice_amount ? '#d1d5db' : '#4b5563' }}>
                      {portal.invoice_amount ? `$${Number(portal.invoice_amount).toLocaleString()}` : '—'}
                    </div>
                    <div className="flex items-center justify-end gap-2.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${portal.invoice_paid ? 'bg-green-400/10 text-green-400' : portal.invoice_amount ? 'bg-yellow-400/10 text-yellow-400' : 'bg-[#1e1e24] text-gray-500'}`}>
                        {portal.invoice_paid ? 'Paid' : portal.invoice_amount ? 'Unpaid' : 'No invoice'}
                      </span>
                      <svg className="w-4 h-4 text-gray-600 group-hover:text-[#8b3cf7] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {shown.length > 0 && (
          <p className="text-xs text-gray-600 mt-3">{shown.length} portal{shown.length !== 1 ? 's' : ''}{q ? ` matching "${search}"` : ''}</p>
        )}
      </div>
    </AppShell>
  )
}