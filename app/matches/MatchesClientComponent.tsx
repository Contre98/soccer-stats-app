// components/MatchesClientComponent.tsx (adjust path as needed)
'use client';

import React, { useState, useEffect, useTransition } from 'react';
// --- Import Icons ---
import { PlusCircle, Loader2, Pencil, Youtube, Trash2 } from 'lucide-react'; // Removed unused CheckSquare, Square

// --- Import Components & Actions ---
import AddMatchModal from '@/app/matches/AddMatchModal'; // Adjust path if needed
import EditMatchModal from '@/app/matches/EditMatchModal'; // Adjust path if needed
import ConfirmationModal from '@/components/ConfirmationModal'; // Import the new ConfirmationModal (adjust path)
// --- Import server actions ---
import { addMatchAction, updateMatchAction, deleteMatchAction, bulkDeleteMatchesAction } from '@/app/matches/actions';
// --- Import Shared Types ---
import {
  type MatchWithPlayers,
  type PlayerInfo,
  type MatchesPageSearchParams,
  type MatchPlayerInfo,
  type MatchSaveData,
  type MatchUpdateData
} from '@/lib/types';

// --- Define Props Interface ---
interface MatchesClientComponentProps {
  initialMatches: MatchWithPlayers[];
  availablePlayers: PlayerInfo[];
  searchParams: MatchesPageSearchParams;
}

