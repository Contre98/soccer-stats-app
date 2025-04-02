// app/page.tsx (Refactored Server Component - Final Fixes)
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// --- Import Client Component ---
import DashboardClientComponent from '@/app/dashboard/DashboardClientComponent';
// --- Import Shared Types ---
import type {
    PlayerInfo,
    LeaderboardData, // Is LeaderboardEntry[]
    ClientDuoStat,
    LastMatchData} from '@/lib/types'; // Adjust path if needed

// Type returned by our get_duo_stats RPC function
// Ensure this matches the actual output of your RPC function
interface DuoStatRPCResult {
    player1Id: number; // Changed from player1_id for consistency, adjust if needed
    player1Name: string;
    player2Id: number; // Changed from player2_id for consistency, adjust if needed
    player2Name: string;
    gamesTogether: number;
    winsTogether: number;
    winRate: number | null; // This is the calculated win rate (e.g., 0-100 or 0-1)
    // Add other fields if returned, e.g., total games played for winRate calculation base?
    // gamesPlayed: number; // Example: if RPC returns total games played needed for ClientDuoStat
}

// Type for the nested players data in the last match query
interface NestedPlayerData {
    name: string | null;
}
// Type for the match_players data in the last match query
interface MatchPlayerWithNestedPlayer {
    player_id: number;
    team: string;
    players: NestedPlayerData[] | NestedPlayerData | null; // Supabase might return object or null
}
// Type for the last match query result from DB
interface LastMatchQueryResult {
    id: number;
    match_date: string;
    score_a: number;
    score_b: number;
    replay_url?: string | null; // Added optional replay_url based on LastMatchData type
    match_players: MatchPlayerWithNestedPlayer[] | null;
}

