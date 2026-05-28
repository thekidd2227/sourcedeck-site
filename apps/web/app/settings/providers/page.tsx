import { defaultProviderStatuses } from '../../../src/lib/providers';

export default function ProviderSettingsPage() {
  return (
    <>
      <div className="topline">Provider settings</div>
      <h1>Bring your own keys</h1>
      <p>Commercial workspaces ship blank. Add your own provider key to enable each integration. Raw keys never return to the frontend.</p>
      <table className="table">
        <thead><tr><th>Provider</th><th>Status</th><th>Behavior</th></tr></thead>
        <tbody>
          {defaultProviderStatuses.map(provider => (
            <tr key={provider.id}>
              <td>{provider.label}</td>
              <td className="status">Not configured</td>
              <td>{provider.copy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