// --- Client Component ---
export default function MatchesClientComponent({
  initialMatches,
  availablePlayers,
  searchParams
}: MatchesClientComponentProps) {

  // --- State ---
  const [matches, setMatches] = useState(initialMatches);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchWithPlayers | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // isPending covers add, update, delete actions
  const [isPending, startTransition] = useTransition();
  // --- State for Bulk Delete ---
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<number>>(new Set());
  // --- State for Confirmation Modal ---
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  // Store props for the confirmation modal dynamically
  const [confirmModalProps, setConfirmModalProps] = useState<{
      title: string;
      message: string;
      onConfirm: () => void; // The action to run on confirm
      confirmText?: string;
  }>({ title: '', message: '', onConfirm: () => {}, confirmText: 'Confirm' });

  // --- Use searchParams ---
  const myParam = searchParams?.myParam;
  const myOtherParam = searchParams?.myOtherParam;

  useEffect(() => {
    console.log('Client Component - myParam:', myParam);
    console.log('Client Component - myOtherParam:', myOtherParam);
  }, [searchParams, myParam, myOtherParam]);

  // --- Event Handlers ---
  const handleOpenAddModal = () => { setSaveError(null); setIsAddModalOpen(true); };
  const handleCloseAddModal = () => { setIsAddModalOpen(false); setSaveError(null); };
  const handleOpenEditModal = (matchToEdit: MatchWithPlayers) => { setEditingMatch(matchToEdit); setIsEditModalOpen(true); setSaveError(null); };
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setEditingMatch(null); setSaveError(null); };
  // --- Close handler for Confirmation Modal ---
  const handleCloseConfirmModal = () => { setIsConfirmModalOpen(false); };

  // --- Add/Update Handlers (Full implementation assumed from previous steps) ---
  const handleSaveMatch = async (matchData: MatchSaveData) => {
    setSaveError(null);
    startTransition(async () => {
      try {
        const result = await addMatchAction(matchData);
        if (result.success && result.newMatch) {
          setMatches(prevMatches =>
            [result.newMatch as MatchWithPlayers, ...prevMatches]
            .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
          );
          console.log('Match added successfully and state updated.');
          handleCloseAddModal();
        } else {
          setSaveError(result.error || 'An unknown error occurred saving the match.');
        }
      } catch (error) {
        console.error('Failed to execute addMatchAction:', error);
        setSaveError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      }
    });
   };
  const handleUpdateMatch = async (matchData: MatchUpdateData) => {
    if (!editingMatch) { setSaveError("No match selected for update."); return; };
    setSaveError(null);
    startTransition(async () => {
      try {
         const result = await updateMatchAction(matchData);
         if (result.success && result.updatedMatch) {
            setMatches(prevMatches => prevMatches.map(m => m.id === result.updatedMatch!.id ? (result.updatedMatch as MatchWithPlayers) : m ));
            console.log('Match updated successfully and state updated.');
            handleCloseEditModal();
         } else {
             setSaveError(result.error || 'An unknown error occurred updating the match.');
         }
      } catch (error) {
         console.error('Failed to execute updateMatchAction:', error);
         setSaveError(error instanceof Error ? error.message : 'An unexpected error occurred during update.');
      }
    });
  };

  // --- Functions to execute the actual delete actions ---
  const executeSingleDelete = (matchId: number) => {
    setSaveError(null);
    startTransition(async () => {
      try {
        const result = await deleteMatchAction(matchId);
        if (result.success) {
          setMatches(prevMatches => prevMatches.filter(m => m.id !== matchId));
          console.log(`Match ${matchId} deleted successfully.`);
        } else {
          setSaveError(result.error || 'An unknown error occurred deleting the match.');
        }
      } catch (error) {
        console.error('Failed to execute deleteMatchAction:', error);
        setSaveError(error instanceof Error ? error.message : 'An unexpected error occurred during delete.');
      }
    });
  };

   const executeBulkDelete = (idsToDelete: number[]) => {
     setSaveError(null);
     startTransition(async () => {
        try {
            const result = await bulkDeleteMatchesAction(idsToDelete);
            if (result.success) {
                setMatches(prevMatches => prevMatches.filter(m => !selectedMatchIds.has(m.id)));
                setSelectedMatchIds(new Set()); // Clear selection on success
                console.log(`Bulk delete successful. Deleted count: ${result.deletedCount}`);
            } else {
                setSaveError(result.error || 'An unknown error occurred during bulk delete.');
            }
        } catch(error) {
            console.error('Failed to execute bulkDeleteMatchesAction:', error);
            setSaveError(error instanceof Error ? error.message : 'An unexpected error occurred during bulk delete.');
        }
    });
   };

  // --- Modified Delete Handlers to use Confirmation Modal ---
  const handleDeleteMatch = (matchId: number) => {
    // Set the props needed by the confirmation modal
    setConfirmModalProps({
        title: "Confirm Deletion",
        message: "Are you sure you want to delete this match? This action cannot be undone.",
        onConfirm: () => executeSingleDelete(matchId), // Pass the actual delete function
        confirmText: "Delete"
    });
    setIsConfirmModalOpen(true); // Open the modal
  };

  const handleBulkDelete = () => {
    const idsToDelete = Array.from(selectedMatchIds);
    if (idsToDelete.length === 0) {
        setSaveError("No matches selected for deletion.");
        return;
    }
    // Set the props needed by the confirmation modal
    setConfirmModalProps({
        title: "Confirm Bulk Deletion",
        message: `Are you sure you want to delete ${idsToDelete.length} selected match(es)? This action cannot be undone.`,
        onConfirm: () => executeBulkDelete(idsToDelete), // Pass the actual bulk delete function
        confirmText: `Delete ${idsToDelete.length}`
    });
    setIsConfirmModalOpen(true); // Open the modal
  };
  // --- End Delete Handlers ---

  // Bulk select checkbox handler
  const handleCheckboxChange = (matchId: number, isChecked: boolean) => {
    setSelectedMatchIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (isChecked) { newSelectedIds.add(matchId); } else { newSelectedIds.delete(matchId); }
      return newSelectedIds;
    });
  };


  // --- JSX Rendering ---
  return (
    <div className="container mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
      {/* Header Area */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Matches</h1>
        {/* Action Buttons Area */}
        <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Delete Button */}
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending || selectedMatchIds.size === 0}
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete ({selectedMatchIds.size})
            </button>
            {/* Add Match Button */}
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <PlusCircle className="w-4 h-4 mr-2" />}
              Add Match
            </button>
        </div>
      </div>

      {/* Search Params Display */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        URL Parameter &apos;myParam&apos;: {typeof myParam === 'string' ? myParam : 'Not Provided'}
      </p>

       {/* Display Save/Update/Delete Error if any */}
       {saveError && (
            <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-600" role="alert">
                <span className="font-medium">Error:</span> {saveError}
            </div>
       )}

      {/* List of Matches */}
      <ul className="space-y-6">
        {/* Optional: Add a "Select All" checkbox here if desired */}
        {matches.map((match: MatchWithPlayers) => {
          const teamAPlayers = match.match_players.filter(p => p.team === 'A');
          const teamBPlayers = match.match_players.filter(p => p.team === 'B');
          const matchDateStr = new Date(match.match_date).toLocaleDateString();
          const isSelected = selectedMatchIds.has(match.id);

          return (
            <li key={match.id} className={`relative p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 ${isSelected ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-300 dark:ring-blue-600' : 'border-gray-200 dark:border-gray-700'}`}>
              {/* Checkbox for Bulk Select */}
              <div className="absolute top-3 left-3 z-10">
                  <label htmlFor={`select-${match.id}`} className="sr-only">Select match from {matchDateStr}</label>
                  <input
                      id={`select-${match.id}`}
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:checked:bg-blue-600 checked:border-transparent dark:focus:ring-offset-gray-800"
                      checked={isSelected}
                      onChange={(e) => handleCheckboxChange(match.id, e.target.checked)}
                      disabled={isPending}
                  />
              </div>

              {/* Match Info Header (pl-8) */}
              <div className="mb-3 border-b border-gray-200 dark:border-gray-600 pb-2 flex justify-between items-center flex-wrap gap-2 pl-8">
                  {/* Left side: Date and Replay Link */}
                  <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{matchDateStr}</span>
                      {match.replay_url && ( <a href={match.replay_url} target="_blank" rel="noopener noreferrer" title="Watch Replay" className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 inline-flex items-center"><Youtube className="w-5 h-5" /></a> )}
                  </div>
                  {/* Right side: Score, Edit, Delete Buttons */}
                  <div className="flex items-center gap-2">
                      <div className="font-bold text-lg">
                          <span className="text-blue-600 dark:text-blue-400">{match.score_a}</span>
                          <span className="mx-2 text-gray-500 dark:text-gray-400">vs</span>
                          <span className="text-red-600 dark:text-red-400">{match.score_b}</span>
                      </div>
                      <button onClick={() => handleOpenEditModal(match)} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50" aria-label={`Edit match from ${matchDateStr}`} disabled={isPending}><Pencil className="w-4 h-4" /></button>
                      {/* Delete Button now calls modal opener */}
                      <button onClick={() => handleDeleteMatch(match.id)} className="p-1 text-red-500 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 disabled:opacity-50" aria-label={`Delete match from ${matchDateStr}`} disabled={isPending}><Trash2 className="w-4 h-4" /></button>
                  </div>
              </div>
              {/* Player Lists (pl-8) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm pl-8">
                {/* Team A Column */}
                <div>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Team A</h4>
                  {teamAPlayers.length > 0 ? ( <ul className="list-disc list-inside pl-2 space-y-1"> {teamAPlayers.map((mp: MatchPlayerInfo) => (<li key={mp.players?.id ?? `A-${mp.player_id}`}>{mp.players?.name || `ID: ${mp.player_id}` || 'N/A'}</li>))} </ul> ) : ( <p className="text-gray-500 dark:text-gray-400 italic text-xs pl-2">No players listed</p> )}
                </div>
                {/* Team B Column */}
                <div>
                  <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1">Team B</h4>
                  {teamBPlayers.length > 0 ? ( <ul className="list-disc list-inside pl-2 space-y-1"> {teamBPlayers.map((mp: MatchPlayerInfo) => (<li key={mp.players?.id ?? `B-${mp.player_id}`}>{mp.players?.name || `ID: ${mp.player_id}` || 'N/A'}</li>))} </ul> ) : ( <p className="text-gray-500 dark:text-gray-400 italic text-xs pl-2">No players listed</p> )}
                </div>
              </div>
            </li>
          );
        })}
        {/* No matches message */}
        {matches.length === 0 && (
            <li className="text-center text-gray-500 dark:text-gray-400 py-8">
                No matches found.
            </li>
        )}
      </ul>

      {/* Render Modals Conditionally */}
      <AddMatchModal
           isOpen={isAddModalOpen}
           onClose={handleCloseAddModal}
           availablePlayers={availablePlayers}
           onSave={handleSaveMatch}
         />

      {isEditModalOpen && editingMatch && (
        <EditMatchModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          availablePlayers={availablePlayers}
          matchToEdit={editingMatch}
          onSave={handleUpdateMatch}
        />
      )}

      {/* Render Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        // This onConfirm calls the specific delete function stored in state
        onConfirm={() => {
            if (confirmModalProps.onConfirm) {
                confirmModalProps.onConfirm();
            }
            handleCloseConfirmModal(); // Close modal after action initiated
        }}
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        confirmText={confirmModalProps.confirmText}
        isConfirming={isPending} // Show loading state based on useTransition
      />

    </div>
  );
}
