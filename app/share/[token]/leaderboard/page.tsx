// app/share/[token]/leaderboard/page.tsx (Simplified for Debugging)
import { notFound } from 'next/navigation';

// Define props inline
export default function ShareLeaderboardPage({
  params,
}: {
  params: { token: string };
}) {
  const shareToken = params.token;

  // Basic validation
  if (!shareToken || typeof shareToken !== 'string') {
    // In a real scenario without async, redirecting might require different handling,
    // but for this type check test, notFound() might still work or just return null.
    // Let's keep it simple for the type check.
    // notFound(); // Temporarily comment out or remove if it causes issues in sync component
    console.error("Share leaderboard: Invalid or missing token format.");
    return <div>Invalid Token Format</div>; // Return something simple
  }

  // Just render the token to test props typing
  return (
    <div>
      <h1>Shared Leaderboard (Simplified)</h1>
      <p>Token: {shareToken}</p>
      <p>This is a temporary version to test type checking.</p>
    </div>
  );
}
