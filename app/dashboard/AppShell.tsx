'use client'
import { useState, useEffect, useRef, ReactNode } from 'react'

interface AppShellProps {
  counts: { all: number; active: number; completed: number }
  usedBytes: number
  plan: string
  displayLabel: string
  email: string
  initials: string
  stripeConnected: boolean
  activeFilter: 'all' | 'active' | 'completed' | null
  onFilterClick: (key: 'all' | 'active' | 'completed') => void
  children: ReactNode
}

const STORAGE_LIMITS: Record<string, number> = {
  free: 1_073_741_824,
  pro: 26_843_545_600,
  agency: 268_435_456_000,
}

export default function AppShell({
  counts, usedBytes, plan, displayLabel, email, initials, stripeConnected,
  activeFilter, onFilterClick, children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { if (localStorage.getItem('vb_sidebar_collapsed') === '1') setCollapsed(true) } catch {}
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggleCollapse = () => {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('vb_sidebar_collapsed', next ? '1' : '0') } catch {}
      return next
    })
    setMenuOpen(false)
  }

  const storageLimit = STORAGE_LIMITS[plan] || STORAGE_LIMITS.free
  const storagePercent = Math.min(Math.round((usedBytes / storageLimit) * 100), 100)
  const limitLabel = plan === 'free' ? '1 GB' : plan === 'pro' ? '25 GB' : '250 GB'
  const formatBytes = (b: number) => {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  const navItems: { key: 'all' | 'active' | 'completed'; label: string; count: number; icon: ReactNode }[] = [
    { key: 'all', label: 'All portals', count: counts.all, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /> },
    { key: 'active', label: 'Active', count: counts.active, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /> },
    { key: 'completed', label: 'Completed', count: counts.completed, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  ]

  const railW = collapsed ? 'w-16' : 'w-60'
  const mainML = collapsed ? 'lg:ml-16' : 'lg:ml-60'

  return (
    <div className="min-h-screen bg-[#08080a] text-white flex">
      {/* ── Sidebar ── */}
      <aside className={`hidden lg:flex flex-col border-r border-[#16161a] fixed inset-y-0 left-0 py-5 px-3 transition-all duration-200 ${railW}`}>
        {/* Header: logo + collapse toggle */}
        <div className={`flex items-center mb-7 h-8 ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
          {!collapsed && <a href="/dashboard"><img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" /></a>}
          <button onClick={toggleCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#101013]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="9" y1="4" x2="9" y2="20" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {/* New Portal */}
          <a href="/dashboard/new" title="New Portal"
            className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-[#101013] overflow-hidden">
            <svg className="w-5 h-5 text-[#8b3cf7] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span className={`font-medium whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>New Portal</span>
          </a>

          <div className={`h-px bg-[#16161a] my-1.5 ${collapsed ? 'mx-1' : 'mx-2'}`} />

          {navItems.map(item => (
            <button key={item.key} onClick={() => onFilterClick(item.key)} title={item.label}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm overflow-hidden ${activeFilter === item.key ? 'bg-[#16161a] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-[#101013]'}`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">{item.icon}</svg>
              <span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>{item.label}</span>
              <span className={`text-xs text-gray-600 ml-auto whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>{item.count}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          {/* Storage */}
          <div className={`px-3 overflow-hidden transition-all duration-200 ${collapsed ? 'max-h-0 opacity-0 mb-0' : 'max-h-32 opacity-100 mb-4'}`}>
            <div className="flex items-center justify-between mb-1.5 whitespace-nowrap">
              <span className="text-[11px] text-gray-600 uppercase tracking-wide font-semibold">Storage</span>
              <span className="text-[11px] text-gray-500">{formatBytes(usedBytes)} / {limitLabel}</span>
            </div>
            <div className="w-full bg-[#1e1e24] rounded-full h-1">
              <div className={`h-1 rounded-full ${storagePercent >= 90 ? 'bg-red-400' : storagePercent >= 70 ? 'bg-yellow-400' : 'bg-[#8b3cf7]'}`} style={{ width: `${storagePercent}%` }} />
            </div>
            {plan === 'free' && <a href="/pricing" className="text-[11px] text-[#8b3cf7] hover:underline font-semibold mt-1.5 inline-block whitespace-nowrap">Upgrade plan</a>}
          </div>

          {/* Profile menu */}
          <div className="relative" ref={menuRef}>
            <div className={`absolute bottom-full left-0 mb-2 w-56 origin-bottom transition-all duration-200 ${menuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
              <div className="bg-[#101013] border border-[#1f1f26] rounded-xl p-1.5 shadow-2xl shadow-black/60">
                {collapsed && (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-sm text-white font-medium truncate">{displayLabel}</p>
                      <p className="text-[11px] text-gray-600 truncate">{email}</p>
                    </div>
                    <div className="h-px bg-[#1f1f26] my-1 mx-2" />
                  </>
                )}
                <a href="/stripe-setup" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#16161a] hover:text-white">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                  {stripeConnected ? 'Stripe account' : 'Connect Stripe'}
                </a>
                <a href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#16161a] hover:text-white">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Settings
                </a>
                <div className="h-px bg-[#1f1f26] my-1 mx-2" />
                <a href="/api/auth/signout" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-400/10 hover:text-red-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                  Sign out
                </a>
              </div>
            </div>

            <button onClick={() => setMenuOpen(o => !o)} title={collapsed ? displayLabel : undefined}
              className={`w-full flex items-center gap-3 px-1.5 py-1.5 rounded-xl overflow-hidden ${menuOpen ? 'bg-[#16161a]' : 'hover:bg-[#101013]'}`}>
              <div className="w-8 h-8 rounded-full bg-[#8b3cf7] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className={`min-w-0 flex-1 text-left whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
                <p className="text-sm text-white font-medium truncate leading-tight">{displayLabel}</p>
                <p className="text-[11px] text-gray-600 truncate leading-tight">{email}</p>
              </div>
              <svg className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-all duration-150 ${menuOpen ? 'rotate-180' : ''} ${collapsed ? 'opacity-0' : 'opacity-100'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={`flex-1 min-w-0 transition-all duration-200 ${mainML}`}>
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#16161a] sticky top-0 bg-[#08080a]/85 backdrop-blur-sm z-20">
          <a href="/dashboard"><img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" /></a>
          <div className="flex items-center gap-2">
            <a href="/settings" className="p-2 rounded-lg border border-[#1f1f26] text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></a>
            <a href="/api/auth/signout" className="p-2 rounded-lg border border-[#1f1f26] text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg></a>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
