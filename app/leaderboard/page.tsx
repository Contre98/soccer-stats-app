// app/leaderboard/page.tsx (Server Component - Passes Data to Client)
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// Import the new client component and its types
import LeaderboardClientComponent from './LeaderboardClientComponent';
import type { LeaderboardData } from './LeaderboardClientComponent'; // Import type


export default async function LeaderboardPage() {
  const supabase = createClient();

  // --- Get Session ---
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect('/login');
  const userId = user.id;

  // --- Fetch ALL Necessary Data ---
  let leaderboardData: LeaderboardData[] = [];
  let fetchError: unknown = null;

  try {
      // Fetch players, matches, matchPlayers... (same fetch logic as before)
      const { data: players, error: playersError } = await supabase.from('players').select('id, name').eq('user_id', userId).order('name', { ascending: true });
      if (playersError) throw playersError; const playersData = players ?? [];
      const { data: matches, error: matchesError } = await supabase.from('matches').select('id, match_date, score_a, score_b').eq('user_id', userId).order('match_date', { ascending: false });
      if (matchesError) throw matchesError; const matchesData = matches ?? [];
      const { data: matchPlayers, error: mpError } = await supabase.from('match_players').select('match_id, player_id, team').eq('user_id', userId);
      if (mpError) throw mpError; const matchPlayersData = matchPlayers ?? [];

      // --- Process Data and Calculate Stats for Each Player ---
      // (Calculation logic remains the same - produces full leaderboardData)
      const matchResultsMap = new Map<number, { score_a: number; score_b: number; match_date: string }>();
      matchesData.forEach(m => matchResultsMap.set(m.id, { score_a: m.score_a, score_b: m.score_b, match_date: m.match_date }));
      for (const player of playersData) {
        let gp = 0, w = 0, l = 0, d = 0, streak = 0; const playerParticipation: { match_id: number; team: 'A' | 'B'; match_date: string }[] = [];
        matchPlayersData.forEach(mp => { if (mp.player_id === player.id) { const mi = matchResultsMap.get(mp.match_id); if (mi) playerParticipation.push({ ...mp, match_date: mi.match_date }); } });
        gp = playerParticipation.length; playerParticipation.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()); let streakEnded = false;
        for (const p of playerParticipation) { const mr = matchResultsMap.get(p.match_id); if (mr) { const pt = p.team; const sa = mr.score_a; const sb = mr.score_b; let won = false; if ((pt === 'A' && sa > sb) || (pt === 'B' && sb > sa)) { w++; won = true; } else if ((pt === 'A' && sb > sa) || (pt === 'B' && sa > sb)) { l++; } else { d++; } if (!streakEnded) { if (won) { streak++; } else { streakEnded = true; } } } }
        const decided = w + l; let wr: number | string = 'N/A'; let wrd = 'N/A';
        if (decided > 0) { wr = parseFloat(((w / decided) * 100).toFixed(1)); wrd = `${wr}%`; } else if (gp > 0 && w > 0) { wr = 100.0; wrd = '100.0%'; }
        leaderboardData.push({ playerId: player.id, playerName: player.name, gamesPlayed: gp, wins: w, losses: l, draws: d, winRate: wr, winRateDisplay: wrd, streak });
      }

      // --- REMOVED Server-Side Sorting based on searchParams ---
      // Let the client handle sorting for interactivity

  } catch (err) {
      console.error("Error fetching or processing leaderboard data:", err);
      fetchError = err; leaderboardData = [];
  }

  // --- Render Client Component ---
  // Pass the full, unsorted (or default-sorted by calculation if needed) leaderboard data
  return (
    <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Leaderboard</h1>
        {/* Display Error if fetch failed */}
        {fetchError && ( <div className="mb-4 p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700"> Error loading leaderboard data: {fetchError.message} </div> )}
        {/* Render client component, passing the raw data */}
        <LeaderboardClientComponent initialLeaderboardData={leaderboardData} />
    </div>
  );
}
