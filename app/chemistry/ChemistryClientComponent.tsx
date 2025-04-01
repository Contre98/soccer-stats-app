// app/chemistry/ChemistryClientComponent.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Link as LinkIcon, Loader2, ArrowDownUp, Filter } from 'lucide-react'; // Added Filter icon

// Types
interface Player {
  id: number;
  name: string;
}
interface MatchWithPlayerTeams {
  id: number; score_a: number; score_b: number;
  teamA_player_ids: Set<number>; teamB_player_ids: Set<number>;
}
interface DuoStat {
  player1Id: number; player1Name: string; player2Id: number; player2Name: string;
  gamesTogether: number; winsTogether: number; winRate: number; winRateDisplay: string;
}
interface ChemistryClientProps { availablePlayers: Player[]; }

export default function ChemistryClientComponent({ availablePlayers }: ChemistryClientProps) {
  const [allDuoStats, setAllDuoStats] = useState<DuoStat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<'winRate' | 'gamesTogether'>('winRate');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  // ++ NEW: State for player filter ++
  const [filterPlayerId, setFilterPlayerId] = useState<string>(''); // Empty string means 'All Players'
  const supabase = createClient();

  useEffect(() => {
    // --- calculateAllDuoChemistry function (Logic unchanged) ---
    const calculateAllDuoChemistry = async () => {
        if (availablePlayers.length < 2) { setError("Need at least two players..."); setIsLoading(false); return; }
        setIsLoading(true); setError(null); setAllDuoStats([]);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not logged in");
            const { data: matchPlayerEntries, error: mpError } = await supabase.from('match_players').select(`match_id, player_id, team, matches (id, score_a, score_b)`);
            if (mpError) throw mpError;
            if (!matchPlayerEntries) { setAllDuoStats([]); setIsLoading(false); return; }

            const matchesDataMap = new Map<number, MatchWithPlayerTeams>();
            matchPlayerEntries.forEach(entry => { /* ... (process entries into map) ... */
                if (!entry.matches) return; const matchId = entry.match_id;
                if (!matchesDataMap.has(matchId)) { matchesDataMap.set(matchId, { id: matchId, score_a: entry.matches.score_a, score_b: entry.matches.score_b, teamA_player_ids: new Set<number>(), teamB_player_ids: new Set<number>() }); }
                const matchData = matchesDataMap.get(matchId)!;
                if (entry.team === 'A') { matchData.teamA_player_ids.add(entry.player_id); } else if (entry.team === 'B') { matchData.teamB_player_ids.add(entry.player_id); }
            });
            const allProcessedMatches = Array.from(matchesDataMap.values());

            const playerPairs: { p1: Player; p2: Player }[] = [];
            for (let i = 0; i < availablePlayers.length; i++) { for (let j = i + 1; j < availablePlayers.length; j++) { playerPairs.push({ p1: availablePlayers[i], p2: availablePlayers[j] }); } }

            const calculatedStats: DuoStat[] = [];
            playerPairs.forEach(pair => { /* ... (calculate stats for each pair) ... */
                let gamesTogether = 0; let winsTogether = 0;
                allProcessedMatches.forEach(match => {
                    const p1OnA = match.teamA_player_ids.has(pair.p1.id); const p2OnA = match.teamA_player_ids.has(pair.p2.id);
                    const p1OnB = match.teamB_player_ids.has(pair.p1.id); const p2OnB = match.teamB_player_ids.has(pair.p2.id);
                    if (p1OnA && p2OnA) { gamesTogether++; if (match.score_a > match.score_b) { winsTogether++; } }
                    else if (p1OnB && p2OnB) { gamesTogether++; if (match.score_b > match.score_a) { winsTogether++; } }
                });
                if (gamesTogether > 0) { const winRateNum = (winsTogether / gamesTogether) * 100; calculatedStats.push({ player1Id: pair.p1.id, player1Name: pair.p1.name, player2Id: pair.p2.id, player2Name: pair.p2.name, gamesTogether: gamesTogether, winsTogether: winsTogether, winRate: winRateNum, winRateDisplay: `${winRateNum.toFixed(1)}%` }); }
            });
            setAllDuoStats(calculatedStats); // Set all calculated stats
        } catch (err) {
            console.error("Error calculating chemistry:", err);
            const message = err instanceof Error ? err.message : "Failed to calculate chemistry."; setError(message); setAllDuoStats([]);
        } finally { setIsLoading(false); }
    };
    calculateAllDuoChemistry();
  }, [supabase, availablePlayers]); // Effect runs once on mount

  // --- Filtering Logic (applied before sorting) ---
  const filteredStats = filterPlayerId
      ? allDuoStats.filter(duo =>
          // Check if either player in the duo matches the filter ID
          duo.player1Id.toString() === filterPlayerId ||
          duo.player2Id.toString() === filterPlayerId
      )
      : allDuoStats; // If no filter, use all stats

  // --- Sorting Logic (applied to filtered stats) ---
  const sortedStats = [...filteredStats].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
      if (typeof valA === 'number' && typeof valB === 'number') { return (valA - valB) * directionMultiplier; }
      return 0;
  });

  // Handler for sorting column clicks
  const handleSort = (column: 'winRate' | 'gamesTogether') => {
      if (sortColumn === column) { setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }
      else { setSortColumn(column); setSortDirection('desc'); }
  };

  // --- JSX Rendering ---
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white flex items-center">
         <LinkIcon className="w-7 h-7 mr-3 text-purple-600"/> Player Chemistry (Duos)
      </h1>

      {/* ++ Filter Dropdown ++ */}
      <div className="mb-6 flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <label htmlFor="player-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Player:
          </label>
          <select
             id="player-filter"
             value={filterPlayerId}
             onChange={(e) => setFilterPlayerId(e.target.value)}
             className="block w-full max-w-xs pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
             disabled={isLoading}
           >
             <option value="">-- All Players --</option>
             {availablePlayers.map(player => (
               <option key={`filter-${player.id}`} value={player.id.toString()}>
                 {player.name}
               </option>
             ))}
           </select>
      </div>
      {/* -- End Filter Dropdown -- */}


       {/* Loading State */}
       {isLoading && ( <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /><span className="ml-3 text-gray-500 dark:text-gray-400">Calculating all duo stats...</span></div> )}
       {/* Error State */}
       {error && !isLoading && ( <div className="mb-4 p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700">Error: {error}</div> )}

      {/* Results Table - Renders sortedStats (which are filtered) */}
      {!isLoading && !error && (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">#</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Combination</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('gamesTogether')}><div className="flex items-center justify-center">Games <ArrowDownUp className="w-3 h-3 ml-1 opacity-50"/></div></th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Wins</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('winRate')}><div className="flex items-center justify-center">Win Rate <ArrowDownUp className="w-3 h-3 ml-1 opacity-50"/></div></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Message if no stats calculated or filter yields no results */}
              {!isLoading && sortedStats.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {filterPlayerId ? `No pairs found involving the selected player.` : `No chemistry data found. Play some matches!`}
                </td></tr>
              )}
              {/* Render sorted & filtered stats */}
              {sortedStats.map((duo, index) => (
                  <tr key={`${duo.player1Id}-${duo.player2Id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{index + 1}.</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{duo.player1Name} & {duo.player2Name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">{duo.gamesTogether}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 text-center">{duo.winsTogether}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 text-center font-semibold">{duo.winRateDisplay}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

       {/* -- Removed Scatter Plot Placeholder -- */}

    </div>
  );
}
