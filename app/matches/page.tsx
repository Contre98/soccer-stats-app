// app/matches/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';
import MatchesClientComponent from './MatchesClientComponent';
import { redirect } from 'next/navigation';
import { ReadonlyURLSearchParams } from 'next/navigation'; // Import if using useSearchParams hook approach later

// --- Type Definitions ---
// (Keep your existing type definitions: PlayerInfo, MatchPlayerInfo, MatchWithPlayers)
interface PlayerInfo {
  id: number;
  name: string;
}
interface MatchPlayerInfo {
  team: string;
  players: PlayerInfo | null;
}
interface MatchWithPlayers {
  id: number;
  match_date: string;
  score_a: number;
  score_b: number;
  replay_url?: string | null;
  user_id: string;
  created_at: string;
  match_players: MatchPlayerInfo[];
}

// Define pagination constants
const ITEMS_PER_PAGE = 20; // Adjust as needed

// Define props for the page component including searchParams
interface MatchesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const supabase = createClient();

  // Get user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // Handle session error or no session
  if (sessionError || !session) {
    console.error('Session error or no session:', sessionError);
    redirect('/login');
  }

  const userId = session.user.id;

  // --- Pagination Logic ---
  // Get current page from search params, default to 1
  const pageParam = searchParams?.page;
  let currentPage = 1;
  if (typeof pageParam === 'string') {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
          currentPage = parsedPage;
      }
  }

  // Calculate range for Supabase query
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // --- Fetch Data ---
  let fetchError: string | null = null; // Variable to hold potential error message

  // 1. Fetch total count of matches for pagination
  const { count: totalCount, error: countError } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true }) // Only fetch count, not data
    .eq('user_id', userId);

  // 2. Fetch the current page of matches WITH related player data
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    // Explicitly select needed columns from 'matches' + nested data
    .select(`
      id, match_date, score_a, score_b, replay_url, created_at, user_id,
      match_players (
        team,
        players ( id, name )
      )
    `)
    .eq('user_id', userId) // Filter by user
    .order('match_date', { ascending: false }) // Newest first
    .range(from, to); // Apply pagination range

  // 3. Fetch available players (for the Add modal - assuming this doesn't need pagination)
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  // --- Handle Errors ---
  // Consolidate error checking
  if (countError) {
    console.error('Error fetching match count:', countError);
    fetchError = `Error fetching match count: ${countError.message}`;
  }
  if (matchesError) {
    console.error('Error fetching matches:', matchesError);
    // Prioritize match fetch error message if both exist
    fetchError = `Error fetching matches: ${matchesError.message}`;
  }
  if (playersError) {
    console.error('Error fetching players:', playersError);
    // Append player fetch error if another error didn't already occur
    fetchError = fetchError ? `${fetchError}; Error fetching players: ${playersError.message}` : `Error fetching players: ${playersError.message}`;
  }

  // Calculate total pages (only if count was successful)
  const totalPages = totalCount ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0;

  // --- Render Client Component ---
  // Pass fetched data, pagination info, and potential error
  return (
    <MatchesClientComponent
      // Use fetched matches or empty array if error/null
      initialMatches={(matches as unknown as MatchWithPlayers[]) ?? []}
      availablePlayers={players ?? []}
      currentPage={currentPage}
      totalPages={totalPages}
      error={fetchError} // Pass error message to client
    />
  );
}