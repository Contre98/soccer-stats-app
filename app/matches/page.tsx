// app/matches/page.tsx (Synchronous Page Component)
import MatchList from './Matchlist'; // Import the new async component
import { type MatchesPageSearchParams } from '@/lib/types'; // Import type from shared file

// --- Page Component ---
/**
 * Synchronous Page component for the Matches route.
 * Receives searchParams and delegates data fetching and rendering
 * to the async MatchList component.
 */
export default function MatchesPage({
  searchParams,
}: {
  searchParams: MatchesPageSearchParams; // Define props inline
}) {
  console.log('MatchesPage (Sync) - Received searchParams:', searchParams);

  // Render the async component responsible for fetching data,
  // passing the searchParams down.
  return <MatchList searchParams={searchParams} />;
}
