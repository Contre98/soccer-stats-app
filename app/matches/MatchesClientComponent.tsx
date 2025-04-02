// components/MatchesClientComponent.tsx (adjust path as needed)
'use client'; // Mark this as a Client Component

import React, { useState, useEffect } from 'react';

// --- Import Shared Types ---
import {
  type MatchWithPlayers,
  type PlayerInfo,
  type MatchesPageSearchParams // Make sure to import this!
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
  availablePlayers, // Add availablePlayers to the destructuring
  searchParams
}: MatchesClientComponentProps) {

  // State for matches (initialize with data from server)
  const [matches, setMatches] = useState(initialMatches);
  // You might have other state here, e.g., for modals:
  // const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Use searchParams ---
  const myParam = searchParams?.myParam;
  const myOtherParam = searchParams?.myOtherParam;

  useEffect(() => {
    console.log('Client Component - myParam:', myParam);
    console.log('Client Component - myOtherParam:', myOtherParam);
    // Add logic based on searchParams if needed
  }, [searchParams, myParam, myOtherParam]);

  // --- Component Logic & JSX ---
  // Example function that might use availablePlayers
  const handleOpenAddMatchModal = () => {
    console.log('Opening modal, available players:', availablePlayers);
    // setIsModalOpen(true);
    // Populate modal dropdowns using availablePlayers
  };

  return (
    <div>
      <h1>Matches Client View</h1>
      <p>Data received from server.</p>
      <p>URL Parameter &apos;myParam&apos;: {typeof myParam === 'string' ? myParam : 'Not Provided'}</p>

      {/* Add button to trigger modal (example) */}
      {/* <button onClick={handleOpenAddMatchModal}>Add New Match</button> */}

      {/* Add your UI for displaying matches */}
      <ul>
        {matches.map(match => (
          <li key={match.id}>
            Match Date: {new Date(match.match_date).toLocaleDateString()} - Score: {match.score_a} vs {match.score_b}
            {/* Display players involved */}
            <div>
              {match.match_players.map(mp => (
                <span key={mp.players?.id || `team-${mp.team}`} style={{ marginRight: '10px' }}>
                   Team {mp.team}: {mp.players?.name || 'N/A'}
                </span>
              ))}
            </div>
          </li>
        ))}
        {matches.length === 0 && <li>No matches found.</li>}
      </ul>

      {/* Add your modals, etc. */}
      {/* {isModalOpen && (
        <YourMatchModal
          availablePlayers={availablePlayers}
          onClose={() => setIsModalOpen(false)}
          // other props...
        />
      )} */}
    </div>
  );
}
