// app/team-generator/SaveGeneratedMatchModal.tsx
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Youtube, ShieldCheck, Star } from 'lucide-react';
// Assuming shared types are used now
import type { Player } from '@/lib/types'; // Import Player type

// Data needed to save the match
export interface SaveGeneratedMatchData {
    match_date: string;
    score_a: number;
    score_b: number;
    replay_url?: string | null;
}

// Props for this modal
interface SaveGeneratedMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamA: Player[];
  teamB: Player[];
  onSave: (saveData: SaveGeneratedMatchData) => Promise<void>;
}

export default function SaveGeneratedMatchModal({
    isOpen, onClose, teamA, teamB, onSave
}: SaveGeneratedMatchModalProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scoreA, setScoreA] = useState<number | string>('');
  const [scoreB, setScoreB] = useState<number | string>('');
  const [replayUrl, setReplayUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setScoreA('');
      setScoreB('');
      setReplayUrl('');
    }
    setIsSaving(false);
  }, [isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    const numScoreA = Number(scoreA);
    const numScoreB = Number(scoreB);

    if (!date || isNaN(numScoreA) || isNaN(numScoreB) || numScoreA < 0 || numScoreB < 0) {
      alert('Please enter a valid Date and Scores (0 or greater).');
      setIsSaving(false); return;
    }

    try {
      await onSave({
        match_date: date,
        score_a: numScoreA,
        score_b: numScoreB,
        replay_url: replayUrl.trim() || null,
      });
      onClose();
    } catch (error) {
      // --- Fix: Use the error variable ---
      console.error("Failed to save generated match (from modal):", error);
      // Alerting is likely handled by the calling component's catch block now
      // alert(`Failed to save match: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // --- End Fix ---
      // Keep modal open on error - error is thrown back to caller
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const sumA = teamA.reduce((sum, p) => sum + (p.manual_rating || 0), 0);
  const sumB = teamB.reduce((sum, p) => sum + (p.manual_rating || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl p-6 z-50 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Save Generated Match</h2>
          <button onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50" aria-label="Close modal"><X className="w-6 h-6" /></button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2">
          {/* Display Generated Teams */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="border border-blue-200 dark:border-blue-700 rounded p-3 bg-blue-50 dark:bg-gray-700">
                <h4 className="text-md font-semibold mb-2 text-blue-700 dark:text-blue-400 flex items-center justify-between"><span><ShieldCheck className="w-4 h-4 mr-1 inline"/> Team A</span><span className="text-xs font-mono">Σ {sumA}</span></h4>
                <ul className="space-y-1 max-h-32 overflow-y-auto">{teamA.map(player => (<li key={player.id} className="text-sm text-gray-800 dark:text-gray-200 flex justify-between items-center"><span>{player.name}</span><span className="text-xs text-gray-500 dark:text-gray-400 flex items-center"><Star className="w-3 h-3 mr-1 text-yellow-400" /> {player.manual_rating ?? 'N/A'}</span></li>))}</ul>
             </div>
             <div className="border border-red-200 dark:border-red-700 rounded p-3 bg-red-50 dark:bg-gray-700">
                <h4 className="text-md font-semibold mb-2 text-red-700 dark:text-red-400 flex items-center justify-between"><span><ShieldCheck className="w-4 h-4 mr-1 inline"/> Team B</span><span className="text-xs font-mono">Σ {sumB}</span></h4>
                <ul className="space-y-1 max-h-32 overflow-y-auto">{teamB.map(player => (<li key={player.id} className="text-sm text-gray-800 dark:text-gray-200 flex justify-between items-center"><span>{player.name}</span><span className="text-xs text-gray-500 dark:text-gray-400 flex items-center"><Star className="w-3 h-3 mr-1 text-yellow-400" /> {player.manual_rating ?? 'N/A'}</span></li>))}</ul>
             </div>
          </div>
          {/* Inputs for Match Details */}
          <div className="space-y-4">
             <div><label htmlFor="saveMatchDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Match Date</label><div className="relative"><span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"><CalendarIcon className="w-4 h-4" /></span><input type="date" id="saveMatchDate" value={date} onChange={(e) => setDate(e.target.value)} required disabled={isSaving} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" /></div></div>
             <div className="flex items-center space-x-4">
               <div className="flex-1"><label htmlFor="saveScoreA" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team A Score</label><input type="number" id="saveScoreA" value={scoreA} onChange={(e) => setScoreA(e.target.value)} required min="0" disabled={isSaving} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="0" /></div>
               <span className="text-gray-500 dark:text-gray-400 pt-6">–</span>
               <div className="flex-1"><label htmlFor="saveScoreB" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team B Score</label><input type="number" id="saveScoreB" value={scoreB} onChange={(e) => setScoreB(e.target.value)} required min="0" disabled={isSaving} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="0" /></div>
             </div>
             <div><label htmlFor="saveReplayUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">YouTube Replay URL (Optional)</label><div className="relative"><span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"><Youtube className="w-4 h-4" /></span><input type="url" id="saveReplayUrl" value={replayUrl} onChange={(e) => setReplayUrl(e.target.value)} disabled={isSaving} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="https://youtube.com/watch?v=..." /></div></div>
          </div>
          {/* Form Actions */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[110px]">
              {isSaving ? ( <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ) : ( 'Save Match' )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
