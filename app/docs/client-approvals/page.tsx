import DocsShell from '../DocsShell'

export const metadata = { title: 'Client approvals · Voxabase Help', description: 'Let clients approve a delivery or request changes from the portal.' }

export default function Page() {
  return (
    <DocsShell slug="client-approvals">
      <p>Get a clear yes, in writing, instead of hunting through email. Your client approves the delivery or asks for changes right on the portal, and you see the answer on your dashboard.</p>

      <h2>Turn it on</h2>
      <ol>
        <li>Open the portal.</li>
        <li>Switch on <strong>Client approvals</strong>.</li>
        <li>Once the files are live, your client sees <strong>Approve</strong> and <strong>Request changes</strong> on the portal. Until they answer, the editor shows “Waiting for your client to review”.</li>
      </ol>

      <h2>What happens next</h2>
      <ul>
        <li><strong>Approve:</strong> you see <strong>Approved</strong>, with their name and the time, in the editor and on your dashboard.</li>
        <li><strong>Request changes:</strong> your client writes what they’d like changed. You see <strong>Changes requested</strong> and their note.</li>
      </ul>

      <h2>Sending a revision</h2>
      <ol>
        <li>Update the files. Use <strong>Replace</strong> on a file to keep the same spot in the list.</li>
        <li>Click <strong>Ask again</strong>. The approval resets, and your client can review the new version.</li>
      </ol>

      <h2>Good to know</h2>
      <ul>
        <li>Approvals work alongside invoices. Many studios ask for approval first, then send the invoice.</li>
        <li>Turning approvals off hides the buttons from your client. Their last answer is kept and shows again if you turn approvals back on.</li>
      </ul>
    </DocsShell>
  )
}
