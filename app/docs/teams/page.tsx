import Link from 'next/link'
import DocsShell from '../DocsShell'

export const metadata = { title: 'Teams & workspaces · Voxabase Help', description: 'Invite teammates, share a Team workspace and move portals between workspaces.' }

export default function Page() {
  return (
    <DocsShell slug="teams">
      <p>Work on client portals together. Pro includes 1 teammate and Agency up to 4. Teammates don’t need a paid plan of their own.</p>

      <h2>Invite a teammate</h2>
      <ol>
        <li>Open <Link href="/settings">Settings</Link> and find <strong>Team</strong>.</li>
        <li>Enter your teammate’s email and click <strong>Invite</strong>.</li>
        <li>Send them the invite with <strong>Copy invite link</strong> or <strong>Email it</strong>.</li>
        <li>They open the link and sign in, or create an account, with that same email. That’s it, they’re on your team.</li>
      </ol>
      <p className="note">The invite only works for the email you entered. If they use a different address, cancel the invite and send a new one.</p>

      <h2>Personal and Team workspaces</h2>
      <ul>
        <li><strong>Personal</strong> is your own space. Only you can see portals there.</li>
        <li><strong>Team</strong> is shared. Everyone on the team sees and works on the same portals.</li>
        <li>Switch between them from the <strong>Workspace</strong> menu at the bottom left. The sidebar shows who’s on the team, with a green dot for anyone online now.</li>
      </ul>
      <p>The owner keeps their Personal workspace too. Portals you made before starting a team stay Personal until you move them.</p>

      <h2>Moving portals</h2>
      <ul>
        <li><strong>Team owner:</strong> open a portal, click <strong>•••</strong>, then <strong>Move to Team</strong> or <strong>Move to Personal</strong>. The link stays the same, and you can move it back anytime.</li>
        <li><strong>Teammate:</strong> you can move one of your own portals into a team you’re on with <strong>•••</strong> → <strong>Move to … · Team</strong>. It then belongs to the team owner: the link changes, invoice payments go to the owner’s Stripe, and you can’t move it back to your workspace.</li>
      </ul>

      <h2>Who can do what</h2>
      <table>
        <thead><tr><th></th><th>Owner</th><th>Teammate</th></tr></thead>
        <tbody>
          <tr><td>Create portals, upload files, send links</td><td>Yes</td><td>Yes</td></tr>
          <tr><td>Edit portals and invoices</td><td>Yes</td><td>Yes</td></tr>
          <tr><td>Delete portals</td><td>Yes</td><td>No</td></tr>
          <tr><td>Billing, Stripe, branding, domain</td><td>Yes</td><td>No</td></tr>
          <tr><td>Invite or remove teammates</td><td>Yes</td><td>No</td></tr>
        </tbody>
      </table>
      <p>Team portals use the owner’s branding, storage and Stripe account.</p>

      <h2>Removing someone or leaving</h2>
      <ul>
        <li><strong>Owner:</strong> Settings → Team → <strong>Remove</strong>. They lose access right away. Portals stay with the team.</li>
        <li><strong>Teammate:</strong> Settings → <strong>Teams you’re on</strong> → <strong>Leave team</strong>.</li>
      </ul>

      <h2>If the owner’s plan changes</h2>
      <p>If the owner drops to Free, teammates can’t open the Team workspace until the owner upgrades again. Nothing is deleted.</p>
    </DocsShell>
  )
}
