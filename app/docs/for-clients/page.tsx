import Link from 'next/link'
import DocsShell from '../DocsShell'

export const metadata = { title: 'What your clients see · Voxabase Help', description: 'The client side of a Voxabase portal.' }

export default function Page() {
  return (
    <DocsShell slug="for-clients">
      <p>
        Clients never sign up or log in. They open the link you send and see one clean page with your project. Use
        <strong> Open client view</strong> (in a portal’s ••• menu) to see it for yourself.
      </p>

      <h2>What’s on the page</h2>
      <ul>
        <li><strong>Your name or logo</strong> at the top, with your brand color on Pro and Agency.</li>
        <li><strong>The project name and description.</strong></li>
        <li><strong>The files</strong>, each with a download button. With more than one file there’s also <strong>Download all</strong>, which downloads everything as one zip.</li>
        <li><strong>The invoice</strong>, if you added one, with a <strong>Pay invoice</strong> button. After payment it shows as paid.</li>
        <li><strong>Approve / Request changes</strong>, if you turned on client approvals (Agency).</li>
      </ul>

      <h2>Before the files are ready</h2>
      <p>If you haven’t clicked <strong>Publish files</strong> yet, your client sees a “Your files are being prepared” message. Everything else, like the invoice, still shows.</p>

      <h2>Paying</h2>
      <p>
        Clients pay by card through Stripe’s secure checkout. They don’t need a Stripe account. Voxabase never sees
        their card details. See <Link href="/docs/payments">Invoices &amp; payments</Link>.
      </p>

      <h2>Password-protected portals</h2>
      <p>If you set a password, clients enter it once. Their browser stays unlocked for 30 days, so they don’t have to type it every visit. See <Link href="/docs/private-portals">Password-protected portals</Link>.</p>

      <h2>What clients can’t do</h2>
      <ul>
        <li>They can’t see your other portals, your dashboard or other clients’ work.</li>
        <li>They can’t upload, delete or change files.</li>
        <li>They can’t change the invoice amount.</li>
      </ul>

      <h2>You’ll know when they’ve looked</h2>
      <p>Your dashboard shows how many times each portal has been viewed and when it was last opened, so you know the link landed.</p>
    </DocsShell>
  )
}
