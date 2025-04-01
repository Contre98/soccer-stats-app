// app/matches/EditMatchModal.tsx
'use client'; // Required for state and effects

import React, { useState, useEffect, FormEvent } from 'react';
import { X, Calendar as CalendarIcon, Youtube } from 'lucide-react';

// Define Match structure subset needed (or import from shared types)
// Should match the 'matchToEdit' prop type and 'onSave' data type
interface Match {
  id: number;
  match_date: string;
  score_a: number;
  score_b: number;
  replay_url?: string | null;
  // Include other fields if needed by the component logic, but these are primary
}

// Define the structure of data expected by the onSave function
type UpdateMatchDataType = Pick<Match, 'match_date' | 'score_a' | 'score_b' | 'replay_url'>;

// Props interface for this modal
export interface EditMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchToEdit: Match | null; // Match data to pre-fill
  onSave: (id: number, updatedData: UpdateMatchDataType) => Promise<void>;
}

// Export the component function as default
export default function EditMatchModal({ isOpen, onClose, matchToEdit, onSave }: EditMatchModalProps) {
  // State for editable fields
  const [date, setDate] = useState<string>('');
  const [scoreA, setScoreA] = useState<number | string>('');
  const [scoreB, setScoreB] = useState<number | string>('');
  const [replayUrl, setReplayUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Effect to pre-fill form when modal opens or matchToEdit changes
  useEffect(() => {
    if (matchToEdit && isOpen) { // Ensure matchToEdit is not null and modal is open
      setDate(matchToEdit.match_date || '');
      setScoreA(matchToEdit.score_a ?? ''); // Use ?? for 0 score
      setScoreB(matchToEdit.score_b ?? ''); // Use ?? for 0 score
      setReplayUrl(matchToEdit.replay_url || '');
    } else if (!isOpen) {
      // Reset form if modal is closed
      setDate(''); setScoreA(''); setScoreB(''); setReplayUrl('');
    }
    setIsSaving(false); // Reset saving state
  }, [matchToEdit, isOpen]); // Depend on playerToEdit and isOpen

  // Handle form submission for editing
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matchToEdit) return; // Should not happen if modal is open correctly

    setIsSaving(true);
    const numScoreA = Number(scoreA);
    const numScoreB = Number(scoreB);

    // Basic validation
    if (!date || isNaN(numScoreA) || isNaN(numScoreB) || numScoreA < 0 || numScoreB < 0) {
      alert('Please enter a valid Date and Scores (0 or greater).');
      setIsSaving(false); return;
    }

    try {
      // Call the onSave handler with ID and updated data object
      await onSave(matchToEdit.id, {
        match_date: date,
        score_a: numScoreA,
        score_b: numScoreB,
        replay_url: replayUrl.trim() || null, // Save null if empty
      });
      onClose(); // Close modal on successful save
    } catch (error) {
      console.error("Update failed:", error);
      // Alert is handled by the caller (MatchesClientComponent)
      // alert(`Failed to update match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render if closed or no match data
  if (!isOpen || !matchToEdit) return null;

  // Render the Edit Modal structure
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 z-50">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Edit Match Details</h2>
          <button onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50" aria-label="Close modal"><X className="w-6 h-6" /></button>
        </div>
        {/* Edit Match Form */}
        <form onSubmit={handleSubmit}>
           <div className="space-y-4">
             {/* Date Input */}
             <div>
               <label htmlFor="editMatchDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
               <div className="relative"><span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"><CalendarIcon className="w-4 h-4" /></span><input type="date" id="editMatchDate" value={date} onChange={(e) => setDate(e.target.value)} required disabled={isSaving} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" /></div>
             </div>
             {/* Score Inputs */}
             <div className="flex items-center space-x-4">
               <div className="flex-1"><label htmlFor="editScoreA" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team A Score</label><input type="number" id="editScoreA" value={scoreA} onChange={(e) => setScoreA(e.target.value)} required min="0" disabled={isSaving} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" /></div>
               <span className="text-gray-500 dark:text-gray-400 pt-6">–</span>
               <div className="flex-1"><label htmlFor="editScoreB" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team B Score</label><input type="number" id="editScoreB" value={scoreB} onChange={(e) => setScoreB(e.target.value)} required min="0" disabled={isSaving} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" /></div>
             </div>
             {/* Replay URL Input */}
             <div>
               <label htmlFor="editReplayUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">YouTube Replay URL (Optional)</label>
               <div className="relative"><span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"><Youtube className="w-4 h-4" /></span><input type="url" id="editReplayUrl" value={replayUrl} onChange={(e) => setReplayUrl(e.target.value)} disabled={isSaving} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="https://youtube.com/watch?v=..." /></div>
             </div>
             {/* Note about not editing players here */}
             <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">Note: Editing players involved in the match is not supported here.</p>
          </div>
          {/* Form Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[130px]">
              {isSaving ? ( <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ) : ( 'Save Changes' )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
