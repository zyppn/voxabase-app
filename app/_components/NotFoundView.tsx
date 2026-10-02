// The 404 page, in two versions. Branded: the app's own addresses. Neutral: a
// customer's own domain, where their clients see it, so no Voxabase branding.
import Link from 'next/link'
import Logo from '@/app/_components/Logo'

export function NeutralNotFound() {
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

export function BrandedNotFound() {
  return (
    <main className="vb-app min-h-screen bg-ink text-paper flex flex-col">
      <header className="px-6 py-5">
        <a href="https://voxabase.com" aria-label="Voxabase home"><Logo className="h-[18px] w-auto" /></a>
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
            <Link href="/dashboard" className="bg-paper hover:bg-paper-hover text-ink font-semibold px-5 py-2.5 rounded-lg text-sm">Go to your dashboard</Link>
            <a href="https://voxabase.com" className="border border-rule-2 hover:border-rule-3 text-muted hover:text-paper font-semibold px-5 py-2.5 rounded-lg text-sm">Visit voxabase.com</a>
          </div>
        </div>
      </div>
    </main>
  )
}
