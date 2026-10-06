import Link from 'next/link'
import DocsShell from '../DocsShell'

export const metadata = { title: 'Getting started · Voxabase Help', description: 'Create your first client portal, add files and send the link.' }

export default function Page() {
  return (
    <DocsShell slug="getting-started" intro="About 3 minutes.">
      <p>A portal is one page per project where your client downloads the work and, if you add an invoice, pays for it. Here’s how to send your first one.</p>

      <h2>1. Create a portal</h2>
      <ol>
        <li>On your <Link href="/dashboard">Dashboard</Link>, click <strong>New portal</strong>.</li>
        <li>Give it a name your client will recognize, like <em>Brand refresh</em>. Add a short description if it helps.</li>
        <li>Click <strong>Create portal</strong>. You land in the portal editor.</li>
      </ol>

      <h2>2. Add your files</h2>
      <ul>
        <li>Drag files onto the upload area, or click it to choose them. Each file can be up to <strong>1 GB</strong>.</li>
        <li>With more than one file, drag them to change the order your client sees.</li>
        <li>Sending a revision? Use <strong>Replace</strong> on a file to swap in the new version without changing the link.</li>
      </ul>

      <h2>3. Publish the files</h2>
      <p>
        Until you click <strong>Publish files</strong>, your client sees a “Your files are being prepared” message instead of
        the downloads. That lets you upload in peace and send the link early. When everything’s in, publish.
      </p>

      <h2>4. Send the link</h2>
      <ol>
        <li>Click the link under <strong>Client link</strong> to copy it, then paste it into your email or message. (You can also copy it from the dashboard: hover a portal and click <strong>Copy link</strong>.)</li>
        <li>Use <strong>Open client view</strong> in the <strong>•••</strong> menu to see exactly what your client will see.</li>
      </ol>
      <p className="note">Your client doesn’t need an account. They just open the link.</p>

      <h2>What’s next</h2>
      <ul>
        <li><Link href="/docs/payments">Add an invoice</Link> so your client can pay from the same page.</li>
        <li><Link href="/docs/branding">Add your logo and color</Link> (Pro).</li>
        <li><Link href="/docs/private-portals">Lock a portal with a password</Link> (Pro).</li>
      </ul>

      <h2>Limits on the Free plan</h2>
      <p>
        Free includes unlimited portals and 1 GB of storage, and payments carry a 2% Voxabase fee. Pro adds your
        branding and password-protected portals, raises storage to 25 GB and drops the fee to 0%. See <Link href="/docs/billing">Plans &amp; billing</Link>.
      </p>
    </DocsShell>
  )
}
