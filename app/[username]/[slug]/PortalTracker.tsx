'use client'
import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function PortalTracker({ portalId, ownerUsername }: { portalId: string; ownerUsername: string }) {
  useEffect(() => {
    const track = async () => {
      const supabase = createClient()

      // Check if the current user is the portal owner — don't count their own views
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
        if (profile?.username === ownerUsername) return
      }

      await fetch('/api/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalId }),
      })
    }
    track()
  }, [portalId, ownerUsername])

  return null
}