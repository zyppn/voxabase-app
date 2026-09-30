// Shared frame for Privacy, Terms and help guides: the landing page's nav and footer around readable prose.
import Link from 'next/link'

export const CONTACT_EMAIL = 'support@voxabase.com'

export default function LegalShell({ title, updated, other, children, kicker = 'Legal', intro }: {
  title: string
  updated?: string
  other?: { href: string; label: string }
  children: React.ReactNode
  kicker?: string
  intro?: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-10 border-b border-rule bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
          <a href="https://voxabase.com" aria-label="Voxabase home"><img src="/vblogo.png" alt="Voxabase" className="h-7 w-auto" /></a>
          <nav className="flex items-center gap-5 text-[15px]" aria-label="Account">
            <Link href="/login" className="text-muted transition-colors hover:text-paper">Sign in</Link>
            <Link href="/signup" className="rounded-md bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white">Get started free</Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-[44rem] px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <p className="mb-4 text-sm font-semibold text-faint">{kicker}</p>
        <h1 className="text-[clamp(2.25rem,1.6rem+2.4vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.035em] [font-stretch:115%]">{title}</h1>
        <p className="mt-4 text-sm text-faint">
          {intro ?? <>Last updated {updated} · Questions?</>}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-text underline decoration-accent-text/40 underline-offset-[3px] hover:text-paper">{CONTACT_EMAIL}</a>
        </p>
        <div className="legal mt-10">{children}</div>
        {other && (
          <p className="mt-14 border-t border-rule pt-6 text-sm">
            <Link href={other.href} className="font-semibold text-accent-text transition-colors hover:text-paper">{other.label} →</Link>
          </p>
        )}
      </article>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-7 text-[13px] text-faint sm:px-8">
          <p>© 2026 Voxabase. All rights reserved.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            <Link href="/docs" className="hover:text-paper">Help</Link>
            <Link href="/privacy" className="hover:text-paper">Privacy</Link>
            <Link href="/terms" className="hover:text-paper">Terms</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-paper">{CONTACT_EMAIL}</a>
            <a href="https://x.com/Voxabase" target="_blank" rel="noopener" className="hover:text-paper">@Voxabase</a>
          </nav>
        </div>
      </footer>
    </main>
  )
}
