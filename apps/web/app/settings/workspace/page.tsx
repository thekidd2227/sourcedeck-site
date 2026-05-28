export default function WorkspaceSettingsPage() {
  return (
    <>
      <div className="topline">Workspace settings</div>
      <h1>Tenant controls</h1>
      <p>Workspace_id will be required on tenant-scoped records. User_id will be required on user-scoped credentials.</p>
      <span className="badge">Tenant isolation planned</span>
    </>
  );
}
