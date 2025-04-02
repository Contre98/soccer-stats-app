// app/matches/MatchesClientComponent.tsx
'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, Youtube, ExternalLink, Trash2, Edit, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AddMatchModal from './AddMatchModal';
import EditMatchModal from './EditMatchModal';
import { addMatchWithPlayers } from '@/lib/actions/matchActions'; // Assuming this action exists and works as before
import Link from 'next/link'; // Import Link for pagination
import { useRouter } from 'next/navigation'; // Import useRouter for refresh/navigation

// --- Type Definitions ---
interface PlayerInfo { id: number; name: string; }
interface MatchPlayerInfo { team: string; players: PlayerInfo | null; }
interface MatchWithPlayers {
  id: number; match_date: string; score_a: number; score_b: number;
  replay_url?: string | null; user_id: string; created_at: string;
  match_players: MatchPlayerInfo[];
}
interface AvailablePlayer { id: number; name: string; }

// Update props to include pagination and error state
interface MatchesClientComponentProps {
  initialMatches: MatchWithPlayers[];
  availablePlayers: AvailablePlayer[];
  currentPage: number;
  totalPages: number;
  error: string | null; // Error message from server component
}

type AddMatchDataType = { match_date: string; score_a: number; score_b: number; replay_url?: string | null; teamAPlayerIds: number[]; teamBPlayerIds: number[]; }
type UpdateMatchDataType = Pick<MatchWithPlayers, 'match_date' | 'score_a' | 'score_b' | 'replay_url'>;

