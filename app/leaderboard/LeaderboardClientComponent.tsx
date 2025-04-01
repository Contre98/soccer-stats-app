// app/leaderboard/LeaderboardClientComponent.tsx
'use client';

import { useState } from 'react';
import { ArrowDownUp, ArrowDown, ArrowUp, Filter } from 'lucide-react';

// Type definition for leaderboard data (ensure consistent with server)
// Ideally imported from a shared types file
export interface LeaderboardData { // Export if needed by server page
  playerId: number;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | string;
  winRateDisplay: string;
  streak: number;
}

// Props for the component
interface LeaderboardClientProps {
  initialLeaderboardData: LeaderboardData[]; // Receive full data from server
}

// Define valid sortable columns type
type SortableColumn = 'playerName' | 'gamesPlayed' | 'wins' | 'winRate' | 'streak';

export default function LeaderboardClientComponent({ initialLeaderboardData }: LeaderboardClientProps) {
  // State for filtering
  const [minGamesPlayed, setMinGamesPlayed] = useState<number>(0);
  // State for sorting
  const [sortColumn, setSortColumn] = useState<SortableColumn>('winRate'); // Default sort
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc'); // Default direction

  // --- Filtering Logic ---
  const filteredData = initialLeaderboardData.filter(
    player => player.gamesPlayed >= minGamesPlayed
  );

  // --- Sorting Logic ---
  const sortedData = [...filteredData].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

      if (sortColumn === 'winRate') {
          const rateA = typeof valA === 'number' ? valA : -1; // Treat 'N/A' as -1 for sorting
          const rateB = typeof valB === 'number' ? valB : -1;
          // Handle potential NaN values if winRate is somehow not a number or 'N/A'
          if (isNaN(rateA) && isNaN(rateB)) return 0;
          if (isNaN(rateA)) return 1 * directionMultiplier; // Put NaN last
          if (isNaN(rateB)) return -1 * directionMultiplier; // Put NaN last
          return (rateA - rateB) * directionMultiplier;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
          // Handle potential NaN values
          if (isNaN(valA) && isNaN(valB)) return 0;
          if (isNaN(valA)) return 1 * directionMultiplier;
          if (isNaN(valB)) return -1 * directionMultiplier;
          return (valA - valB) * directionMultiplier;
      }
      if (sortColumn === 'playerName') {
         return a.playerName.localeCompare(b.playerName) * directionMultiplier;
      }
      return 0; // Fallback
  });

  // --- Event Handlers ---
  const handleSort = (column: SortableColumn) => {
      if (sortColumn === column) {
          // Toggle direction if same column clicked
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          // Set new column and default direction
          setSortColumn(column);
          setSortDirection(column === 'playerName' ? 'asc' : 'desc'); // Default name asc, others desc
      }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(event.target.value, 10);
      setMinGamesPlayed(isNaN(value) || value < 0 ? 0 : value);
  };

  // --- Helper to get Sort Icon ---
  const getSortIcon = (columnId: SortableColumn) => {
      if (sortColumn !== columnId) {
          return <ArrowDownUp className="w-3 h-3 ml-1 opacity-30 group-hover:opacity-70"/>;
      }
      return sortDirection === 'asc'
        ? <ArrowUp className="w-3 h-3 ml-1 text-blue-500"/>
        : <ArrowDown className="w-3 h-3 ml-1 text-blue-500"/>;
  };

  // --- JSX Rendering ---
  return (
    <div>
        {/* Filter Input */}
        <div className="flex justify-end items-center mb-4 gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <label htmlFor="min-games-filter-leaderboard" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Min Games Played:
            </label>
            <input
                type="number"
                id="min-games-filter-leaderboard"
                min="0"
                value={minGamesPlayed}
                onChange={handleFilterChange}
                className="w-20 px-2 py-1 text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
            />
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">#</th>
                {/* Sortable Player Header */}
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button onClick={() => handleSort('playerName')} className="group inline-flex items-center w-full hover:text-gray-700 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" disabled={sortedData.length === 0}>
                        Player {getSortIcon('playerName')}
                    </button>
                </th>
                {/* Sortable Played Header */}
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button onClick={() => handleSort('gamesPlayed')} className="group inline-flex items-center justify-center w-full hover:text-gray-700 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" disabled={sortedData.length === 0}>
                        Played {getSortIcon('gamesPlayed')}
                    </button>
                </th>
                {/* Sortable Wins Header */}
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                     <button onClick={() => handleSort('wins')} className="group inline-flex items-center justify-center w-full hover:text-gray-700 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" disabled={sortedData.length === 0}>
                        Wins {getSortIcon('wins')}
                    </button>
                </th>
                {/* Sortable Win Rate Header */}
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button onClick={() => handleSort('winRate')} className="group inline-flex items-center justify-center w-full hover:text-gray-700 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" disabled={sortedData.length === 0}>
                        Win Rate {getSortIcon('winRate')}
                    </button>
                </th>
                {/* Sortable Streak Header */}
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button onClick={() => handleSort('streak')} className="group inline-flex items-center justify-center w-full hover:text-gray-700 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" disabled={sortedData.length === 0}>
                        Streak {getSortIcon('streak')}
                    </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedData.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No players meet the filter criteria or no data available.</td></tr>
              ) : (
                sortedData.map((playerStat, index) => (
                  <tr key={playerStat.playerId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{playerStat.playerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">{playerStat.gamesPlayed}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 dark:text-green-400 text-center">{playerStat.wins}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 text-center font-semibold">{playerStat.winRateDisplay}</td>
                    {/* Display streak - maybe format later (e.g., W1, L2) */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">{playerStat.streak > 0 ? `W${playerStat.streak}` : playerStat.streak < 0 ? `L${Math.abs(playerStat.streak)}` : playerStat.streak}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* TODO: Add Pagination if needed */}
        </div>
    </div>
  );
}
