// app/privacy/page.tsx
import LegalShell, { CONTACT_EMAIL } from '../_components/LegalShell'

export const metadata = {
  title: 'Privacy Policy · Voxabase',
  description: 'How Voxabase collects, uses, and protects your information.',
}

const LAST_UPDATED = 'June 29, 2026'

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated={LAST_UPDATED} other={{ href: '/terms', label: 'Terms of Service' }}>

        <p>
          This Privacy Policy explains how Voxabase (&ldquo;Voxabase,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) collects, uses,
          and shares information when you use our client deliverables portal at voxabase.com and app.voxabase.com
          (the &ldquo;Service&rdquo;). By using the Service, you agree to this policy.
        </p>

        <h2>Who we are</h2>
        <p>
          Voxabase is a software service that lets freelancers and studios create branded portals to deliver files
          to their clients and collect invoice payments. For the personal information of account holders, Voxabase
          acts as the data controller. For files and client details that account holders upload about their own
          customers, the account holder is the controller and Voxabase is a processor acting on their behalf.
        </p>

        <h2>Information we collect</h2>
        <p>We collect the following, depending on how you use the Service:</p>
        <ul>
          <li><strong>Account information</strong> — your name, business name, email address, and password (passwords are stored hashed, never in plain text).</li>
          <li><strong>Content you upload</strong> — files, project names, descriptions, invoice amounts, and any branding (logo, colors) you add to your portals.</li>
          <li><strong>Payment information</strong> — when you subscribe or your clients pay an invoice, payment is processed by Stripe. We do not store card numbers. Stripe provides us limited details such as subscription status and the last four digits of a card.</li>
          <li><strong>Usage information</strong> — basic technical data such as portal views, IP address, browser type, and timestamps, used to operate and secure the Service.</li>
          <li><strong>Communications</strong> — if you email us, we keep the message and your contact details to respond.</li>
        </ul>

        <h2>How we use your information</h2>
        <ul>
          <li>To provide, maintain, and improve the Service.</li>
          <li>To process subscriptions and enable your clients to pay invoices.</li>
          <li>To authenticate you and keep your account secure.</li>
          <li>To respond to your support requests.</li>
          <li>To send essential service messages (for example, billing or security notices).</li>
          <li>To comply with legal obligations and enforce our Terms of Service.</li>
        </ul>
        <p>
          We do not sell your personal information, and we do not show third-party ads in the Service.
        </p>

        <h2>Service providers (subprocessors)</h2>
        <p>
          We rely on a small number of trusted providers to run the Service. Each processes data on our behalf
          under a data processing agreement and only as needed to provide their service:
        </p>
        <ul>
          <li><strong>Stripe</strong> — payment processing and subscription billing. See <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe&rsquo;s privacy policy</a>.</li>
          <li><strong>Supabase</strong> — database, authentication, and file storage. See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase&rsquo;s privacy policy</a>.</li>
          <li><strong>Vercel</strong> — application hosting and content delivery. See <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel&rsquo;s privacy policy</a>.</li>
        </ul>
        <p>
          If we add or change providers, we will update this list. Some of these providers are based in the United
          States, so your information may be transferred to and processed there.
        </p>

        <h2>How long we keep information</h2>
        <p>
          We keep your information for as long as your account is active. If you delete your account or specific
          content, we remove the associated data within a reasonable period, except where we must retain it to meet
          legal, tax, or accounting obligations (for example, payment records).
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on where you live (for example, under the GDPR or CCPA), you may have the right to access,
          correct, export, or delete your personal information, and to object to or restrict certain processing.
          You can update most details directly in your account settings, or contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will respond. We will not discriminate
          against you for exercising these rights.
        </p>

        <h2>Security</h2>
        <p>
          We use industry-standard measures to protect your information, including encryption in transit, hashed
          passwords, and access controls. No method of transmission or storage is completely secure, so we cannot
          guarantee absolute security, but we work to protect your data and to notify you of significant incidents
          where required by law.
        </p>

        <h2>Children</h2>
        <p>
          The Service is not directed to children under 16, and we do not knowingly collect their personal
          information. If you believe a child has provided us information, contact us and we will delete it.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will revise the &ldquo;last updated&rdquo;
          date above and, for significant changes, notify you through the Service or by email.
        </p>

        <h2>Contact us</h2>
        <p>
          If you have questions about this policy or your data, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
    </LegalShell>
  )
}
