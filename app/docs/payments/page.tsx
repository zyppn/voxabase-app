import Link from 'next/link'
import DocsShell from '../DocsShell'

export const metadata = { title: 'Invoices & payments · Voxabase Help', description: 'Connect Stripe, add an invoice and get paid from your portal.' }

export default function Page() {
  return (
    <DocsShell slug="payments" intro="Stripe setup takes about 5–10 minutes, once.">
      <p>Put the invoice right next to the files, so your client can pay the moment they have the work. Payments go through Stripe, straight to your bank.</p>

      <h2>1. Connect Stripe (once)</h2>
      <ol>
        <li>Open the menu at the bottom left and choose <strong>Connect Stripe</strong>, or go to <Link href="/stripe-setup">Stripe setup</Link>.</li>
        <li>Stripe asks for your business details and a bank account for payouts. Already have Stripe? You can sign in with it.</li>
        <li>When you’re sent back, Voxabase checks your account. If it says <strong>Finish your Stripe setup</strong>, Stripe still needs something from you. Click the button to pick up where you left off.</li>
      </ol>
      <p className="note">Clients can’t pay until Stripe has finished verifying your account. That’s usually instant, but Stripe sometimes asks for an ID or extra details.</p>

      <h2>2. Add an invoice to a portal</h2>
      <ol>
        <li>Open the portal and click <strong>Edit</strong>.</li>
        <li>Enter the invoice amount and save.</li>
        <li>The portal now shows the invoice with a <strong>Pay invoice</strong> button.</li>
      </ol>

      <h2>3. Get paid</h2>
      <ul>
        <li>When your client pays, the portal is marked <strong>Paid</strong> automatically, and your dashboard shows it.</li>
        <li>After payment the invoice is locked, so the amount can’t be changed by mistake.</li>
        <li>Stripe pays out to your bank on its usual schedule, typically a couple of business days.</li>
      </ul>

      <h2>Fees</h2>
      <table>
        <thead><tr><th>Plan</th><th>Voxabase fee</th><th>Stripe’s card fee</th></tr></thead>
        <tbody>
          <tr><td>Free</td><td>2%</td><td>Stripe’s standard rate</td></tr>
          <tr><td>Pro</td><td>0%</td><td>Stripe’s standard rate</td></tr>
          <tr><td>Agency</td><td>0%</td><td>Stripe’s standard rate</td></tr>
        </tbody>
      </table>
      <p>Stripe’s own processing fee always applies. It’s set by Stripe, not Voxabase, and you can see it in your Stripe dashboard.</p>

      <h2>Refunds and disputes</h2>
      <p>Refunds and disputes are handled in your Stripe dashboard, since the payment lives in your Stripe account.</p>

      <h2>Teams</h2>
      <p>Payments in a Team workspace go to the team owner’s Stripe account. Only the owner can connect or change Stripe.</p>

      <h2>Troubleshooting</h2>
      <ul>
        <li><strong>Client sees “Payments aren’t set up for this portal yet”:</strong> finish your Stripe setup from <Link href="/stripe-setup">Stripe setup</Link>.</li>
        <li><strong>Paid but the portal still shows unpaid:</strong> refresh after a minute. If it stays unpaid, email us with the portal name.</li>
      </ul>
    </DocsShell>
  )
}
