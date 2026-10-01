// Every signed-in page (dashboard, portals, settings, Stripe) shares this
// layout, so the sidebar renders once and stays put while you move between
// pages. The workspace is loaded here on the server for the first paint; after
// that WorkspaceProvider keeps it current in the browser.
import { Suspense, type ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { WS_COOKIE } from '@/lib/workspace'
import { loadWorkspaceData } from '@/lib/workspaceData'
import WorkspaceProvider from './WorkspaceProvider'
import AppShell from './dashboard/AppShell'
import AppSkeleton from './dashboard/AppSkeleton'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppSkeleton variant="blank" />}>
      <AppFrame>{children}</AppFrame>
    </Suspense>
  )
}

async function AppFrame({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const initial = await loadWorkspaceData(supabase, { id: user.id, email: user.email || '' }, cookieStore.get(WS_COOKIE)?.value ?? null)
  return (
    <WorkspaceProvider initial={initial}>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  )
}
