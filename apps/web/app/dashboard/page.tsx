export default function DashboardPage() {
  return (
    <>
      <div className="topline">Dashboard</div>
      <h1>Capture and growth workspace</h1>
      <p>Initial shell for sourcing, opportunity tracking, research notes, provider status, and pipeline visibility.</p>
      <div className="grid">
        <div className="card"><h2>Sourcing</h2><p className="status">Setup required</p></div>
        <div className="card"><h2>Pipeline</h2><p className="status">No workspace data seeded</p></div>
        <div className="card"><h2>Provider status</h2><p className="status">Not configured</p></div>
      </div>
    </>
  );
}
