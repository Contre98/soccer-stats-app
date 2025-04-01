// app/share/[token]/page.tsx (Server Component - Share Dashboard View)
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin'; // Import the admin client
import { Link as LinkIcon, Trophy, CalendarDays } from 'lucide-react'; // Icons
import Link from 'next/link'; // For links in widgets

// --- Type Definitions ---
// Should match definitions used for calculations and potentially shared
interface Player { id: number; name: string; }
interface LeaderboardData {
  playerId: number; playerName: string; gamesPlayed: number; wins: number;
  losses: number; draws: number; winRate: number | string;
  winRateDisplay: string; streak: number;
}
interface DuoStat {
  player1Id: number; player1Name: string; player2Id: number; player2Name: string;
  gamesTogether: number; winsTogether: number;
  winRate: number; winRateDisplay: string;
}
interface LastMatchData {
  id: number; match_date: string; score_a: number; score_b: number;
  teamANames: string[]; teamBNames: string[];
}
interface ProcessedMatch {
  id: number; score_a: number; score_b: number; match_date: string;
  teamA_player_ids: Set<number>; teamB_player_ids: Set<number>;
}

// Page props include dynamic segment parameter 'token'
interface SharePageProps { params: { token: string }; }

export default async function ShareDashboardPage({ params }: SharePageProps) {
  const shareToken = params.token;
  if (!shareToken) notFound();

  // --- 1. Validate Token & Get User ID ---
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles').select('id').eq('share_token', shareToken).single();

  if (profileError || !profile) { console.error("Share dashboard: Invalid token", profileError); notFound(); }
  const userId = profile.id;

  // --- 2. Fetch Data for Widgets using Admin Client ---
  const leaderboardData: LeaderboardData[] = [];
  const allDuoStats: DuoStat[] = [];
  let lastMatch: LastMatchData | null = null;
  let fetchError: string | null = null;

  try {
      // Fetch data concurrently
      const [playerRes, matchRes, matchPlayerRes] = await Promise.all([
          supabaseAdmin.from('players').select('id, name').eq('user_id', userId).order('name', { ascending: true }),
          supabaseAdmin.from('matches').select('id, match_date, score_a, score_b').eq('user_id', userId).order('match_date', { ascending: false }),
          supabaseAdmin.from('match_players').select('match_id, player_id, team').eq('user_id', userId) // Assuming RLS bypassed or user_id added to match_players
      ]);
      // Check errors...
      if (playerRes.error || matchRes.error || matchPlayerRes.error) throw new Error("Failed to fetch shared data.");

      const availablePlayers = playerRes.data ?? [];
      const matchesData = matchRes.data ?? [];
      const matchPlayersData = matchPlayerRes.data ?? [];

      // --- 3. Calculate Stats for Widgets ---
      if (availablePlayers.length > 0 && matchesData.length > 0) {
          // Process matches (grouping logic)
          const matchResultsMap = new Map<number, { score_a: number; score_b: number; match_date: string }>();
          matchesData.forEach(m => matchResultsMap.set(m.id, { score_a: m.score_a, score_b: m.score_b, match_date: m.match_date }));
          const matchesWithTeamsMap = new Map<number, ProcessedMatch>();
          matchPlayersData.forEach(mp => { /* ... grouping logic ... */
              const matchId = mp.match_id; const matchResult = matchResultsMap.get(matchId); if (!matchResult) return;
              if (!matchesWithTeamsMap.has(matchId)) { matchesWithTeamsMap.set(matchId, { id: matchId, score_a: matchResult.score_a, score_b: matchResult.score_b, match_date: matchResult.match_date, teamA_player_ids: new Set<number>(), teamB_player_ids: new Set<number>() }); }
              const matchData = matchesWithTeamsMap.get(matchId)!; if (mp.team === 'A') matchData.teamA_player_ids.add(mp.player_id); else if (mp.team === 'B') matchData.teamB_player_ids.add(mp.player_id);
          });
          const allProcessedMatches = Array.from(matchesWithTeamsMap.values());

          // Calculate Leaderboard
          for (const player of availablePlayers) { /* ... leaderboard calculation ... */
            let gp = 0, w = 0, l = 0, d = 0, streak = 0; const playerParticipation: { match_id: number; team: 'A' | 'B'; match_date: string }[] = [];
            matchPlayersData.forEach(mp => { if (mp.player_id === player.id) { const mi = matchResultsMap.get(mp.match_id); if (mi) playerParticipation.push({ ...mp, match_date: mi.match_date }); } });
            gp = playerParticipation.length; playerParticipation.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()); let streakEnded = false;
            for (const p of playerParticipation) { const mr = matchResultsMap.get(p.match_id); if (mr) { const pt = p.team; const sa = mr.score_a; const sb = mr.score_b; let won = false; if ((pt === 'A' && sa > sb) || (pt === 'B' && sb > sa)) { w++; won = true; } else if ((pt === 'A' && sb > sa) || (pt === 'B' && sa > sb)) { l++; } else { d++; } if (!streakEnded) { if (won) { streak++; } else { streakEnded = true; } } } }
            const decided = w + l; let wr: number | string = 'N/A'; let wrd = 'N/A';
            if (decided > 0) { wr = parseFloat(((w / decided) * 100).toFixed(1)); wrd = `${wr}%`; } else if (gp > 0 && w > 0) { wr = 100.0; wrd = '100.0%'; }
            leaderboardData.push({ playerId: player.id, playerName: player.name, gamesPlayed: gp, wins: w, losses: l, draws: d, winRate: wr, winRateDisplay: wrd, streak });
          }
          leaderboardData.sort((a, b) => (b.winRate === 'N/A' ? -1 : Number(b.winRate)) - (a.winRate === 'N/A' ? -1 : Number(a.winRate)));

          // Calculate Duo Chemistry
          const playerPairs: { p1: Player; p2: Player }[] = [];
          for (let i = 0; i < availablePlayers.length; i++) { for (let j = i + 1; j < availablePlayers.length; j++) { playerPairs.push({ p1: availablePlayers[i], p2: availablePlayers[j] }); } }
          playerPairs.forEach(pair => { /* ... duo calculation ... */
              let games = 0; let wins = 0;
              allProcessedMatches.forEach(match => { const p1A = match.teamA_player_ids.has(pair.p1.id); const p2A = match.teamA_player_ids.has(pair.p2.id); const p1B = match.teamB_player_ids.has(pair.p1.id); const p2B = match.teamB_player_ids.has(pair.p2.id); if (p1A && p2A) { games++; if (match.score_a > match.score_b) wins++; } else if (p1B && p2B) { games++; if (match.score_b > match.score_a) wins++; } });
              if (games > 0) { const wrN = (wins / games) * 100; allDuoStats.push({ player1Id: pair.p1.id, player1Name: pair.p1.name, player2Id: pair.p2.id, player2Name: pair.p2.name, gamesTogether: games, winsTogether: wins, winRate: wrN, winRateDisplay: `${wrN.toFixed(1)}%` }); }
          });
          allDuoStats.sort((a, b) => b.winRate - a.winRate);

          // Get Last Match
          if (matchesData.length > 0) { /* ... last match logic ... */
              const lastMatchRaw = matchesData[0]; const lastMatchProcessed = matchesWithTeamsMap.get(lastMatchRaw.id);
              if (lastMatchProcessed) { const teamAPlayers = Array.from(lastMatchProcessed.teamA_player_ids).map(id => availablePlayers.find(p => p.id === id)?.name || `ID:${id}`); const teamBPlayers = Array.from(lastMatchProcessed.teamB_player_ids).map(id => availablePlayers.find(p => p.id === id)?.name || `ID:${id}`); lastMatch = { id: lastMatchRaw.id, match_date: lastMatchRaw.match_date, score_a: lastMatchRaw.score_a, score_b: lastMatchRaw.score_b, teamANames: teamAPlayers, teamBNames: teamBPlayers }; }
          }
      } // End if data exists
  } catch (err) {
      console.error("Error fetching/processing shared dashboard data:", err);
      fetchError = err instanceof Error ? err.message : "Could not load shared stats.";
  }

  // Prepare data for widgets
  const top3Leaderboard = leaderboardData.slice(0, 3);
  const minGamesThreshold = 5;
  const bestDuo = allDuoStats.find(duo => duo.gamesTogether >= minGamesThreshold) || allDuoStats[0] || null;
  const getDuoWinLoss = (stats: DuoStat | null) => { if (!stats || stats.gamesTogether === 0) return 'N/A'; const l = stats.gamesTogether - stats.winsTogether; return `${stats.winsTogether}W - ${l}L`; };

  // --- 4. Render Read-Only Widgets ---
  // This JSX is similar to the client component version, but rendered server-side
  return (
    <div>
        {fetchError && (<div className="mb-4 p-4 text-center text-red-600 ...">Error: {fetchError}</div>)}

        {/* Grid Layout for Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Widget 1: Top 3 Leaderboard Snippet */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center"><Trophy className="w-5 h-5 mr-2 text-yellow-500"/> Top 3 Players</h2>
              {top3Leaderboard.length === 0 ? ( <p className="text-sm text-gray-500 dark:text-gray-400">Not enough player data yet.</p> ) : (
                <ol className="space-y-2"> {top3Leaderboard.map((player, index) => ( <li key={player.playerId} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-1 last:border-b-0"><span className="flex items-center"><span className="font-medium text-gray-600 dark:text-gray-400 w-6 text-right mr-2">{index + 1}.</span><span className="text-gray-900 dark:text-white">{player.playerName}</span></span><span className="flex items-center space-x-2"><span className="font-semibold text-blue-600 dark:text-blue-400 w-14 text-right">{player.winRateDisplay}</span><span className="text-xs text-gray-500 dark:text-gray-400">({player.gamesPlayed} Gms)</span></span></li> ))} </ol>
              )}
               <div className="text-right mt-2"><Link href={`/share/${shareToken}/leaderboard`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View Full Leaderboard</Link></div>
            </div>

            {/* Widget 2: Best Chemistry Duo */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
               <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center"><LinkIcon className="w-5 h-5 mr-2 text-purple-500"/> Top Duo Chemistry</h2>
               {bestDuo ? ( <div className="space-y-1"><p className="text-md font-medium text-gray-900 dark:text-white">{bestDuo.player1Name} & {bestDuo.player2Name}</p><p className="text-sm text-gray-600 dark:text-gray-400">Win Rate: <span className="font-semibold text-blue-600 dark:text-blue-400">{bestDuo.winRateDisplay}</span></p><p className="text-sm text-gray-600 dark:text-gray-400">Record Together: <span className="font-medium text-gray-700 dark:text-gray-300">{getDuoWinLoss(bestDuo)}</span> ({bestDuo.gamesTogether} games)</p><p className="text-xs text-gray-400 dark:text-gray-500">(Min. 5 games)</p></div> ) : ( <p className="text-sm text-gray-500 dark:text-gray-400">Not enough duo data.</p> )}
                {/* Link to shared chemistry page if created later */}
                {/* <div className="text-right mt-2"><Link href={`/share/${shareToken}/chemistry`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View All Duos</Link></div> */}
            </div>

            {/* Widget 3: Last Match */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-green-500"/> Last Match Played</h2>
                {lastMatch ? ( <div className="space-y-2"><p className="text-sm text-gray-600 dark:text-gray-400">Date: {lastMatch.match_date}</p><p className="text-lg font-bold text-center text-gray-800 dark:text-white my-1">{lastMatch.score_a} - {lastMatch.score_b}</p><div className="text-xs text-gray-500 dark:text-gray-400 space-y-1"><p><span className="font-medium text-blue-600 dark:text-blue-400">A:</span> {lastMatch.teamANames.join(', ')}</p><p><span className="font-medium text-red-600 dark:text-red-400">B:</span> {lastMatch.teamBNames.join(', ')}</p></div></div> ) : ( <p className="text-sm text-gray-500 dark:text-gray-400">No matches recorded.</p> )}
                 {/* Link to shared matches page if created later */}
                 {/* <div className="text-right mt-2"><Link href={`/share/${shareToken}/matches`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View All Matches</Link></div> */}
            </div>

        </div>
    </div>
  );
}
