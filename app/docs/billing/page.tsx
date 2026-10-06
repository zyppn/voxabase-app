import Link from 'next/link'
import DocsShell from '../DocsShell'

export const metadata = { title: 'Plans & billing · Voxabase Help', description: 'What each Voxabase plan includes, and how to upgrade, switch or cancel.' }

export default function Page() {
  return (
    <DocsShell slug="billing">
      <h2>What each plan includes</h2>
      <table>
        <thead><tr><th></th><th>Free</th><th>Pro</th><th>Agency</th></tr></thead>
        <tbody>
          <tr><td>Price</td><td>$0</td><td>$15/mo, or $12/mo billed yearly</td><td>$49/mo, or $39/mo billed yearly</td></tr>
          <tr><td>Portals</td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
          <tr><td>Storage</td><td>1 GB</td><td>25 GB</td><td>250 GB</td></tr>
          <tr><td>Voxabase payment fee</td><td>2%</td><td>0%</td><td>0%</td></tr>
          <tr><td>Branding, passwords, custom links</td><td>—</td><td>Yes</td><td>Yes</td></tr>
          <tr><td>Teammates</td><td>—</td><td>1</td><td>4</td></tr>
          <tr><td>Client approvals</td><td>—</td><td>—</td><td>Yes</td></tr>
          <tr><td>Your own portal domain</td><td>—</td><td>—</td><td>Yes</td></tr>
        </tbody>
      </table>
      <p>Every plan lets you upload files up to 1 GB each. Paying yearly saves 20%.</p>

      <h2>Upgrade</h2>
      <p>Go to <Link href="/pricing">Pricing</Link>, choose monthly or yearly, and pick a plan. You pay through Stripe’s secure checkout, and the new features turn on right away.</p>

      <h2>Change plan, card or invoices</h2>
      <p>In <Link href="/settings">Settings</Link>, click <strong>Manage billing</strong>. It opens Stripe’s billing page, where you can switch plans, update your card and download receipts.</p>

      <h2>Cancel</h2>
      <ul>
        <li>Cancel anytime from <strong>Manage billing</strong>.</li>
        <li>You keep your plan until the end of the period you paid for, then move to Free.</li>
        <li>Nothing is deleted, and links you’ve already sent keep working. On Free you can’t upload past 1 GB, and client payments carry the 2% fee again.</li>
      </ul>

      <h2>Questions about a charge</h2>
      <p>Email us and we’ll help. Include the email on your account.</p>
    </DocsShell>
  )
}
