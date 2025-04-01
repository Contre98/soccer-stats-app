// app/matches/MatchesClientComponent.tsx
'use client';

import { useState } from 'react';
import { PlusCircle, Youtube, ExternalLink, Trash2, Edit } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AddMatchModal from './AddMatchModal'; // Assumes moved to separate file
import EditMatchModal from './EditMatchModal'; // Assumes moved to separate file
// ++ Import the shared action ++
import { addMatchWithPlayers } from '@/lib/actions/matchActions';

// --- Type Definitions ---
interface PlayerInfo { id: number; name: string; }
interface MatchPlayerInfo { team: string; players: PlayerInfo | null; }
// Type for matches received from the server, including nested player data
interface MatchWithPlayers {
  id: number; match_date: string; score_a: number; score_b: number;
  replay_url?: string | null; user_id: string; created_at: string;
  match_players: MatchPlayerInfo[];
}
interface AvailablePlayer { id: number; name: string; }
interface MatchesClientComponentProps { initialMatches: MatchWithPlayers[]; availablePlayers: AvailablePlayer[]; }
// Type for data coming from AddMatchModal
type AddMatchDataType = { match_date: string; score_a: number; score_b: number; replay_url?: string | null; teamAPlayerIds: number[]; teamBPlayerIds: number[]; }
// Type for data coming from EditMatchModal
type UpdateMatchDataType = Pick<MatchWithPlayers, 'match_date' | 'score_a' | 'score_b' | 'replay_url'>;

// --- Main Client Component ---
export default function MatchesClientComponent({ initialMatches, availablePlayers }: MatchesClientComponentProps) {
  const [matches, setMatches] = useState<MatchWithPlayers[]>(initialMatches);
  const [isAddMatchModalOpen, setIsAddMatchModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [matchToEdit, setMatchToEdit] = useState<MatchWithPlayers | null>(null);
  const supabase = createClient(); // Keep browser client for UI actions

  // --- Modal Controls ---
  const handleAddMatchClick = () => setIsAddMatchModalOpen(true);
  const handleCloseAddModal = () => setIsAddMatchModalOpen(false);
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setMatchToEdit(null); };
  const handleEditMatchClick = (matchId: number) => {
    const match = matches.find(m => m.id === matchId);
    if (match) { setMatchToEdit(match); setIsEditModalOpen(true); }
    else { alert("Could not find match data to edit."); }
  };

  // --- SAVE MATCH Handler (Uses Utility Function) ---
  const handleSaveMatch = async (matchData: AddMatchDataType) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // Prepare data for the utility function
    const matchInsertData = {
      match_date: matchData.match_date,
      score_a: matchData.score_a,
      score_b: matchData.score_b,
      replay_url: matchData.replay_url,
      user_id: user.id,
    };

    try {
      // Call the reusable action, passing the browser client
      const newMatchBase = await addMatchWithPlayers(
        supabase,
        matchInsertData,
        matchData.teamAPlayerIds,
        matchData.teamBPlayerIds
      );

      // --- Update local state: Refetch the newly added match with player data ---
      const { data: newlySavedMatchWithPlayers, error: fetchError } = await supabase
        .from('matches')
        .select(`*, match_players ( team, players ( id, name ) )`)
        .eq('id', newMatchBase.id)
        .single();

      if (fetchError || !newlySavedMatchWithPlayers) {
          console.error("Error fetching newly saved match details:", fetchError);
          setMatches(current => [newMatchBase as MatchWithPlayers, ...current]); // Fallback
          alert("Match saved! Refresh may be needed to see player names.");
      } else {
          setMatches(current => [newlySavedMatchWithPlayers as MatchWithPlayers, ...current]);
          alert("Match saved successfully!");
      }
    } catch (error) {
        console.error("Failed to save match via action:", error);
        alert(`Error saving match: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error; // Re-throw to prevent modal closing on error
    }
  };

  // --- UPDATE MATCH Handler ---
  const handleUpdateMatch = async (id: number, updatedData: UpdateMatchDataType) => {
     const { data: updatedMatch, error } = await supabase
       .from('matches')
       .update(updatedData)
       .match({ id: id })
       .select(`*, match_players ( team, players ( id, name ) )`) // Re-fetch with player data
       .single();
     if (error || !updatedMatch) { console.error('Error updating match:', error); alert(`Error: ${error?.message}`); throw error || new Error("No data returned"); }
     // Update local state with the full updated match data
     setMatches(current => current.map(m => (m.id === id ? (updatedMatch as MatchWithPlayers) : m)));
     alert("Match updated successfully!");
  };

  // --- DELETE MATCH Handler ---
   const handleDeleteMatch = async (matchId: number) => {
      const originalMatches = [...matches];
      setMatches(current => current.filter(m => m.id !== matchId)); // Optimistic UI
      if (!confirm('Are you sure you want to permanently delete this match?')) { setMatches(originalMatches); return; }
      const { error } = await supabase.from('matches').delete().match({ id: matchId }); // DB delete
      if (error) { console.error('Error deleting match:', error); alert(`Error: ${error.message}`); setMatches(originalMatches); } // Revert on error
      else { console.log('Match deleted:', matchId); alert('Match deleted.'); }
   };


  // --- Helper Functions & JSX ---
  const getResultClass = (scoreA: number, scoreB: number): string => { if(scoreA > scoreB) return 'text-green-600 dark:text-green-400 font-semibold'; if(scoreB > scoreA) return 'text-red-600 dark:text-red-400 font-semibold'; return 'text-gray-600 dark:text-gray-400 font-semibold'; };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-800 dark:text-white">Matches</h1><button onClick={handleAddMatchClick} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"><PlusCircle className="w-5 h-5 mr-2" /> Add New Match</button></div>
      {/* Matches Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {/* Head */}
          <thead className="bg-gray-50 dark:bg-gray-700"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Teams / Players</th><th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Score (A - B)</th><th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Replay</th><th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th></tr></thead>
          {/* Body */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {matches.length === 0 ? (<tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No matches found...</td></tr>) : (
              matches.map((match) => {
                 const teamAPlayers = match.match_players?.filter(mp => mp.team === 'A' && mp.players).map(mp => mp.players!.name) || [];
                 const teamBPlayers = match.match_players?.filter(mp => mp.team === 'B' && mp.players).map(mp => mp.players!.name) || [];
                 const teamADisplay = teamAPlayers.length > 0 ? teamAPlayers.join(', ') : 'Team A Players (N/A)';
                 const teamBDisplay = teamBPlayers.length > 0 ? teamBPlayers.join(', ') : 'Team B Players (N/A)';
                 return (
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
          </tbody>
        </table>
      </div>
      {/* Render Modals */}
      {/* Ensure AddMatchModal & EditMatchModal are imported */}
      <AddMatchModal isOpen={isAddMatchModalOpen} onClose={handleCloseAddModal} onSave={handleSaveMatch} availablePlayers={availablePlayers} />
      <EditMatchModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onSave={handleUpdateMatch} matchToEdit={matchToEdit} />
    </div>
  );
}
