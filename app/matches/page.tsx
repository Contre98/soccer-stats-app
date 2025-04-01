// app/matches/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';
import MatchesClientComponent from './MatchesClientComponent';
import { redirect } from 'next/navigation';

// --- Type Definitions ---
// Define Player structure based on what we select
interface PlayerInfo {
  id: number;
  name: string;
}

// Define structure for the join table data, including nested player info
interface MatchPlayerInfo {
  team: string; // 'A' or 'B'
  players: PlayerInfo | null; // Nested player details (can be null if player deleted)
}

// Update Match type to include the nested match_players data
interface MatchWithPlayers {
  id: number;
  match_date: string;
  score_a: number;
  score_b: number;
  replay_url?: string | null;
  user_id: string;
  created_at: string;
  match_players: MatchPlayerInfo[]; // Array of players linked to this match
}



export default async function MatchesPage() {
  const supabase = createClient();

  // Get user session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // --- Fetch Data ---
  // Fetch matches WITH related player data using nested select
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    // Select columns from 'matches' table
    // And for each match, select related 'match_players' records
    // Within 'match_players', select the 'team' column
    // And the related 'players' record (specifically 'id' and 'name')
    .select(`
      *,
      match_players (
        team,
        players ( id, name )
      )
    `)
    .eq('user_id', session.user.id) // Filter by user
    .order('match_date', { ascending: false }); // Newest first

  // Fetch available players (for the Add modal)
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name')
    .eq('user_id', session.user.id)
    .order('name', { ascending: true });

  // --- Handle Errors ---
  if (matchesError) console.error('Error fetching matches:', matchesError);
  if (playersError) console.error('Error fetching players:', playersError);

  // --- Render Client Component ---
  // Pass fetched matches (now including player data) and available players
  return (
    <MatchesClientComponent
      // Cast the fetched matches data to the correct type
      initialMatches={(matches as MatchWithPlayers[]) ?? []}
      availablePlayers={players ?? []}
    />
  );
}
