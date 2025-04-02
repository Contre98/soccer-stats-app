// app/matches/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';
import MatchesClientComponent from './MatchesClientComponent';
import { redirect } from 'next/navigation';
// --- Fix: Removed unused ReadonlyURLSearchParams import ---
// import { ReadonlyURLSearchParams } from 'next/navigation';

// --- Type Definitions ---
interface PlayerInfo { id: number; name: string; }
interface MatchPlayerInfo { team: string; players: PlayerInfo | null; }
interface MatchWithPlayers {
  id: number; match_date: string; score_a: number; score_b: number;
  replay_url?: string | null; user_id: string; created_at: string;
  match_players: MatchPlayerInfo[];
}

const ITEMS_PER_PAGE = 20;

interface MatchesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const supabase = createClient();

  // Get user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('Session error or no session:', sessionError);
    redirect('/login');
  }

  const userId = session.user.id;

  // Pagination Logic
  const pageParam = searchParams?.page;
  let currentPage = 1;
  if (typeof pageParam === 'string') {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
          currentPage = parsedPage;
      }
  }
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch Data
  let fetchError: string | null = null;

  // 1. Fetch total count
  const { count: totalCount, error: countError } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // 2. Fetch current page of matches
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      id, match_date, score_a, score_b, replay_url, created_at, user_id,
      match_players (
        team,
        players ( id, name )
      )
    `)
    .eq('user_id', userId)
    .order('match_date', { ascending: false })
    .range(from, to);

  // 3. Fetch available players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name') // Assuming only id/name needed for modal
    .eq('user_id', userId)
    .order('name', { ascending: true });

  // Handle Errors
  if (countError) {
    console.error('Error fetching match count:', countError);
    fetchError = `Error fetching match count: ${countError.message}`;
  }
  if (matchesError) {
    console.error('Error fetching matches:', matchesError);
    fetchError = fetchError ? `${fetchError}; Error fetching matches: ${matchesError.message}` : `Error fetching matches: ${matchesError.message}`;
  }
  if (playersError) {
    console.error('Error fetching players:', playersError);
    fetchError = fetchError ? `${fetchError}; Error fetching players: ${playersError.message}` : `Error fetching players: ${playersError.message}`;
  }

  const totalPages = totalCount ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0;

  // Render Client Component
  return (
    <MatchesClientComponent
      initialMatches={(matches as unknown as MatchWithPlayers[]) ?? []}
      availablePlayers={(players as PlayerInfo[]) ?? []} // Assuming PlayerInfo type matches
      currentPage={currentPage}
      totalPages={totalPages}
      error={fetchError}
    />
  );
}
