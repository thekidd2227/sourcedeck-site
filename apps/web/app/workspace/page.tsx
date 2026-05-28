export default function WorkspacePage() {
  return (
    <>
      <div className="topline">Workspace setup</div>
      <h1>Create or join a workspace</h1>
      <p>Commercial records will be scoped by workspace_id. User credentials will be scoped by user_id and workspace policy.</p>
      <div className="grid">
        <div className="card"><h2>Commercial Self-Serve</h2><p>BYOK only. No ARCG-managed IBM Watson.</p></div>
        <div className="card"><h2>Managed Tier</h2><p>Managed provider access only when entitlement allows it.</p></div>
      </div>
    </>
  );
}
