// app/matches/EditMatchModal.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Youtube, Users, AlertCircle } from 'lucide-react';
// --- Import Shared Types ---
import type { PlayerInfo, MatchWithPlayers, MatchUpdateData } from '@/lib/types'; // Import necessary types

// Props interface for the Edit modal
export interface EditMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: PlayerInfo[];
  matchToEdit: MatchWithPlayers | null; // The match data to pre-populate
  onSave: (matchData: MatchUpdateData) => Promise<void>; // Expects MatchUpdateData
}

export default function EditMatchModal({
    isOpen,
    onClose,
    availablePlayers,
    matchToEdit, // Receive the match data
    onSave
}: EditMatchModalProps) {
  // State for form inputs
  const [date, setDate] = useState<string>('');
  const [scoreA, setScoreA] = useState<number | string>('');
  const [scoreB, setScoreB] = useState<number | string>('');
  const [replayUrl, setReplayUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [teamAPlayerIds, setTeamAPlayerIds] = useState<Set<number>>(new Set());
  const [teamBPlayerIds, setTeamBPlayerIds] = useState<Set<number>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);

  // --- Effect to pre-populate form when modal opens or matchToEdit changes ---
  useEffect(() => {
    if (isOpen && matchToEdit) {
      // Pre-populate basic fields
      setDate(matchToEdit.match_date.split('T')[0]); // Format date correctly for input type="date"
      setScoreA(matchToEdit.score_a);
      setScoreB(matchToEdit.score_b);
      setReplayUrl(matchToEdit.replay_url || '');

      // Pre-populate player selections
      const teamAIds = new Set<number>();
      const teamBIds = new Set<number>();
      matchToEdit.match_players.forEach(mp => {
        if (mp.team === 'A') {
          teamAIds.add(mp.player_id);
        } else if (mp.team === 'B') {
          teamBIds.add(mp.player_id);
        }
      });
      setTeamAPlayerIds(teamAIds);
      setTeamBPlayerIds(teamBIds);

      // Reset saving state and errors
      setIsSaving(false);
      setFormError(null);
    } else if (!isOpen) {
        // Optionally reset form when closing (or rely on parent to clear editingMatch)
        // setDate(''); setScoreA(''); ... etc.
    }
  }, [isOpen, matchToEdit]); // Rerun when modal opens or the match data changes

  // Handle checkbox changes (same logic as AddMatchModal)
  const handlePlayerSelect = (playerId: number, team: 'A' | 'B') => {
    setFormError(null);
    const setTeamIds = team === 'A' ? setTeamAPlayerIds : setTeamBPlayerIds;
    const otherTeamIds = team === 'A' ? teamBPlayerIds : teamAPlayerIds;

    setTeamIds(prevIds => {
      const newIds = new Set(prevIds);
      if (newIds.has(playerId)) {
        newIds.delete(playerId);
      } else {
        if (otherTeamIds.has(playerId)) {
           const playerName = availablePlayers.find(p => p.id === playerId)?.name || 'Player';
           setFormError(`${playerName} is already selected for the other team.`);
        } else {
          newIds.add(playerId);
        }
      }
      return newIds;
    });
  };

  // Handle form submission
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    // Ensure matchToEdit exists before proceeding
    if (!matchToEdit) {
        setFormError("No match data available to edit.");
        return;
    }

    const numScoreA = Number(scoreA);
    const numScoreB = Number(scoreB);
    const teamAIdsArray = Array.from(teamAPlayerIds);
    const teamBIdsArray = Array.from(teamBPlayerIds);

    // Validation (same as AddMatchModal)
    if (!date) { setFormError('Please select a date.'); return; }
    if (teamAIdsArray.length === 0 || teamBIdsArray.length === 0) { setFormError('Please select players for both teams.'); return; }
    if (isNaN(numScoreA) || isNaN(numScoreB) || numScoreA < 0 || numScoreB < 0) { setFormError('Please enter valid scores (0 or greater).'); return; }

    setIsSaving(true);
    try {
      // Call the onSave prop with MatchUpdateData (including matchId)
      await onSave({
        matchId: matchToEdit.id, // Include the ID of the match being edited
        match_date: date,
        teamAPlayerIds: teamAIdsArray,
        teamBPlayerIds: teamBIdsArray,
        score_a: numScoreA,
        score_b: numScoreB,
        replay_url: replayUrl.trim() || null,
      });
      // Don't reset form here, let parent handle closing/state clearing on success
      // onClose(); // Parent should call onClose after successful save
    } catch (error) {
      console.error("Failed to update match:", error);
      setFormError(error instanceof Error ? error.message : "Failed to update match. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !matchToEdit) return null; // Don't render if not open or no match data

  // --- EditMatchModal JSX (Based on AddMatchModal) ---
  return (
     <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl p-6 z-50 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            {/* Changed Title */}
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Edit Match</h2>
            <button onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50" aria-label="Close modal">
                <X className="w-6 h-6" />
            </button>
        </div>
        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
          {/* Error display area */}
          {formError && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-600 flex items-center" role="alert">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0"/>
                <span className="font-medium">Error:</span> {formError}
            </div>
          )}
          {/* Grid for inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Left Column: Date, Scores, Replay URL */}
             <div className="space-y-4">
                 {/* Date Input */}
                 <div>
                    <label htmlFor="editMatchDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"><CalendarIcon className="w-4 h-4" /></span>
                        <input type="date" id="editMatchDate" value={date} onChange={(e) => setDate(e.target.value)} required disabled={isSaving} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" />
                    </div>
                 </div>
                 {/* Scores Input */}
                 <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <label htmlFor="editScoreA" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team A Score</label>
                        <input type="number" id="editScoreA" value={scoreA} onChange={(e) => setScoreA(e.target.value)} required min="0" disabled={isSaving} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="0" />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 pt-6">–</span>
                    <div className="flex-1">
                        <label htmlFor="editScoreB" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team B Score</label>
                        <input type="number" id="editScoreB" value={scoreB} onChange={(e) => setScoreB(e.target.value)} required min="0" disabled={isSaving} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="0" />
                    </div>
                 </div>
                 {/* Replay URL Input */}
                 <div>
                    <label htmlFor="editReplayUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">YouTube Replay URL (Optional)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"><Youtube className="w-4 h-4" /></span>
                        <input type="url" id="editReplayUrl" value={replayUrl} onChange={(e) => setReplayUrl(e.target.value)} disabled={isSaving} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="https://www.youtube.com/watch?v=..." />
                    </div>
                 </div>
             </div>
             {/* Right Column: Player Selection */}
             <div className="space-y-4">
                 {/* Team A Selection */}
                 <div>
                    <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-2 flex items-center"><Users className="w-4 h-4 mr-2 text-blue-500"/> Select Team A ({teamAPlayerIds.size})</h3>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-1 bg-gray-50 dark:bg-gray-700">
                        {availablePlayers.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">No players available.</p>}
                        {availablePlayers.map(player => (
                            <label key={`editTeamA-${player.id}`} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                                <input type="checkbox" checked={teamAPlayerIds.has(player.id)} onChange={() => handlePlayerSelect(player.id, 'A')} disabled={isSaving} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-gray-700 dark:text-gray-200">{player.name}</span>
                            </label>
                        ))}
                    </div>
                 </div>
                 {/* Team B Selection */}
                 <div>
                    <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-2 flex items-center"><Users className="w-4 h-4 mr-2 text-red-500"/> Select Team B ({teamBPlayerIds.size})</h3>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-1 bg-gray-50 dark:bg-gray-700">
                        {availablePlayers.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">No players available.</p>}
                        {availablePlayers.map(player => (
                            <label key={`editTeamB-${player.id}`} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                                <input type="checkbox" checked={teamBPlayerIds.has(player.id)} onChange={() => handlePlayerSelect(player.id, 'B')} disabled={isSaving} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                                <span className="text-sm text-gray-700 dark:text-gray-200">{player.name}</span>
                            </label>
                        ))}
                    </div>
                 </div>
             </div>
          </div>
          {/* Modal Footer/Actions */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50">Cancel</button>
            {/* Changed Button Text */}
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[110px]">
                {isSaving ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 ) : (
                    'Update Match' // Changed Text
                 )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
