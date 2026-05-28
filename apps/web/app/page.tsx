export default function HomePage() {
  return (
    <>
      <div className="topline">Commercial path</div>
      <h1>SourceDeck Web SaaS + PWA</h1>
      <p>
        This scaffold is the installable web product foundation. It ships blank,
        uses BYOK by default, and keeps Electron as legacy/internal until web
        parity is reached.
      </p>
      <a className="button" href="/login">Continue to login</a>
      <div className="grid">
        <div className="card"><h2>BYOK by default</h2><p>No bundled provider keys or hidden operator fallback.</p></div>
        <div className="card"><h2>Tenant-based</h2><p>Workspace-scoped records and credential status only.</p></div>
        <div className="card"><h2>PWA install</h2><p>Browser install path without desktop installer dependency.</p></div>
      </div>
    </>
  );
}
