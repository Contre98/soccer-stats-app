// app/matches/AddMatchModal.tsx
'use client'; // Modals require client-side interactivity

import { useState, FormEvent, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Youtube, Users } from 'lucide-react';

// Define Player type (or import from shared types file)
interface Player {
  id: number;
  name: string;
}

// Define Match structure subset needed for saving (or import from shared types)
// This helps define the structure of the data passed to onSave
type MatchSaveData = {
    match_date: string;
    score_a: number;
    score_b: number;
    replay_url?: string | null;
    teamAPlayerIds: number[];
    teamBPlayerIds: number[];
}

// Props interface for the modal
export interface AddMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: Player[]; // Receive available players
  onSave: (matchData: MatchSaveData) => Promise<void>; // Use the defined type
}

export default function AddMatchModal({ isOpen, onClose, availablePlayers, onSave }: AddMatchModalProps) {
  // State for form inputs
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scoreA, setScoreA] = useState<number | string>('');
  const [scoreB, setScoreB] = useState<number | string>('');
  const [replayUrl, setReplayUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [teamAPlayerIds, setTeamAPlayerIds] = useState<Set<number>>(new Set());
  const [teamBPlayerIds, setTeamBPlayerIds] = useState<Set<number>>(new Set());

  // Handle checkbox changes for player selection
  const handlePlayerSelect = (playerId: number, team: 'A' | 'B') => {
    const setTeamIds = team === 'A' ? setTeamAPlayerIds : setTeamBPlayerIds;
    const otherTeamIds = team === 'A' ? teamBPlayerIds : teamAPlayerIds;
    setTeamIds(prevIds => {
      const newIds = new Set(prevIds);
      if (newIds.has(playerId)) { newIds.delete(playerId); }
      else {
        if (otherTeamIds.has(playerId)) {
           const playerName = availablePlayers.find(p => p.id === playerId)?.name || 'Player';
           alert(`${playerName} is already selected for the other team.`);
        } else { newIds.add(playerId); }
      }
      return newIds;
    });
  };

  // Handle form submission
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    const numScoreA = Number(scoreA);
    const numScoreB = Number(scoreB);
    const teamAIdsArray = Array.from(teamAPlayerIds);
    const teamBIdsArray = Array.from(teamBPlayerIds);

    // Basic validation
    if (!date || teamAIdsArray.length === 0 || teamBIdsArray.length === 0 || isNaN(numScoreA) || isNaN(numScoreB) || numScoreA < 0 || numScoreB < 0) {
      alert('Please fill in Date, select players for both teams, and enter valid Scores (0 or greater).');
      setIsSaving(false); return;
    }
    try {
      // Call the onSave prop with player IDs
      await onSave({
        match_date: date,
        teamAPlayerIds: teamAIdsArray,
        teamBPlayerIds: teamBIdsArray,
        score_a: numScoreA,
        score_b: numScoreB,
        replay_url: replayUrl.trim() || undefined,
      });
      // Reset form only on successful completion of onSave
      setDate(new Date().toISOString().split('T')[0]);
      setTeamAPlayerIds(new Set()); setTeamBPlayerIds(new Set());
      setScoreA(''); setScoreB(''); setReplayUrl('');
      onClose();
    } catch (error) {
      console.error("Failed to save match:", error);
      // Error alert should be handled by the caller (MatchesClientComponent)
    } finally {
      setIsSaving(false);
    }
  };

   // Reset form state when modal opens/closes
   useEffect(() => {
    if (!isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setTeamAPlayerIds(new Set()); setTeamBPlayerIds(new Set());
      setScoreA(''); setScoreB(''); setReplayUrl('');
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- AddMatchModal JSX (Identical UI structure) ---
  return (
     <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl p-6 z-50 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"><h2 className="text-xl font-semibold text-gray-800 dark:text-white">Add New Match</h2><button onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50" aria-label="Close modal"><X className="w-6 h-6" /></button></div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4"> {/* Left Column */}
                 <div><label htmlFor="matchDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label><div className="relative"><span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"><CalendarIcon className="w-4 h-4" /></span><input type="date" id="matchDate" value={date} onChange={(e) => setDate(e.target.value)} required disabled={isSaving} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" /></div></div>
                 <div className="flex items-center space-x-4"><div className="flex-1"><label htmlFor="scoreA" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team A Score</label><input type="number" id="scoreA" value={scoreA} onChange={(e) => setScoreA(e.target.value)} required min="0" disabled={isSaving} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="0" /></div><span className="text-gray-500 dark:text-gray-400 pt-6">–</span><div className="flex-1"><label htmlFor="scoreB" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team B Score</label><input type="number" id="scoreB" value={scoreB} onChange={(e) => setScoreB(e.target.value)} required min="0" disabled={isSaving} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="0" /></div></div>
                 <div><label htmlFor="replayUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">YouTube Replay URL (Optional)</label><div className="relative"><span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"><Youtube className="w-4 h-4" /></span><input type="url" id="replayUrl" value={replayUrl} onChange={(e) => setReplayUrl(e.target.value)} disabled={isSaving} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="https://youtube.com/watch?v=..." /></div></div>
             </div>
             <div className="space-y-4"> {/* Right Column */}
                 <div><h3 className="text-md font-semibold text-gray-800 dark:text-white mb-2 flex items-center"><Users className="w-4 h-4 mr-2 text-blue-500"/> Select Team A ({teamAPlayerIds.size})</h3><div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-1 bg-gray-50 dark:bg-gray-700">{availablePlayers.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">No players available.</p>}{availablePlayers.map(player => (<label key={`teamA-${player.id}`} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><input type="checkbox" checked={teamAPlayerIds.has(player.id)} onChange={() => handlePlayerSelect(player.id, 'A')} disabled={isSaving} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm text-gray-700 dark:text-gray-200">{player.name}</span></label>))}</div></div>
                 <div><h3 className="text-md font-semibold text-gray-800 dark:text-white mb-2 flex items-center"><Users className="w-4 h-4 mr-2 text-red-500"/> Select Team B ({teamBPlayerIds.size})</h3><div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-1 bg-gray-50 dark:bg-gray-700">{availablePlayers.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">No players available.</p>}{availablePlayers.map(player => (<label key={`teamB-${player.id}`} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><input type="checkbox" checked={teamBPlayerIds.has(player.id)} onChange={() => handlePlayerSelect(player.id, 'B')} disabled={isSaving} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" /><span className="text-sm text-gray-700 dark:text-gray-200">{player.name}</span></label>))}</div></div>
             </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 flex-shrink-0"><button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50">Cancel</button><button type="submit" disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[110px]">{isSaving ? ( <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ) : ( 'Save Match' )}</button></div>
        </form>
      </div>
    </div>
  );
}

