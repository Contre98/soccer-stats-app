// app/share/[token]/leaderboard/page.tsx (Server Component)
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ArrowDownUp, Star, Trophy } from 'lucide-react'; // Icons

// --- Type Definitions ---
// (Should match definitions in the main share page/layout)
interface Player { id: number; name: string; }
interface Match { id: number; match_date: string; score_a: number; score_b: number; }
interface MatchPlayer { match_id: number; player_id: number; team: 'A' | 'B'; }
interface LeaderboardData {
  playerId: number; playerName: string; gamesPlayed: number; wins: number;
  losses: number; draws: number; winRate: number | string;
  winRateDisplay: string; streak: number;
}

interface ShareLeaderboardPageProps { params: { token: string }; }

export default async function ShareLeaderboardPage({ params }: ShareLeaderboardPageProps) {
  const shareToken = params.token;
  if (!shareToken) notFound();

  // --- 1. Validate Token & Get User ID ---
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles').select('id').eq('share_token', shareToken).single();

  if (profileError || !profile) { console.error("Share leaderboard: Invalid token", profileError); notFound(); }
  const userId = profile.id;

  // --- 2. Fetch Data for Leaderboard using Admin Client ---
  let leaderboardData: LeaderboardData[] = [];
  let fetchError: string | null = null;

  try {
      // Fetch players, matches, matchPlayers... (same fetch logic as share dashboard)
      const [playerRes, matchRes, matchPlayerRes] = await Promise.all([
          supabaseAdmin.from('players').select('id, name').eq('user_id', userId).order('name', { ascending: true }),
          supabaseAdmin.from('matches').select('id, match_date, score_a, score_b').eq('user_id', userId).order('match_date', { ascending: false }),
          supabaseAdmin.from('match_players').select('match_id, player_id, team').eq('user_id', userId)
      ]);
      if (playerRes.error || matchRes.error || matchPlayerRes.error) throw new Error("Failed to fetch shared data.");
      const availablePlayers = playerRes.data ?? []; const matchesData = matchRes.data ?? []; const matchPlayersData = matchPlayerRes.data ?? [];

      // --- 3. Calculate Stats ---
      if (availablePlayers.length > 0 && matchesData.length > 0) {
          const matchResultsMap = new Map<number, { score_a: number; score_b: number; match_date: string }>();
          matchesData.forEach(m => matchResultsMap.set(m.id, { score_a: m.score_a, score_b: m.score_b, match_date: m.match_date }));
          for (const player of availablePlayers) { /* ... leaderboard calculation ... */
            let gp = 0, w = 0, l = 0, d = 0, streak = 0; const playerParticipation: { match_id: number; team: 'A' | 'B'; match_date: string }[] = [];
            matchPlayersData.forEach(mp => { if (mp.player_id === player.id) { const mi = matchResultsMap.get(mp.match_id); if (mi) playerParticipation.push({ ...mp, match_date: mi.match_date }); } });
            gp = playerParticipation.length; playerParticipation.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()); let streakEnded = false;
            for (const p of playerParticipation) { const mr = matchResultsMap.get(p.match_id); if (mr) { const pt = p.team; const sa = mr.score_a; const sb = mr.score_b; let won = false; if ((pt === 'A' && sa > sb) || (pt === 'B' && sb > sa)) { w++; won = true; } else if ((pt === 'A' && sb > sa) || (pt === 'B' && sa > sb)) { l++; } else { d++; } if (!streakEnded) { if (won) { streak++; } else { streakEnded = true; } } } }
            const decided = w + l; let wr: number | string = 'N/A'; let wrd = 'N/A';
            if (decided > 0) { wr = parseFloat(((w / decided) * 100).toFixed(1)); wrd = `${wr}%`; } else if (gp > 0 && w > 0) { wr = 100.0; wrd = '100.0%'; }
            leaderboardData.push({ playerId: player.id, playerName: player.name, gamesPlayed: gp, wins: w, losses: l, draws: d, winRate: wr, winRateDisplay: wrd, streak });
          }
          // Default sort
          leaderboardData.sort((a, b) => (b.winRate === 'N/A' ? -1 : Number(b.winRate)) - (a.winRate === 'N/A' ? -1 : Number(a.winRate)));
      }
  } catch (err) { console.error("Error fetching/processing shared leaderboard:", err); fetchError = err instanceof Error ? err.message : "Could not load shared leaderboard."; }

  // --- 4. Render Read-Only Leaderboard Table ---
  // Note: Sorting controls are removed as this is a read-only server component view
  return (
    <div>
        {fetchError && (<div className="mb-4 p-4 text-center text-red-600 ...">Error: {fetchError}</div>)}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">#</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Player</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Played</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Wins</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Win Rate</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Streak</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {leaderboardData.length === 0 && !fetchError ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No player data available.</td></tr>
              ) : (
                leaderboardData.map((playerStat, index) => (
                  <tr key={playerStat.playerId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{playerStat.playerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">{playerStat.gamesPlayed}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 dark:text-green-400 text-center">{playerStat.wins}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 text-center font-semibold">{playerStat.winRateDisplay}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">{playerStat.streak > 0 ? `W${playerStat.streak}` : playerStat.streak}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}
