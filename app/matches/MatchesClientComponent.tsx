// components/MatchesClientComponent.tsx (adjust path as needed)
'use client'; // Mark this as a Client Component

import React, { useState, useEffect } from 'react';

// --- Import Shared Types ---
// Import types from your centralized types file
import {
  type MatchWithPlayers,
  type PlayerInfo,
  type MatchesPageSearchParams // Make sure to import this!
} from '@/lib/types'; // Adjust path as needed

// --- Define Props Interface ---
// Add the 'searchParams' property to the interface
interface MatchesClientComponentProps {
  initialMatches: MatchWithPlayers[];
  availablePlayers: PlayerInfo[];
  searchParams: MatchesPageSearchParams; // Add this line
}

// --- Client Component ---
export default function MatchesClientComponent({
  initialMatches,
  availablePlayers,
  searchParams // Destructure the new prop here
}: MatchesClientComponentProps) {

  // State for matches (if you allow client-side modifications)
  const [matches, setMatches] = useState(initialMatches);

  // --- Use searchParams ---
  // Example: Access parameters passed from the URL
  const myParam = searchParams?.myParam;
  const myOtherParam = searchParams?.myOtherParam;

  useEffect(() => {
    // Example: Log params when component mounts or params change
    console.log('Client Component - myParam:', myParam);
    console.log('Client Component - myOtherParam:', myOtherParam);

    // You could potentially filter the 'matches' state based on searchParams here
    // or trigger other actions based on the parameters.

  }, [searchParams, myParam, myOtherParam]); // Add params to dependency array

  // --- Component Logic & JSX ---
  // (Your existing logic for displaying matches, handling modals, etc.)

  return (
    <div>
      <h1>Matches Client View</h1>
      <p>Data received from server.</p>
      <p>URL Parameter 'myParam': {typeof myParam === 'string' ? myParam : 'Not Provided'}</p>

      {/* Add your UI for displaying matches, players, etc. */}
      {/* Example: */}
      {/* <ul>
        {matches.map(match => (
          <li key={match.id}>
            Match Date: {new Date(match.match_date).toLocaleDateString()} - Score: {match.score_a} vs {match.score_b}
             Display players involved
             {match.match_players.map(mp => (
               <span key={mp.players?.id}> Team {mp.team}: {mp.players?.name || 'N/A'} </span>
             ))}
          </li>
        ))}
      </ul> */}

      {/* Add your modals, buttons, etc. */}

    </div>
  );
}