// --- Main Client Component ---
export default function MatchesClientComponent({
  initialMatches,
  availablePlayers,
  currentPage,
  totalPages,
  error
}: MatchesClientComponentProps) {
  // State now holds the matches for the *current page*
  const [matches, setMatches] = useState<MatchWithPlayers[]>(initialMatches);
  const [isAddMatchModalOpen, setIsAddMatchModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [matchToEdit, setMatchToEdit] = useState<MatchWithPlayers | null>(null);
  const supabase = createClient();
  const router = useRouter(); // Initialize router

  // Update local state when initialMatches prop changes (e.g., after pagination navigation)
  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  // --- Modal Controls (remain mostly the same) ---
  const handleAddMatchClick = () => setIsAddMatchModalOpen(true);
  const handleCloseAddModal = () => setIsAddMatchModalOpen(false);
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setMatchToEdit(null); };
  const handleEditMatchClick = (matchId: number) => {
    // Find within the current page's matches
    const match = matches.find(m => m.id === matchId);
    if (match) { setMatchToEdit(match); setIsEditModalOpen(true); }
    else { alert("Could not find match data on the current page to edit."); }
  };

  // --- SAVE MATCH Handler (Adjusted for Pagination) ---
  const handleSaveMatch = async (matchData: AddMatchDataType) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const matchInsertData = {
      match_date: matchData.match_date,
      score_a: matchData.score_a,
      score_b: matchData.score_b,
      replay_url: matchData.replay_url,
      user_id: user.id,
    };

    try {
      // Call the action (assuming it handles DB insert correctly)
      await addMatchWithPlayers(
        supabase, // Pass browser client if action needs it, or handle client creation within action
        matchInsertData,
        matchData.teamAPlayerIds,
        matchData.teamBPlayerIds
      );

      alert("Match saved successfully!");
      // Navigate to page 1 to see the newly added match (assuming newest first sorting)
      router.push('/matches?page=1');
      // No need to manually update local state here, navigation will trigger refetch

    } catch (error) {
      console.error("Failed to save match via action:", error);
      alert(`Error saving match: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error; // Re-throw to prevent modal closing on error
    }
  };

  // --- UPDATE MATCH Handler (Adjusted for Pagination) ---
  const handleUpdateMatch = async (id: number, updatedData: UpdateMatchDataType) => {
     try {
       const { data: updatedMatch, error } = await supabase
         .from('matches')
         .update(updatedData)
         .match({ id: id })
         .select(`*, match_players ( team, players ( id, name ) )`) // Re-fetch with player data
         .single();

       if (error || !updatedMatch) {
           console.error('Error updating match:', error);
           alert(`Error updating match: ${error?.message}`);
           throw error || new Error("No data returned after update.");
       }

       // Update local state ONLY for the current page
       setMatches(current => current.map(m => (m.id === id ? (updatedMatch as MatchWithPlayers) : m)));
       alert("Match updated successfully!");
       // No navigation needed, just update the current page's view

     } catch (error) {
         // Error already handled/alerted inside try block for Supabase error
         // If error happens outside Supabase call, log it
         if (!(error && typeof error === 'object' && 'message' in error)) {
            console.error("Unexpected error during match update:", error);
         }
         throw error; // Prevent modal closing
     }
  };

  // --- DELETE MATCH Handler (Adjusted for Pagination) ---
   const handleDeleteMatch = async (matchId: number) => {
      // Store current matches in case of revert
      const originalMatches = [...matches];
      // Optimistic UI update for the current page
      setMatches(current => current.filter(m => m.id !== matchId));

      if (!confirm('Are you sure you want to permanently delete this match?')) {
          setMatches(originalMatches); // Revert optimistic update
          return;
      }

      // Perform DB delete
      const { error } = await supabase.from('matches').delete().match({ id: matchId });

      if (error) {
          console.error('Error deleting match:', error);
          alert(`Error deleting match: ${error.message}`);
          setMatches(originalMatches); // Revert optimistic update on error
      } else {
          console.log('Match deleted:', matchId);
          alert('Match deleted.');
          // Refresh server component data to ensure consistency
          // (handles cases like deleting the last item on a page)
          router.refresh();
      }
   };


  // --- Helper Functions & JSX ---
  const getResultClass = (scoreA: number, scoreB: number): string => { /* ... same as before ... */ if(scoreA > scoreB) return 'text-green-600 dark:text-green-400 font-semibold'; if(scoreB > scoreA) return 'text-red-600 dark:text-red-400 font-semibold'; return 'text-gray-600 dark:text-gray-400 font-semibold'; };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Matches</h1>
        <button onClick={handleAddMatchClick} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700">
          <PlusCircle className="w-5 h-5 mr-2" /> Add New Match
        </button>
      </div>

      {/* Server-side Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center" role="alert">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="font-semibold">Error:</span>&nbsp;{error}
        </div>
      )}

      {/* Matches Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {/* Head (same as before) */}
          <thead className="bg-gray-50 dark:bg-gray-700"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Teams / Players</th><th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Score (A - B)</th><th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Replay</th><th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th></tr></thead>
          {/* Body (uses local 'matches' state) */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {/* Display only if no server error occurred */}
            {!error && matches.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No matches found...</td></tr>
            ) : !error && (
              matches.map((match) => {
                 const teamAPlayers = match.match_players?.filter(mp => mp.team === 'A' && mp.players).map(mp => mp.players!.name) || [];
                 const teamBPlayers = match.match_players?.filter(mp => mp.team === 'B' && mp.players).map(mp => mp.players!.name) || [];
                 const teamADisplay = teamAPlayers.length > 0 ? teamAPlayers.join(', ') : 'Team A Players (N/A)';
                 const teamBDisplay = teamBPlayers.length > 0 ? teamBPlayers.join(', ') : 'Team B Players (N/A)';
                 return (
                    // Row rendering logic (same as before)
                    <tr key={match.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{match.match_date}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white"><span className="font-medium text-blue-600 dark:text-blue-400">A:</span> {teamADisplay}<br /><span className="font-medium text-red-600 dark:text-red-400">B:</span> {teamBDisplay}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-center text-lg ${getResultClass(match.score_a, match.score_b)}`}>{match.score_a} - {match.score_b}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">{match.replay_url ? ( <a href={match.replay_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline" title="Watch Replay"><Youtube className="w-5 h-5 mr-1" /> Watch <ExternalLink className="w-3 h-3 ml-1 opacity-70" /></a> ) : ( <span className="text-gray-400 dark:text-gray-500 text-xs italic">N/A</span> )}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                         <button onClick={() => handleEditMatchClick(match.id)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600" aria-label={`Edit match on ${match.match_date}`}><Edit className="w-5 h-5" /></button>
                         <button onClick={() => handleDeleteMatch(match.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600" aria-label={`Delete match on ${match.match_date}`}><Trash2 className="w-5 h-5" /></button>
                      </td>
                    </tr>
                 );})
            )}
             {/* Show only error message if server error occurred */}
             {error && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-red-600 dark:text-red-400">Could not load match data. Please try again later.</td></tr>
             )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!error && totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-6">
          {/* Previous Button */}
          <Link
            href={`/matches?page=${currentPage - 1}`}
            passHref
            legacyBehavior // Recommended for compatibility with non-<a> children or complex styling
          >
            <a
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow ${
                currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
              aria-disabled={currentPage <= 1}
              onClick={(e) => { if (currentPage <= 1) e.preventDefault(); }} // Prevent click if disabled
            >
              Previous
            </a>
          </Link>

          {/* Page Indicator */}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>

          {/* Next Button */}
          <Link
            href={`/matches?page=${currentPage + 1}`}
            passHref
            legacyBehavior
          >
            <a
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow ${
                currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
              aria-disabled={currentPage >= totalPages}
              onClick={(e) => { if (currentPage >= totalPages) e.preventDefault(); }} // Prevent click if disabled
            >
              Next
            </a>
          </Link>
        </div>
      )}


      {/* Render Modals (same as before) */}
      <AddMatchModal isOpen={isAddMatchModalOpen} onClose={handleCloseAddModal} onSave={handleSaveMatch} availablePlayers={availablePlayers} />
      <EditMatchModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onSave={handleUpdateMatch} matchToEdit={matchToEdit} />
    </div>
  );
}

