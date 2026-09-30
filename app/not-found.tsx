// Every unknown address in the app lands here. On a customer's own domain it
// stays neutral (no Voxabase branding), since their clients are the ones seeing it.
import Link from 'next/link'
import { headers } from 'next/headers'
import { DOMAIN_HEADER } from '@/lib/domainHeader'

export const metadata = { title: 'Page not found · Voxabase' }

export default async function NotFound() {
  const onCustomDomain = !!(await headers()).get(DOMAIN_HEADER)

  if (onCustomDomain) {
    return (
      <main className="min-h-screen bg-ink text-paper flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-semibold text-faint mb-3">404</p>
          <h1 className="text-2xl font-bold tracking-tight mb-2">This link isn’t available</h1>
          <p className="text-muted text-sm">It may have been moved or removed. Check with the person who sent it to you.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="vb-app min-h-screen bg-ink text-paper flex flex-col">
      <header className="px-6 py-5">
        <a href="https://voxabase.com" aria-label="Voxabase home"><img src="/vblogo.png" alt="Voxabase" className="h-7 w-auto" /></a>
      </header>
      <div className="flex-1 flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-faint mb-4">404 · Page not found</p>
          <h1 className="text-[clamp(2rem,1.4rem+2.4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.035em] [font-stretch:112%] mb-3">
            Nothing lives at this address.
          </h1>
          <p className="text-muted mb-8 text-balance">
            The link may be mistyped, or the portal was moved or taken down. If someone sent you this link, ask them for a fresh one.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link href="/dashboard" className="bg-paper hover:bg-white text-ink font-semibold px-5 py-2.5 rounded-lg text-sm">Go to your dashboard</Link>
            <a href="https://voxabase.com" className="border border-rule-2 hover:border-rule-3 text-muted hover:text-paper font-semibold px-5 py-2.5 rounded-lg text-sm">Visit voxabase.com</a>
          </div>
        </div>
      </div>
    </main>
  )
}
