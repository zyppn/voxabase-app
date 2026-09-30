// app/terms/page.tsx
import LegalShell, { CONTACT_EMAIL } from '../_components/LegalShell'

export const metadata = {
  title: 'Terms of Service · Voxabase',
  description: 'The terms that govern your use of Voxabase.',
}

const LAST_UPDATED = 'September 30, 2026'

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated={LAST_UPDATED} other={{ href: '/privacy', label: 'Privacy Policy' }}>

        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Voxabase (the &ldquo;Service&rdquo;),
          operated by Voxabase (&ldquo;we,&rdquo; &ldquo;us&rdquo;). By creating an account or using the Service, you agree
          to these Terms. If you do not agree, do not use the Service.
        </p>

        <h2>The Service</h2>
        <p>
          Voxabase lets you create branded portals to deliver files to your clients and collect invoice payments.
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
          <li>Paid plans are billed in advance on a recurring monthly or annual basis through our payment processor, Stripe.</li>
          <li>Upgrades take effect immediately and are prorated. You can cancel at any time; your plan remains active until the end of the current billing period, and we do not provide partial refunds except where required by law.</li>
          <li>When your clients pay invoices through your portal, those payments are processed by Stripe and routed to your connected Stripe account. Voxabase is not a party to the transaction between you and your client and does not hold your funds.</li>
          <li>On the free plan, Voxabase keeps a fee of 2% of each client payment made through your portals. There is no Voxabase fee on Pro or Agency. Stripe&rsquo;s own processing fees apply on every plan.</li>
          <li>Each plan includes a set amount of file storage and a maximum size per file, shown in the Service. Uploads over those limits may be refused.</li>
          <li>You are responsible for any taxes related to your use of the Service and to payments you collect from your clients.</li>
        </ul>

        <h2>Teams (Pro and Agency plans)</h2>
        <ul>
          <li>A Pro or Agency account owner can invite teammates (1 on Pro, up to 4 on Agency). Teammates can see and work on portals the owner shares with the team; they cannot see the owner&rsquo;s personal portals, billing, or payment settings.</li>
          <li>The account owner is responsible for the people they invite and for what they do in the team workspace, and can remove them at any time.</li>
          <li>When a teammate moves one of their own portals into a team, that portal, its files and any unpaid invoice transfer to the team owner&rsquo;s account. Its link changes and future payments go to the owner&rsquo;s connected Stripe account.</li>
          <li>If the owner moves to the Free plan, teammates lose access to the team workspace. After a move from Agency to Pro, existing teammates keep access, but no new ones can be invited while the team is over the Pro limit.</li>
        </ul>

        <h2>Custom domains and client approvals</h2>
        <ul>
          <li>You may connect only domains you own or are authorized to use. We may disconnect a domain that is misused or that someone else can show they control.</li>
          <li>Client approvals and change requests are a convenience record of your client&rsquo;s response. They are not a signature or a contract, and we make no guarantee about who submitted them.</li>
        </ul>

        <h2>Your content and ownership</h2>
        <p>
          You retain all rights to the content you upload. You grant us a limited license to host, store, and
          display that content solely to operate the Service for you. We do not claim ownership of your files,
          branding, or client information.
        </p>

        <h2>Our intellectual property</h2>
        <p>
          The Service itself — including its software, design, and the Voxabase name and logo — belongs to us. These
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
          To the maximum extent permitted by law, Voxabase will not be liable for any indirect, incidental,
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
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
    </LegalShell>
  )
}
