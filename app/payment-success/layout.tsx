// Client-facing pages keep their own dark look, whatever Appearance the
// portal owner picked for the app (see the data-scheme rule in globals.css).
export default function ClientFacingLayout({ children }: { children: React.ReactNode }) {
  return <div data-scheme="dark" className="contents">{children}</div>
}
