export default function PipelinePage() {
  return (
    <>
      <div className="topline">Pipeline</div>
      <h1>Opportunity pipeline</h1>
      <p>No seeded private operating data is included. Pipeline records will be tenant-scoped.</p>
      <table className="table">
        <thead><tr><th>Stage</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Research</td><td>Awaiting workspace data</td></tr>
          <tr><td>Pricing</td><td>Awaiting workspace data</td></tr>
          <tr><td>Submitted</td><td>Awaiting workspace data</td></tr>
        </tbody>
      </table>
    </>
  );
}
