// app/page.tsx (Refactored Server Component using Shared Types)
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// --- Import Client Component ---
import DashboardClientComponent from '@/app/dashboard/DashboardClientComponent';
// --- Import Shared Types ---
import type { Player, LeaderboardData, ClientDuoStat, LastMatchData } from '@/lib/types'; // Adjust path if needed

// Type returned by our get_duo_stats RPC function
interface DuoStatRPCResult {
    player1Id: number; player1Name: string; player2Id: number; player2Name: string;
    gamesTogether: number; winsTogether: number; winRate: number | null;
}

// Type for the nested players data in the last match query
interface NestedPlayerData {
    name: string | null;
}
// Type for the match_players data in the last match query
interface MatchPlayerWithNestedPlayer {
    player_id: number;
    team: string;
    players: NestedPlayerData[] | NestedPlayerData | null; // Allow for object or array from Supabase
}
// Type for the last match query result
interface LastMatchQueryResult {
    id: number;
    match_date: string;
    score_a: number;
    score_b: number;
    match_players: MatchPlayerWithNestedPlayer[] | null;
}


export default async function DashboardPage() {
  const supabase = createClient();

  // --- Get Session ---
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Dashboard redirecting, user not found:", userError);
    redirect('/login');
  }
  const userId = user.id;

  // --- Initialize Data Holders ---
  let availablePlayers: Player[] = []; // Use shared Player type
  let leaderboardData: LeaderboardData[] = []; // Use shared LeaderboardData type
  let bestDuoForClient: ClientDuoStat | null = null; // Use shared ClientDuoStat type
  let lastMatchForClient: LastMatchData | null = null; // Use shared LastMatchData type
  let overallError: string | null = null;

  try {
      // --- Fetch All Data Concurrently ---
      const [
          playerRes,
          leaderboardRes,
          duoStatsRes,
          lastMatchRes
      ] = await Promise.all([
          supabase.from('players').select('id, name, manual_rating').eq('user_id', userId).order('name', { ascending: true }),
          supabase.rpc('get_leaderboard_stats', { requesting_user_id: userId }),
          supabase.rpc('get_duo_stats', { requesting_user_id: userId, min_games_together: 5 }),
          supabase.from('matches')
              .select('id, match_date, score_a, score_b, match_players(player_id, team, players(name))')
              .eq('user_id', userId)
              .order('match_date', { ascending: false })
              .limit(1)
              .maybeSingle<LastMatchQueryResult>()
      ]);

      // --- Process Results ---

      // Players
      if (playerRes.error) throw new Error(`Player fetch failed: ${playerRes.error.message}`);
      availablePlayers = (playerRes.data ?? []) as Player[]; // Cast or ensure fetch returns matching type

      // Leaderboard
      if (leaderboardRes.error) throw new Error(`Leaderboard fetch failed: ${leaderboardRes.error.message}`);
      leaderboardData = (leaderboardRes.data ?? []) as LeaderboardData[]; // Cast or ensure RPC returns matching type

      // Duo Stats
      if (duoStatsRes.error) throw new Error(`Duo stats fetch failed: ${duoStatsRes.error.message}`);
      const topDuoFromRPC = (duoStatsRes.data as DuoStatRPCResult[] | null)?.[0];
      if (topDuoFromRPC) {
          bestDuoForClient = {
              player1Name: topDuoFromRPC.player1Name,
              player2Name: topDuoFromRPC.player2Name,
              gamesTogether: topDuoFromRPC.gamesTogether,
              winsTogether: topDuoFromRPC.winsTogether,
              winRateDisplay: topDuoFromRPC.winRate !== null ? `${topDuoFromRPC.winRate.toFixed(1)}%` : 'N/A',
          };
      }

      // Last Match
      if (lastMatchRes.error) throw new Error(`Last match fetch failed: ${lastMatchRes.error.message}`);
      const lastMatchData = lastMatchRes.data;
      if (lastMatchData && lastMatchData.match_players) {
          const getPlayerName = (playerData: NestedPlayerData[] | NestedPlayerData | null): string | null => {
              if (!playerData) return null;
              if (Array.isArray(playerData)) { return playerData[0]?.name ?? null; }
              return playerData.name ?? null;
          };
          const teamAPlayers = lastMatchData.match_players
              .filter(mp => mp.team === 'A')
              .map(mp => getPlayerName(mp.players) || `ID:${mp.player_id}`);
          const teamBPlayers = lastMatchData.match_players
              .filter(mp => mp.team === 'B')
              .map(mp => getPlayerName(mp.players) || `ID:${mp.player_id}`);
          lastMatchForClient = {
              id: lastMatchData.id,
              match_date: lastMatchData.match_date,
              score_a: lastMatchData.score_a,
              score_b: lastMatchData.score_b,
              teamANames: teamAPlayers,
              teamBNames: teamBPlayers,
          };
      }

  } catch (err) {
      console.error("Error fetching or processing dashboard data:", err);
      overallError = err instanceof Error ? err.message : "An unknown error occurred";
      availablePlayers = [];
      leaderboardData = [];
      bestDuoForClient = null;
      lastMatchForClient = null;
  }

  // --- Render Client Component ---
  return (
    <DashboardClientComponent
        availablePlayers={availablePlayers}
        leaderboardData={leaderboardData}
        bestDuo={bestDuoForClient}
        lastMatch={lastMatchForClient}
        // initialError={overallError} // Uncomment if DashboardClientComponent accepts initialError prop
    />
  );
}
