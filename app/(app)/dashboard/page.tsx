import DashboardShell from './DashboardShell'

export const metadata = { title: 'Portals · Voxabase' }

// The workspace (portals, views, storage) is loaded by the (app) layout
export default function DashboardPage() {
  return <DashboardShell />
}
