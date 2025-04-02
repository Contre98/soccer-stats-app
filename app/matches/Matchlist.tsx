// app/matches/MatchList.tsx (Async Server Component)
import { createClient } from '@/lib/supabase/server';
import MatchesClientComponent from './MatchesClientComponent';
import { redirect } from 'next/navigation'; // Keep redirect logic close to auth check

// Import shared types
import {
  type MatchWithPlayers,
  type PlayerInfo,
  type MatchesPageSearchParams
} from '@/lib/types';

// --- Async Component ---
/**
 * Async Server Component responsible for fetching match and player data
 * based on the user session and potentially searchParams.
 * Renders the MatchesClientComponent with the fetched data.
 */
export default async function MatchList({
  searchParams,
}: {
  searchParams: MatchesPageSearchParams; // Receive searchParams as a prop
}) {
  console.log('MatchList (Async) - Received searchParams:', searchParams);
  const supabase = createClient();

  // Get user session - This remains async
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect if not logged in
  if (!session) {
    redirect('/login');
  }

  // --- Access Search Params ---
  // Now you can safely use searchParams for filtering data fetching if needed
  const myParam = searchParams?.myParam;
  console.log('MatchList (Async) - myParam value:', myParam);
  // Example: const filterValue = searchParams?.filter;

  // --- Fetch Matches Data ---
  // Your existing async data fetching logic
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      *,
      match_players (
        team,
        players ( id, name )
      )
    `)
    .eq('user_id', session.user.id)
    // Example: Add filtering based on searchParams if needed
    // .ilike('some_column', `%${filterValue}%`)
    .order('match_date', { ascending: false });

  // --- Fetch Available Players Data ---
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name')
    .eq('user_id', session.user.id)
    .order('name', { ascending: true });

  // --- Handle Potential Errors ---
  if (matchesError) {
    console.error('Error fetching matches:', matchesError.message);
  }
  if (playersError) {
    console.error('Error fetching players:', playersError.message);
  }

  // --- Render Client Component ---
  // Pass the fetched data and the original searchParams down
  return (
    <MatchesClientComponent
      initialMatches={(matches as MatchWithPlayers[]) ?? []}
      availablePlayers={(players as PlayerInfo[]) ?? []}
      searchParams={searchParams} // Pass searchParams to the client
    />
  );
}
