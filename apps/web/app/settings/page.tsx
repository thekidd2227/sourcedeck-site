export default function SettingsPage() {
  return (
    <>
      <div className="topline">Settings</div>
      <h1>Workspace settings</h1>
      <p>Configure provider credentials, workspace details, billing, and tenant controls.</p>
      <div className="grid">
        <a className="card" href="/settings/providers"><h2>Providers</h2><p>BYOK credential status.</p></a>
        <a className="card" href="/settings/workspace"><h2>Workspace</h2><p>Tenant profile and member controls.</p></a>
        <a className="card" href="/settings/billing"><h2>Billing</h2><p>Subscription hooks planned. No live billing yet.</p></a>
      </div>
    </>
  );
}
