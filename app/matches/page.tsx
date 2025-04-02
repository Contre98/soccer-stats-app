// app/matches/page.tsx (Async Server Component for Next.js 15+)
import { createClient } from '@/lib/supabase/server';
import MatchesClientComponent from './MatchesClientComponent';
import { redirect } from 'next/navigation';

// Import shared types
import {
  type MatchWithPlayers,
  type PlayerInfo,
  type MatchesPageSearchParams // This is the type for the *resolved* object
} from '@/lib/types'; // Adjust the path based on your file structure

// --- Page Component ---
/**
 * Async Server Component for the Matches page (Next.js 15+).
 * Receives searchParams as a Promise, resolves it, fetches data,
 * and renders the client component.
 */
export default async function MatchesPage({
  // Type searchParams as a Promise containing the actual search params object type
  searchParams: searchParamsPromise,
}: {
  // Define the props structure for the async page
  searchParams: Promise<MatchesPageSearchParams>;
}) {
  // --- Resolve searchParams Promise ---
  // Use await to get the actual searchParams object before proceeding
  const searchParams = await searchParamsPromise;
  console.log('MatchesPage (Async) - Resolved searchParams:', searchParams);

  // Initialize Supabase client
  const supabase = createClient();

  // Get user session
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect if not logged in
  if (!session) {
    redirect('/login');
  }

  // --- Access Search Params ---
  // Now you can safely access the resolved searchParams object
  const myParam = searchParams?.myParam;
  console.log('MatchesPage (Async) - myParam value:', myParam);
  // Use other params for filtering etc. if needed:
  // const someFilter = searchParams?.filter;

  // --- Fetch Matches Data ---
  // Fetch matches associated with the user
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    // --- Fix: Removed comment from inside the select string ---
    .select(`
      *,
      match_players (
        player_id,
        team,
        players ( id, name )
      )
    `)
    .eq('user_id', session.user.id)
    // Example: Add server-side filtering based on resolved searchParams
    // .eq(someFilter ? 'column_name' : 'user_id', someFilter || session.user.id)
    .order('match_date', { ascending: false });

  // --- Fetch Available Players Data ---
  // Fetch players associated with the user (including manual_rating for potential use)
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name, manual_rating') // Select needed fields
    .eq('user_id', session.user.id)
    .order('name', { ascending: true });

  // --- Handle Potential Errors ---
  // Log any errors during data fetching
  if (matchesError) {
    // Log the specific error causing the query failure
    console.error('Error fetching matches:', matchesError.message);
  }
  if (playersError) {
    console.error('Error fetching players:', playersError.message);
  }

  // --- Render Client Component ---
  // Pass the *resolved* searchParams object down to the client component
  // Pass potentially null matches/players data safely using ?? []
  return (
    <MatchesClientComponent
      initialMatches={(matches as MatchWithPlayers[]) ?? []}
      // Ensure players data matches PlayerInfo[] type (including manual_rating)
      availablePlayers={(players as PlayerInfo[]) ?? []}
      searchParams={searchParams} // Pass the resolved object, not the promise
    />
  );
}
