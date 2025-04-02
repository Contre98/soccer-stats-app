// components/MatchesClientComponent.tsx (adjust path as needed)
'use client'; // Mark this as a Client Component

import React, { useState, useEffect } from 'react';

// --- Import Shared Types ---
import {
  type MatchWithPlayers,
  type PlayerInfo,
  type MatchesPageSearchParams,
  type MatchPlayerInfo // Import if needed for explicit typing below
} from '@/lib/types'; // Adjust path as needed

// --- Define Props Interface ---
// This interface correctly defines the expected props
interface MatchesClientComponentProps {
  initialMatches: MatchWithPlayers[];
  availablePlayers: PlayerInfo[]; // Used for modals, dropdowns etc.
  searchParams: MatchesPageSearchParams;
}

// --- Client Component ---
export default function MatchesClientComponent({
  initialMatches,
  searchParams
}: MatchesClientComponentProps) {

  // State for matches (initialize with data from server)
  // Using const as setMatches wasn't used, change if client-side updates are needed
  const [matches] = useState(initialMatches);

  // --- Use searchParams ---
  const myParam = searchParams?.myParam;
  const myOtherParam = searchParams?.myOtherParam;

  useEffect(() => {
    console.log('Client Component - myParam:', myParam);
    console.log('Client Component - myOtherParam:', myOtherParam);
    // Add logic based on searchParams if needed
  }, [searchParams, myParam, myOtherParam]);

  // --- Component Logic & JSX ---
  // Example function that might use availablePlayers (not implemented here)
  // const handleOpenAddMatchModal = () => {
  //   console.log('Opening modal with players:', availablePlayers);
  // };

  return (
    // Added dark mode classes and basic padding/container
    <div className="container mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Matches</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        URL Parameter &apos;myParam&apos;: {typeof myParam === 'string' ? myParam : 'Not Provided'}
      </p>

      {/* List of Matches */}
      <ul className="space-y-6"> {/* Increased spacing between matches */}
        {matches.map((match: MatchWithPlayers) => {
          // Filter players by team before rendering
          const teamAPlayers = match.match_players.filter(p => p.team === 'A');
          const teamBPlayers = match.match_players.filter(p => p.team === 'B');

          return (
            // Style each match list item
            <li key={match.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
              {/* Match Info Header */}
              <div className="mb-3 border-b border-gray-200 dark:border-gray-600 pb-2 flex justify-between items-center flex-wrap gap-2">
                  <div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Match Date:</span> {new Date(match.match_date).toLocaleDateString()}
                  </div>
                  <div className="font-bold text-lg">
                      <span className="text-blue-600 dark:text-blue-400">{match.score_a}</span>
                      <span className="mx-2 text-gray-500 dark:text-gray-400">vs</span>
                      <span className="text-red-600 dark:text-red-400">{match.score_b}</span>
                  </div>
              </div>

              {/* Player Lists using Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {/* Team A Column */}
                <div>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Team A</h4>
                  {teamAPlayers.length > 0 ? (
                    <ul className="list-disc list-inside pl-2 space-y-1">
                      {teamAPlayers.map((mp: MatchPlayerInfo) => (
                        // Use player_id from match_players as fallback key if players object is null
                        <li key={mp.players?.id ?? `A-${mp.player_id}`}>
                          {/* Display player name, fallback to ID if name is missing */}
                          {mp.players?.name || `ID: ${mp.player_id}` || 'N/A'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                     <p className="text-gray-500 dark:text-gray-400 italic text-xs pl-2">No players listed</p>
                  )}
                </div>

                {/* Team B Column */}
                <div>
                  <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1">Team B</h4>
                  {teamBPlayers.length > 0 ? (
                    <ul className="list-disc list-inside pl-2 space-y-1">
                      {teamBPlayers.map((mp: MatchPlayerInfo) => (
                        // Use player_id from match_players as fallback key if players object is null
                        <li key={mp.players?.id ?? `B-${mp.player_id}`}>
                           {/* Display player name, fallback to ID if name is missing */}
                          {mp.players?.name || `ID: ${mp.player_id}` || 'N/A'}
                        </li>
                      ))}
                    </ul>
                   ) : (
                     <p className="text-gray-500 dark:text-gray-400 italic text-xs pl-2">No players listed</p>
                   )}
                </div>
              </div>
            </li>
          );
        })}
        {/* Message if no matches exist */}
        {matches.length === 0 && (
            <li className="text-center text-gray-500 dark:text-gray-400 py-8">
                No matches found.
            </li>
        )}
      </ul>

      {/* Placeholder for modals, etc. */}
      {/* You would likely add a button here to open the AddMatchModal */}
      {/* Example: <button onClick={() => setIsModalOpen(true)}>Add Match</button> */}
      {/* And render the modal conditionally */}
      {/* <AddMatchModal
           isOpen={isModalOpen}
           onClose={() => setIsModalOpen(false)}
           availablePlayers={availablePlayers}
           onSave={handleSaveMatch} // Define an async handleSaveMatch function
         /> */}
    </div>
  );
}