// --- Helper to check if an error object looks like a PostgrestError ---
interface PostgrestError { message: string; details?: string | null; hint?: string | null; code?: string | null; }
function isPostgrestError(error: unknown): error is PostgrestError {
    return typeof error === 'object' && error !== null && 'message' in error;
}
// --- End Helper ---


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
  let availablePlayers: PlayerInfo[] = [];
  let leaderboardData: LeaderboardData = []; // Type is LeaderboardEntry[]
  let bestDuoForClient: ClientDuoStat | null = null;
  let lastMatchForClient: LastMatchData | null = null;
  let overallError: string | null = null;

  try {
      // --- Fetch All Data Concurrently ---
      const [
          playerRes,
          leaderboardRes, // Should return LeaderboardEntry[] matching LeaderboardData type
          duoStatsRes,    // Should return DuoStatRPCResult[]
          lastMatchRes
      ] = await Promise.all([
          supabase.from('players').select('id, name, manual_rating').eq('user_id', userId).order('name', { ascending: true }),
          supabase.rpc('get_leaderboard_stats', { requesting_user_id: userId }), // Ensure RPC returns data matching LeaderboardEntry structure
          supabase.rpc('get_duo_stats', { requesting_user_id: userId, min_games_together: 5 }),
          supabase.from('matches')
              // Select replay_url if it's part of LastMatchData and needed by client
              .select('id, match_date, score_a, score_b, replay_url, match_players(player_id, team, players(name))')
              .eq('user_id', userId)
              .order('match_date', { ascending: false })
              .limit(1)
              .maybeSingle<LastMatchQueryResult>() // Use the specific query result type
      ]);

      // --- Process Results ---
      if (playerRes.error) throw playerRes.error;
      availablePlayers = (playerRes.data ?? []) as PlayerInfo[]; // OK

      if (leaderboardRes.error) throw leaderboardRes.error;
      // --- Fix 3: Correct Type Assertion ---
      // Assert as LeaderboardData (which is LeaderboardEntry[])
      // Ensure the data structure from the RPC matches LeaderboardEntry
      leaderboardData = (leaderboardRes.data ?? []) as LeaderboardData;

      if (duoStatsRes.error) throw duoStatsRes.error;
      // Get the first result, ensure type matches DuoStatRPCResult
      const topDuoFromRPC = (duoStatsRes.data as DuoStatRPCResult[] | null)?.[0];

      // --- Fix 1: Construct bestDuoForClient with ALL required ClientDuoStat fields ---
      if (topDuoFromRPC) {
          // Construct the object matching ClientDuoStat type from lib/types.ts
          bestDuoForClient = {
              // Required fields from ClientDuoStat:
              player1Id: topDuoFromRPC.player1Id, // Ensure RPC result has this field
              player2Id: topDuoFromRPC.player2Id, // Ensure RPC result has this field
              // gamesPlayed might need calculation or be from RPC if available
              gamesPlayed: topDuoFromRPC.gamesTogether, // Assuming gamesTogether represents total games played for win rate? Adjust if needed.
              winRate: topDuoFromRPC.winRate ?? 0, // Provide default (e.g., 0) if null, ensure type matches (number)

              // Fields you already had (ensure names match ClientDuoStat if different)
              player1Name: topDuoFromRPC.player1Name,
              player2Name: topDuoFromRPC.player2Name,
              gamesTogether: topDuoFromRPC.gamesTogether,
              winsTogether: topDuoFromRPC.winsTogether,
              // winRateDisplay is optional in ClientDuoStat, calculate it here
              winRateDisplay: topDuoFromRPC.winRate !== null ? `${topDuoFromRPC.winRate.toFixed(1)}%` : 'N/A',
          };
      }

      if (lastMatchRes.error) throw lastMatchRes.error;
      const lastMatchDataFromDB = lastMatchRes.data; // Type is LastMatchQueryResult | null

      // --- Fix 2: Construct lastMatchForClient with ALL required LastMatchData fields ---
      if (lastMatchDataFromDB && lastMatchDataFromDB.match_players) {
          const getPlayerName = (playerData: NestedPlayerData[] | NestedPlayerData | null): string | null => {
              if (!playerData) return null;
              // Handle case where Supabase returns a single object instead of array for one-to-one join
              if (!Array.isArray(playerData)) {
                  return playerData.name ?? null;
              }
              // Handle case where it's an array (though likely shouldn't be for 'players(name)')
              return playerData[0]?.name ?? null;
          };

          const teamAPlayerNames = lastMatchDataFromDB.match_players
              .filter(mp => mp.team === 'A')
              .map(mp => getPlayerName(mp.players) || `ID:${mp.player_id}`); // Fallback to ID if name is null

          const teamBPlayerNames = lastMatchDataFromDB.match_players
              .filter(mp => mp.team === 'B')
              .map(mp => getPlayerName(mp.players) || `ID:${mp.player_id}`); // Fallback to ID if name is null

          // Construct the object matching the LastMatchData type from lib/types.ts
          lastMatchForClient = {
              id: lastMatchDataFromDB.id,
              match_date: lastMatchDataFromDB.match_date,
              score_a: lastMatchDataFromDB.score_a,
              score_b: lastMatchDataFromDB.score_b,
              replay_url: lastMatchDataFromDB.replay_url, // Include replay_url
              // Include the fields required by LastMatchData
              teamAPlayers: teamAPlayerNames, // Assuming LastMatchData defines teamAPlayers: string[]
              teamBPlayers: teamBPlayerNames, // Assuming LastMatchData defines teamBPlayers: string[]
              teamANames: teamAPlayerNames,   // Assuming LastMatchData defines teamANames: string[]
              teamBNames: teamBPlayerNames,   // Assuming LastMatchData defines teamBNames: string[]
          };
      }

  } catch (err) {
      console.error("Error fetching or processing dashboard data:", err);
      if (isPostgrestError(err)) {
          overallError = `Database Error: ${err.message}${err.hint ? ` (Hint: ${err.hint})` : ''}`;
      } else if (err instanceof Error) {
          overallError = err.message;
      } else {
          overallError = "An unknown error occurred";
      }
      // Ensure data arrays/objects are empty/null on error
      availablePlayers = [];
      leaderboardData = [];
      bestDuoForClient = null;
      lastMatchForClient = null;
  }

  // --- Render Client Component ---
  // Pass the correctly constructed/typed data
  return (
    <DashboardClientComponent
        availablePlayers={availablePlayers}
        leaderboardData={leaderboardData} // Should now be correctly typed as LeaderboardEntry[]
        bestDuo={bestDuoForClient}
        lastMatch={lastMatchForClient}
        initialError={overallError} // Pass error state
    />
  );
}
