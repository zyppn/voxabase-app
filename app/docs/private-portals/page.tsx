import Link from 'next/link'
import DocsShell from '../DocsShell'

export const metadata = { title: 'Password-protected portals · Voxabase Help', description: 'Lock a portal so only people with the password can open it.' }

export default function Page() {
  return (
    <DocsShell slug="private-portals">
      <p>Portal links are already hard to guess, but for confidential work you can add a password so the link alone isn’t enough.</p>

      <h2>Add a password</h2>
      <ol>
        <li>Open the portal and click <strong>Edit</strong>.</li>
        <li>Type a password under <strong>Portal password</strong> and save.</li>
        <li>Send your client the link and, separately, the password. Sending them in different messages is safest.</li>
      </ol>

      <h2>What your client sees</h2>
      <ul>
        <li>A short page asking for the password, with your name or logo.</li>
        <li>After the right password, their browser stays unlocked for <strong>30 days</strong>, so refreshing or coming back doesn’t ask again.</li>
        <li>A different browser or device asks for the password once.</li>
      </ul>

      <h2>Change or remove it</h2>
      <ul>
        <li><strong>Change:</strong> enter a new password with <strong>Edit</strong>. Everyone who unlocked with the old one is asked for the new one.</li>
        <li><strong>Remove:</strong> clear the field and save. The portal opens with just the link again.</li>
      </ul>
      <p className="note">We can’t show you a portal password after it’s saved. If you forget it, just set a new one.</p>

      <h2>Custom links</h2>
      <p>
        On Pro you can also choose the portal’s link when you create it, like <code>/yourname/brand-refresh</code> instead
        of a generated one. Look for <strong>Custom link</strong> on the <Link href="/dashboard/new">New portal</Link> page.
      </p>
    </DocsShell>
  )
}
