import Link from 'next/link'
import DocsShell from '../DocsShell'

export const metadata = { title: 'Account security · Voxabase Help', description: 'Two-step verification, sessions and keeping your Voxabase account safe.' }

export default function Page() {
  return (
    <DocsShell slug="security">
      <h2>Turn on two-step verification</h2>
      <p>With two-step verification on, signing in needs your password and a code from an authenticator app on your phone. We strongly recommend it, since your account can receive client payments.</p>
      <ol>
        <li>Install an authenticator app, like Google Authenticator, 1Password or Authy.</li>
        <li>In <Link href="/settings">Settings</Link>, find <strong>Two-step verification</strong> and click <strong>Turn on</strong>.</li>
        <li>Scan the code with your app, then enter the 6-digit code it shows.</li>
      </ol>
      <p className="note">Lost your phone? Use <strong>Lost your authenticator?</strong> on the sign-in page to email us, and we’ll verify it’s you.</p>

      <h2>Sign out everywhere</h2>
      <p>Used a shared computer, or lost a device? In Settings → <strong>Sessions</strong>, sign out of all devices at once, including the one you’re on.</p>

      <h2>Automatic sign-out</h2>
      <p>If you don’t use Voxabase for 7 days, you’re signed out on that device.</p>

      <h2>Changing your email or password</h2>
      <p>Changing the email on your account asks for your current password first, so nobody can take over your account from an unlocked laptop.</p>

      <h2>How your files are protected</h2>
      <ul>
        <li>Files are stored privately. Download links are created on demand and expire shortly after, so an old link can’t be shared around.</li>
        <li>Password-protected portals never send their files until the right password is entered. See <Link href="/docs/private-portals">Password-protected portals</Link>.</li>
        <li>Card payments are handled by Stripe. Voxabase never sees or stores card numbers.</li>
      </ul>

      <h2>Report a problem</h2>
      <p>If something looks wrong with your account, or you think you’ve found a security issue, email us right away.</p>
    </DocsShell>
  )
}
