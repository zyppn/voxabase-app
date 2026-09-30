// Help center layout: site header, a sidebar of every guide, readable prose.
import Link from 'next/link'
import { DOCS, docBySlug } from '@/lib/docs'
import { CONTACT_EMAIL } from '../_components/LegalShell'

export default function DocsShell({ slug, children, intro }: { slug?: string; children: React.ReactNode; intro?: React.ReactNode }) {
  const doc = slug ? docBySlug(slug) : undefined
  const groups = Array.from(new Set(DOCS.map((d) => d.group)))
  const i = doc ? DOCS.indexOf(doc) : -1
  const next = i >= 0 ? DOCS[i + 1] : undefined

  return (
    <main className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-rule bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <a href="https://voxabase.com" aria-label="Voxabase home"><img src="/vblogo.png" alt="Voxabase" className="h-7 w-auto" /></a>
            <span className="hidden sm:inline text-rule-3" aria-hidden="true">/</span>
            <Link href="/docs" className="hidden sm:inline text-[15px] font-semibold text-paper">Help</Link>
          </div>
          <nav className="flex items-center gap-5 text-[15px]" aria-label="Account">
            <Link href="/dashboard" className="text-muted transition-colors hover:text-paper">Dashboard</Link>
            <Link href="/signup" className="whitespace-nowrap rounded-md bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white">Get started<span className="hidden sm:inline"> free</span></Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Help topics" className="hidden lg:block pt-14">
          <div className="sticky top-24 flex flex-col gap-6 text-sm">
            <Link href="/docs" className={`font-semibold ${!doc ? 'text-paper' : 'text-muted hover:text-paper'}`}>All guides</Link>
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">{g}</p>
                <ul className="flex flex-col gap-1">
                  {DOCS.filter((d) => d.group === g).map((d) => (
                    <li key={d.slug}>
                      <Link href={`/docs/${d.slug}`} aria-current={d.slug === slug ? 'page' : undefined}
                        className={`block rounded-md px-2 py-1.5 -mx-2 ${d.slug === slug ? 'bg-ink-3 text-paper' : 'text-muted hover:text-paper'}`}>
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <article className="max-w-[44rem] pb-20 pt-10 lg:pt-14">
          {doc ? (
            <>
              <p className="mb-4 text-sm font-semibold text-faint">
                <Link href="/docs" className="hover:text-paper">Help</Link> · {doc.group}
                {doc.plan && <span className="ml-2 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[11px] text-accent-text">{doc.plan}{doc.plan === 'Pro' ? ' and Agency' : ''}</span>}
              </p>
              <h1 className="text-[clamp(2rem,1.5rem+2vw,3rem)] font-bold leading-[1.04] tracking-[-0.035em] [font-stretch:112%]">{doc.title}</h1>
              {intro && <p className="mt-4 text-sm text-faint">{intro}</p>}
              <div className="legal mt-9">{children}</div>
              <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6 text-sm">
                <p className="text-faint">Still stuck? <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-text hover:text-paper">{CONTACT_EMAIL}</a></p>
                {next && <Link href={`/docs/${next.slug}`} className="font-semibold text-accent-text hover:text-paper">Next: {next.title} →</Link>}
              </div>
            </>
          ) : children}
        </article>
      </div>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-7 text-[13px] text-faint sm:px-8">
          <p>© 2026 Voxabase. All rights reserved.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            <Link href="/docs" className="hover:text-paper">Help</Link>
            <Link href="/privacy" className="hover:text-paper">Privacy</Link>
            <Link href="/terms" className="hover:text-paper">Terms</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-paper">{CONTACT_EMAIL}</a>
          </nav>
        </div>
      </footer>
    </main>
  )
}
