import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// The tab shows which portal is open. The database only returns portals this
// person can see, so anyone else gets the generic title.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = createClient(await cookies())
  const { data } = await supabase.from('portals').select('name').eq('id', id).maybeSingle()
  return { title: `${data?.name || 'Portal'} · Voxabase` }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
