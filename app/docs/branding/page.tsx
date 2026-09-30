import Link from 'next/link'
import DocsShell from '../DocsShell'

export const metadata = { title: 'Branding · Voxabase Help', description: 'Add your logo and accent color to every portal.' }

export default function Page() {
  return (
    <DocsShell slug="branding">
      <p>Make every portal look like it came from your studio. Branding applies to all your portals at once, including ones you’ve already sent.</p>

      <h2>Set it up</h2>
      <ol>
        <li>Open <Link href="/settings">Settings</Link> and find <strong>Branding</strong>.</li>
        <li>Click <strong>Upload your logo</strong>. PNG, JPG or SVG, under 2 MB. A logo with a transparent background looks best.</li>
        <li>Under <strong>Show on portals</strong>, choose <strong>Logo + Name</strong>, <strong>Logo only</strong> or <strong>Name only</strong>.</li>
        <li>Pick an <strong>Accent color</strong>. It’s used for buttons and highlights on your portals.</li>
        <li>Click <strong>Save branding</strong>.</li>
      </ol>

      <h2>Which name is shown</h2>
      <p>Portals show your <strong>Business name</strong> from Settings. If you haven’t set one, they show your own name.</p>

      <h2>Tips</h2>
      <ul>
        <li>Choose a color with enough contrast against the dark background, so button text stays readable. Very dark colors blend in.</li>
        <li>Open any portal’s client view after saving to check the result.</li>
      </ul>

      <h2>Removing Voxabase branding</h2>
      <p>
        Portals show a small “Delivered via Voxabase” line at the bottom. On Agency, portals opened on your own domain hide
        it. See <Link href="/docs/custom-domain">Set up your portal domain</Link>.
      </p>

      <h2>Teams</h2>
      <p>Team portals use the team owner’s branding. Only the owner can change it.</p>
    </DocsShell>
  )
}
