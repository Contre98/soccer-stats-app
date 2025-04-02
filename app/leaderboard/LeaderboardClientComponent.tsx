// app/leaderboard/LeaderboardClientComponent.tsx
'use client';

import { useState } from 'react';
import { ArrowDownUp, ArrowDown, ArrowUp, Filter } from 'lucide-react';

// Corrected Type definition for leaderboard data - MUST match data from server/RPC call
export interface LeaderboardData {
  playerId: number;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null; // Changed type
  // Removed winRateDisplay and streak
}

// Props for the component
interface LeaderboardClientProps {
  initialLeaderboardData: LeaderboardData[]; // Receive data calculated via RPC
}

// Define valid sortable columns type - Removed 'streak'
type SortableColumn = 'playerName' | 'gamesPlayed' | 'wins' | 'winRate';

export default function LeaderboardClientComponent({ initialLeaderboardData }: LeaderboardClientProps) {
  // State for filtering
  const [minGamesPlayed, setMinGamesPlayed] = useState<number>(0);
  // State for sorting - Default sort by winRate descending
  const [sortColumn, setSortColumn] = useState<SortableColumn>('winRate');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // --- Filtering Logic ---
  // Filter based on the initially received data
  const filteredData = initialLeaderboardData.filter(
    player => player.gamesPlayed >= minGamesPlayed
  );

  // --- CORRECTED Sorting Logic ---
  // Sort the already filtered data
  const sortedData = [...filteredData].sort((a, b) => {
      // No need for valA, valB here, access properties directly inside checks
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

      // Handle sorting for winRate (now number | null)
      if (sortColumn === 'winRate') {
          // Access winRate directly to help TypeScript narrow the type
          const wrA = a.winRate; // Type is number | null
          const wrB = b.winRate; // Type is number | null

          // Treat null as the lowest possible value (-Infinity)
          const rateA = wrA === null ? -Infinity : wrA; // Type is now number
          const rateB = wrB === null ? -Infinity : wrB; // Type is now number

          // Subtraction is now safe as both rateA and rateB are numbers
          return (rateA - rateB) * directionMultiplier;
      }

      // Handle sorting for playerName
      if (sortColumn === 'playerName') {
         // Access playerName directly
         const nameA = a.playerName; // Type is string
         const nameB = b.playerName; // Type is string
         return nameA.localeCompare(nameB) * directionMultiplier;
      }

      // Handle sorting for other numeric columns (gamesPlayed, wins)
      // Access the specific property based on sortColumn
      let numA: number;
      let numB: number;

      if (sortColumn === 'gamesPlayed') {
          numA = a.gamesPlayed; // Type is number
          numB = b.gamesPlayed; // Type is number
      } else if (sortColumn === 'wins') {
          numA = a.wins; // Type is number
          numB = b.wins; // Type is number
      } else {
          // Should not happen with current SortableColumn type, but good for safety
          return 0;
      }

      // Handle potential NaN values just in case
      if (isNaN(numA) && isNaN(numB)) return 0;
      if (isNaN(numA)) return 1 * directionMultiplier; // Put NaN last
      if (isNaN(numB)) return -1 * directionMultiplier; // Put NaN last
      return (numA - numB) * directionMultiplier;

  });


  // --- Event Handlers ---
  const handleSort = (column: SortableColumn) => {
      if (sortColumn === column) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortColumn(column);
          // Default sort directions for new columns
          setSortDirection(column === 'playerName' ? 'asc' : 'desc');
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

  // --- Helper to format Win Rate ---
  const formatWinRate = (winRate: number | null): string => {
      if (winRate === null || isNaN(winRate)) {
          // Handle null or NaN - display N/A or similar
          return 'N/A';
      }
      // Format number to one decimal place and add %
      return `${winRate.toFixed(1)}%`;
  };

  // --- JSX Rendering ---
  return (
    <div>
        {/* Filter Input (same as before) */}
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
                {/* Rank Column */}
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
                {/* REMOVED Streak Header */}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Handle empty state */}
              {sortedData.length === 0 ? (
                // Adjusted colspan from 6 to 5
                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No players meet the filter criteria or no data available.</td></tr>
              ) : (
                // Map over sorted data
                sortedData.map((playerStat, index) => (
                  <tr key={playerStat.playerId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{playerStat.playerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">{playerStat.gamesPlayed}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 dark:text-green-400 text-center">{playerStat.wins}</td>
                    {/* Display formatted winRate */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 text-center font-semibold">
                        {formatWinRate(playerStat.winRate)}
                    </td>
                    {/* REMOVED Streak Data Cell */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* TODO: Add Pagination if the number of players can be large */}
        </div>
    </div>
  );
}
