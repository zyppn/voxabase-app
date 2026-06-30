// app/terms/page.tsx
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service · VoxaBase',
  description: 'The terms that govern your use of VoxaBase.',
}

const LAST_UPDATED = 'June 29, 2026'
const SUPPORT_EMAIL = 'support@voxabase.com'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#08080a] text-white">
      <nav className="border-b border-[#16161a] px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-[#08080a]/85 backdrop-blur-sm z-10">
        <a href="https://voxabase.com"><img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" /></a>
        <a href="/dashboard" className="text-sm text-gray-400 hover:text-white">Dashboard</a>
      </nav>

      <article className="max-w-2xl mx-auto px-6 py-14 legal">
        <p className="text-xs uppercase tracking-[0.12em] text-[#8b3cf7] font-semibold mb-3">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated {LAST_UPDATED}</p>

        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of VoxaBase (the &ldquo;Service&rdquo;),
          operated by VoxaBase (&ldquo;we,&rdquo; &ldquo;us&rdquo;). By creating an account or using the Service, you agree
          to these Terms. If you do not agree, do not use the Service.
        </p>

        <h2>The Service</h2>
        <p>
          VoxaBase lets you create branded portals to deliver files to your clients and collect invoice payments.
          We may add, change, or remove features over time to improve the Service.
        </p>

        <h2>Your account</h2>
        <ul>
          <li>You must provide accurate information and keep it up to date.</li>
          <li>You are responsible for keeping your password secure and for all activity under your account.</li>
          <li>You must be at least 16 years old, or the age of majority in your jurisdiction, to use the Service.</li>
          <li>You are responsible for the content you upload and for ensuring you have the rights to share it.</li>
        </ul>

        <h2>Acceptable use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Upload or share unlawful, infringing, or harmful content.</li>
          <li>Distribute malware or attempt to disrupt, probe, or gain unauthorized access to the Service.</li>
          <li>Impersonate others or misrepresent your affiliation.</li>
          <li>Use the Service to send spam or to collect payments fraudulently.</li>
          <li>Resell or provide the Service to third parties except as intended (delivering work to your own clients).</li>
        </ul>
        <p>We may suspend or terminate accounts that violate these Terms.</p>

        <h2>Plans, billing, and payments</h2>
        <ul>
          <li>The Service offers a free plan and paid subscription plans (Pro and Agency). Current pricing is shown on our pricing page.</li>
          <li>Paid plans are billed in advance on a recurring monthly basis through our payment processor, Stripe.</li>
          <li>Upgrades take effect immediately and are prorated. You can cancel at any time; your plan remains active until the end of the current billing period, and we do not provide partial refunds except where required by law.</li>
          <li>When your clients pay invoices through your portal, those payments are processed by Stripe and routed to your connected Stripe account. VoxaBase is not a party to the transaction between you and your client and does not hold your funds.</li>
          <li>You are responsible for any taxes related to your use of the Service and to payments you collect from your clients.</li>
        </ul>

        <h2>Your content and ownership</h2>
        <p>
          You retain all rights to the content you upload. You grant us a limited license to host, store, and
          display that content solely to operate the Service for you. We do not claim ownership of your files,
          branding, or client information.
        </p>

        <h2>Our intellectual property</h2>
        <p>
          The Service itself — including its software, design, and the VoxaBase name and logo — belongs to us. These
          Terms do not grant you any right to use our branding except as needed to use the Service normally.
        </p>

        <h2>Third-party services</h2>
        <p>
          The Service relies on third parties including Stripe, Supabase, and Vercel. Your use of features that
          depend on them may also be subject to their terms. We are not responsible for third-party services.
        </p>

        <h2>Disclaimers</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind, whether
          express or implied, to the maximum extent permitted by law. We do not warrant that the Service will be
          uninterrupted, error-free, or secure.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, VoxaBase will not be liable for any indirect, incidental,
          special, consequential, or punitive damages, or for lost profits or data. Our total liability for any
          claim relating to the Service will not exceed the amount you paid us in the twelve months before the
          claim arose.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or terminate your
          access if you violate these Terms or if we discontinue the Service. On termination, your right to use the
          Service ends, though sections that by their nature should survive (such as payment obligations and
          limitations of liability) will remain in effect.
        </p>

        <h2>Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. When we make material changes, we will revise the
          &ldquo;last updated&rdquo; date and notify you through the Service or by email. Continued use after changes
          take effect means you accept the updated Terms.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about these Terms? Email us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <div className="mt-12 pt-6 border-t border-[#16161a] flex items-center justify-between text-sm">
          <Link href="/privacy" className="text-[#8b3cf7] hover:underline">Privacy Policy →</Link>
          <a href="https://voxabase.com" className="text-gray-500 hover:text-white">Back to home</a>
        </div>
      </article>

      <style>{`
        .legal { line-height: 1.7; color: #c9c9d1; }
        .legal h2 { color: #fff; font-size: 1.125rem; font-weight: 600; margin-top: 2.25rem; margin-bottom: 0.6rem; }
        .legal p { margin-bottom: 1rem; }
        .legal ul { margin: 0 0 1.25rem; padding-left: 1.1rem; list-style: disc; }
        .legal li { margin-bottom: 0.5rem; }
        .legal a { color: #a974f5; text-decoration: underline; text-underline-offset: 2px; }
        .legal a:hover { color: #c4a0ff; }
        .legal strong { color: #e6e6ea; font-weight: 600; }
      `}</style>
    </main>
  )
}
