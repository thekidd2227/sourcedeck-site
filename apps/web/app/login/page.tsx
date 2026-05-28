export default function LoginPage() {
  return (
    <>
      <div className="topline">Authentication shell</div>
      <h1>Sign in to SourceDeck</h1>
      <p>Auth provider is intentionally not hardwired in Phase 1. Clerk, Auth.js, Supabase Auth, or Keycloak can be bound behind this shell.</p>
      <span className="badge">No live auth provider connected</span>
    </>
  );
}
