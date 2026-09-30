import Link from 'next/link'
import DocsShell from './DocsShell'
import { DOCS } from '@/lib/docs'
import { CONTACT_EMAIL } from '../_components/LegalShell'

export const metadata = { title: 'Help center · Voxabase', description: 'Guides for delivering work, getting paid, teams and your account on Voxabase.' }

export default function DocsHome() {
  const groups = Array.from(new Set(DOCS.map((d) => d.group)))
  return (
    <DocsShell>
      <p className="mb-4 text-sm font-semibold text-faint">Help center</p>
      <h1 className="text-[clamp(2.25rem,1.6rem+2.4vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.035em] [font-stretch:115%]">How can we help?</h1>
      <p className="mt-4 max-w-[36rem] text-muted">Short guides for everything in Voxabase, from your first portal to teams and your own domain. Can’t find it? Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-text hover:text-paper">{CONTACT_EMAIL}</a>.</p>
      <div className="mt-10 flex flex-col gap-10">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-faint">{g}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {DOCS.filter((d) => d.group === g).map((d) => (
                <Link key={d.slug} href={`/docs/${d.slug}`} className="group rounded-xl border border-rule bg-ink-2 p-5 transition-colors hover:border-rule-3">
                  <p className="flex items-center gap-2 font-semibold text-paper">
                    {d.title}
                    {d.plan && <span className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-text">{d.plan}</span>}
                  </p>
                  <p className="mt-1 text-sm text-muted">{d.blurb}</p>
                  <p className="mt-3 text-sm font-semibold text-faint group-hover:text-paper">Read guide →</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DocsShell>
  )
}
