// app/page.tsx (Server Component - Calculates All Data for Final Client)
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
// Import client component and the types it expects as props
// Ensure the types are exported from the client component file or a shared types file
import DashboardClientComponent, { LeaderboardData, Player as AvailablePlayer, DuoStat as ClientDuoStat, LastMatchData } from '@/app/dashboard/DashboardClientComponent';

// --- Type Definitions ---
// Internal types for calculation
interface PlayerInternal { id: number; name: string; }
interface ProcessedMatch {
  id: number; score_a: number; score_b: number; match_date: string;
  teamA_player_ids: Set<number>; teamB_player_ids: Set<number>;
}
// Internal DuoStat type for calculation
interface CalculationDuoStat {
  player1Id: number; player1Name: string; player2Id: number; player2Name: string;
  gamesTogether: number; winsTogether: number;
  winRate: number; winRateDisplay: string;
}


export default async function DashboardPage() {
  const supabase = createClient();

  // --- Get Session ---
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect('/login');
  const userId = user.id;

  // --- Initialize Data Holders ---
  const leaderboardData: LeaderboardData[] = [];
  const allDuoStats: CalculationDuoStat[] = [];
  let lastMatch: LastMatchData | null = null;
  let availablePlayers: AvailablePlayer[] = []; // Use client's Player type alias
  let fetchError: any = null;

  try {
      // --- Fetch ALL Necessary Data ---
      const [playerRes, matchRes, matchPlayerRes] = await Promise.all([
          supabase.from('players').select('id, name').eq('user_id', userId).order('name', { ascending: true }),
          supabase.from('matches').select('id, match_date, score_a, score_b').eq('user_id', userId).order('match_date', { ascending: false }), // Fetch all, sort desc
          supabase.from('match_players').select('match_id, player_id, team').eq('user_id', userId) // RLS should filter by user implicitly via match_id
      ]);
      if (playerRes.error) throw playerRes.error; if (matchRes.error) throw matchRes.error; if (matchPlayerRes.error) throw matchPlayerRes.error;
      availablePlayers = playerRes.data ?? []; // Assign fetched players
      const matchesData = matchRes.data ?? [];
      const matchPlayersData = matchPlayerRes.data ?? [];

      // --- Process Data & Calculations (only if players/matches exist) ---
      if (availablePlayers.length > 0 && matchesData.length > 0) {
          const matchResultsMap = new Map<number, { score_a: number; score_b: number; match_date: string }>();
          matchesData.forEach(m => matchResultsMap.set(m.id, { score_a: m.score_a, score_b: m.score_b, match_date: m.match_date }));
          const matchesWithTeamsMap = new Map<number, ProcessedMatch>();
          matchPlayersData.forEach(mp => { /* ... (grouping logic) ... */
              const matchId = mp.match_id; const matchResult = matchResultsMap.get(matchId); if (!matchResult) return;
              if (!matchesWithTeamsMap.has(matchId)) { matchesWithTeamsMap.set(matchId, { id: matchId, score_a: matchResult.score_a, score_b: matchResult.score_b, match_date: matchResult.match_date, teamA_player_ids: new Set<number>(), teamB_player_ids: new Set<number>() }); }
              const matchData = matchesWithTeamsMap.get(matchId)!; if (mp.team === 'A') matchData.teamA_player_ids.add(mp.player_id); else if (mp.team === 'B') matchData.teamB_player_ids.add(mp.player_id);
          });
          const allProcessedMatches = Array.from(matchesWithTeamsMap.values());

          // --- Calculate Leaderboard Stats ---
          for (const player of availablePlayers) { /* ... (leaderboard calculation logic) ... */
            let gp = 0, w = 0, l = 0, d = 0, streak = 0; const playerParticipation: { match_id: number; team: 'A' | 'B'; match_date: string }[] = [];
            matchPlayersData.forEach(mp => { if (mp.player_id === player.id) { const mi = matchResultsMap.get(mp.match_id); if (mi) playerParticipation.push({ ...mp, match_date: mi.match_date }); } });
            gp = playerParticipation.length; playerParticipation.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()); let streakEnded = false;
            for (const p of playerParticipation) { const mr = matchResultsMap.get(p.match_id); if (mr) { const pt = p.team; const sa = mr.score_a; const sb = mr.score_b; let won = false; if ((pt === 'A' && sa > sb) || (pt === 'B' && sb > sa)) { w++; won = true; } else if ((pt === 'A' && sb > sa) || (pt === 'B' && sa > sb)) { l++; } else { d++; } if (!streakEnded) { if (won) { streak++; } else { streakEnded = true; } } } }
            const decided = w + l; let wr: number | string = 'N/A'; let wrd = 'N/A';
            if (decided > 0) { wr = parseFloat(((w / decided) * 100).toFixed(1)); wrd = `${wr}%`; } else if (gp > 0 && w > 0) { wr = 100.0; wrd = '100.0%'; }
            leaderboardData.push({ playerId: player.id, playerName: player.name, gamesPlayed: gp, wins: w, losses: l, draws: d, winRate: wr, winRateDisplay: wrd, streak });
          }
          leaderboardData.sort((a, b) => (b.winRate === 'N/A' ? -1 : Number(b.winRate)) - (a.winRate === 'N/A' ? -1 : Number(a.winRate)));

          // --- Calculate All Duo Chemistry Stats ---
          const playerPairsInternal: { p1: PlayerInternal; p2: PlayerInternal }[] = [];
          for (let i = 0; i < availablePlayers.length; i++) { for (let j = i + 1; j < availablePlayers.length; j++) { playerPairsInternal.push({ p1: availablePlayers[i], p2: availablePlayers[j] }); } }
          playerPairsInternal.forEach(pair => { /* ... (duo calculation logic) ... */
              let games = 0; let wins = 0;
              allProcessedMatches.forEach(match => { const p1A = match.teamA_player_ids.has(pair.p1.id); const p2A = match.teamA_player_ids.has(pair.p2.id); const p1B = match.teamB_player_ids.has(pair.p1.id); const p2B = match.teamB_player_ids.has(pair.p2.id); if (p1A && p2A) { games++; if (match.score_a > match.score_b) wins++; } else if (p1B && p2B) { games++; if (match.score_b > match.score_a) wins++; } });
              if (games > 0) { const wrN = (wins / games) * 100; allDuoStats.push({ player1Id: pair.p1.id, player1Name: pair.p1.name, player2Id: pair.p2.id, player2Name: pair.p2.name, gamesTogether: games, winsTogether: wins, winRate: wrN, winRateDisplay: `${wrN.toFixed(1)}%` }); }
          });
          allDuoStats.sort((a, b) => b.winRate - a.winRate);

          // --- Get Last Match Details ---
          if (matchesData.length > 0) { /* ... (logic unchanged) ... */
              const lastMatchRaw = matchesData[0]; const lastMatchProcessed = matchesWithTeamsMap.get(lastMatchRaw.id);
              if (lastMatchProcessed) { const teamAPlayers = Array.from(lastMatchProcessed.teamA_player_ids).map(id => availablePlayers.find(p => p.id === id)?.name || `ID:${id}`); const teamBPlayers = Array.from(lastMatchProcessed.teamB_player_ids).map(id => availablePlayers.find(p => p.id === id)?.name || `ID:${id}`); lastMatch = { id: lastMatchRaw.id, match_date: lastMatchRaw.match_date, score_a: lastMatchRaw.score_a, score_b: lastMatchRaw.score_b, teamANames: teamAPlayers, teamBNames: teamBPlayers }; }
          }
      } // End if availablePlayers.length > 0

  } catch (err) { console.error("Error fetching or processing dashboard data:", err); fetchError = err; /* Data arrays remain empty */ }

  // --- Prepare Props for Client ---
  const minGamesThreshold = 5; // For Best Duo
  const bestDuoCalculation = allDuoStats.find(duo => duo.gamesTogether >= minGamesThreshold) || allDuoStats[0] || null;
  // Prepare bestDuo object matching ClientDuoStat type
  const bestDuo: ClientDuoStat | null = bestDuoCalculation ? {
      player1Name: bestDuoCalculation.player1Name, player2Name: bestDuoCalculation.player2Name,
      gamesTogether: bestDuoCalculation.gamesTogether, winsTogether: bestDuoCalculation.winsTogether,
      winRateDisplay: bestDuoCalculation.winRateDisplay,
  } : null;


  // --- Render Client Component ---
  // Pass ALL data needed by the client
  return (
    <DashboardClientComponent
        availablePlayers={availablePlayers}
        leaderboardData={leaderboardData}
        bestDuo={bestDuo}
        lastMatch={lastMatch}
        // initialError={fetchError ? fetchError.message : null} // Optional error passing
    />
  );
}
