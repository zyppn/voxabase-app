// Help guide: connecting a custom portal domain (Agency).
import Link from 'next/link'
import DocsShell from '../DocsShell'

export const metadata = {
  title: 'Set up your portal domain · Voxabase Help',
  description: 'Send clients to portals on your own domain, like files.yourstudio.com.',
}

export default function CustomDomainGuide() {
  return (
    <DocsShell slug="custom-domain" intro="About 5 minutes, plus a short wait while DNS updates.">
      <p>
        Send clients to portals on your own domain, like <code>files.yourstudio.com/brand-refresh</code>, with no
        Voxabase branding. You keep your domain where it is; you just add one record that points a subdomain at Voxabase.
      </p>

      <h2>Before you start</h2>
      <ul>
        <li>You’re on the <strong>Agency</strong> plan.</li>
        <li>You own a domain and can sign in to where its DNS is managed (usually where you bought it: GoDaddy, Namecheap, Squarespace, Cloudflare, Google Workspace, etc.).</li>
        <li>Pick a <strong>subdomain</strong> you’re not using for anything else. <code>files</code>, <code>portal</code> or <code>clients</code> work well. We recommend a subdomain over your main domain, so your website stays untouched.</li>
      </ul>

      <h2>1. Add the domain in Voxabase</h2>
      <ol>
        <li>Open <Link href="/settings">Settings</Link> and scroll to <strong>Portal domain</strong>.</li>
        <li>Type the full address, like <code>files.yourstudio.com</code>, and click <strong>Connect domain</strong>.</li>
        <li>Voxabase shows the exact DNS record to add. Keep that page open.</li>
      </ol>

      <h2>2. Add the DNS record</h2>
      <p>In your domain provider’s DNS settings, add a new record using the values Voxabase showed you. For a subdomain it looks like this:</p>
      <table>
        <thead><tr><th>Type</th><th>Name / Host</th><th>Value / Points to</th></tr></thead>
        <tbody><tr><td>CNAME</td><td><code>files</code></td><td><code>cname.vercel-dns.com</code></td></tr></tbody>
      </table>
      <p className="note">
        Always copy the values from your Settings page; they’re specific to your domain. Click any name or value
        there to copy it. Leave TTL on its default.
      </p>
      <p>If Voxabase also shows a <strong>TXT</strong> record, add that too. It proves the domain is yours and is only needed when the domain was used on another service before.</p>

      <h3>Provider tips</h3>
      <ul>
        <li><strong>GoDaddy:</strong> My Products → your domain → <em>DNS</em> → <em>Add New Record</em>. For the name, enter just <code>files</code>, not the full domain.</li>
        <li><strong>Namecheap:</strong> Domain List → <em>Manage</em> → <em>Advanced DNS</em> → <em>Add New Record</em> → CNAME Record. Host is <code>files</code>.</li>
        <li><strong>Cloudflare:</strong> your domain → <em>DNS</em> → <em>Records</em> → <em>Add record</em>. Set the proxy status to <strong>DNS only</strong> (grey cloud). The orange cloud blocks the security certificate.</li>
        <li><strong>Squarespace Domains:</strong> Domains → your domain → <em>DNS</em> → <em>Custom records</em> → add a CNAME with host <code>files</code>.</li>
        <li><strong>Other providers:</strong> look for “DNS”, “DNS records” or “Zone editor”. Many providers add your domain to the end automatically, so enter only the subdomain part.</li>
      </ul>

      <h2>3. Check it’s live</h2>
      <ol>
        <li>Back in <Link href="/settings">Settings</Link>, click <strong>Check again</strong>.</li>
        <li>When it shows <strong>Live</strong>, you’re done. Each portal’s client link now uses your domain, and the “Delivered via Voxabase” line is hidden there.</li>
      </ol>
      <p>Most changes go live within minutes. Some providers take up to 48 hours, so if it’s still waiting, check back later. There’s nothing else to do.</p>

      <h2>Troubleshooting</h2>
      <ul>
        <li><strong>Still “Waiting for DNS” after an hour:</strong> check the record’s name. A common mistake is entering <code>files.yourstudio.com</code> as the name, which some providers turn into <code>files.yourstudio.com.yourstudio.com</code>.</li>
        <li><strong>“A record with that host already exists”:</strong> another record is using that subdomain. Delete it or pick a different subdomain.</li>
        <li><strong>Using your main domain (yourstudio.com) instead:</strong> Voxabase will show an <strong>A</strong> record instead of a CNAME. This replaces your website, so only do it on a domain that’s just for portals.</li>
        <li><strong>Cloudflare shows an SSL or redirect error:</strong> switch the record to <strong>DNS only</strong>.</li>
        <li><strong>“Another account is setting up that domain”:</strong> someone started connecting it first. If it’s yours, email us and we’ll sort it out.</li>
      </ul>

      <h2>Changing or removing the domain</h2>
      <p>
        In Settings → Portal domain, click <strong>Remove domain</strong>. Links using it stop working right away,
        and portal links go back to your regular Voxabase address. You can then delete the DNS record at your provider.
      </p>
    </DocsShell>
  )
}
