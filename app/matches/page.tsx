// app/matches/page.tsx (Server Component - Final Type Fix Attempt)
import { createClient } from '@/lib/supabase/server';
import MatchesClientComponent from './MatchesClientComponent';
import { redirect } from 'next/navigation';
// --- Import Shared Types ---
// Make sure PlayerInfo and MatchWithPlayers are correctly defined in lib/types.ts
import type { PlayerInfo, MatchWithPlayers } from '@/lib/types';

const ITEMS_PER_PAGE = 20;

// --- UPDATED Function Signature: Explicitly type params and searchParams ---
export default async function MatchesPage({
  params, // Include params in signature even if unused
  searchParams,
}: {
  params: { [key: string]: string | string[] | undefined }; // Standard params type
  searchParams?: { [key: string]: string | string[] | undefined }; // Standard searchParams type (optional)
}) {
// --- END UPDATED Signature ---

  const supabase = createClient();

  // Get user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('Session error or no session:', sessionError);
    redirect('/login');
  }

  const userId = session.user.id;

  // Pagination Logic - Safely access searchParams
  const pageParam = searchParams?.page; // Use optional chaining
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

  // --- Fetch Concurrently ---
  const [
      matchCountRes,
      matchPageRes,
      playerListRes
  ] = await Promise.all([
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('matches')
          .select(`
              id, match_date, score_a, score_b, replay_url, created_at, user_id,
              match_players ( team, players ( id, name ) )
          `)
          .eq('user_id', userId)
          .order('match_date', { ascending: false })
          .range(from, to),
      supabase.from('players')
          .select('id, name') // Select only needed fields for PlayerInfo
          .eq('user_id', userId)
          .order('name', { ascending: true })
  ]);

  // --- Process Results ---
  const totalCount = matchCountRes.count;
  const matches = matchPageRes.data;
  const players = playerListRes.data;

  // Handle Errors
  if (matchCountRes.error) {
    console.error('Error fetching match count:', matchCountRes.error);
    fetchError = `Error fetching match count: ${matchCountRes.error.message}`;
  }
  if (matchPageRes.error) {
    console.error('Error fetching matches:', matchPageRes.error);
    fetchError = fetchError ? `${fetchError}; Error fetching matches: ${matchPageRes.error.message}` : `Error fetching matches: ${matchPageRes.error.message}`;
  }
  if (playerListRes.error) {
    console.error('Error fetching players:', playerListRes.error);
    fetchError = fetchError ? `${fetchError}; Error fetching players: ${playerListRes.error.message}` : `Error fetching players: ${playerListRes.error.message}`;
  }

  const totalPages = totalCount ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0;

  // Render Client Component
  return (
    <MatchesClientComponent
      // Use type assertion with the imported shared type
      initialMatches={(matches as MatchWithPlayers[]) ?? []}
      // Use type assertion with the imported shared type
      availablePlayers={(players as PlayerInfo[]) ?? []}
      currentPage={currentPage}
      totalPages={totalPages}
      error={fetchError}
    />
  );
}
