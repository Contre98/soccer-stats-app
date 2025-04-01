// app/players/PlayersClientComponent.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Star, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Player type matching Supabase table structure
interface Player {
  id: number;
  name: string;
  manual_rating: number;
  user_id: string;
  created_at: string;
}

// Props including initial players from server
interface PlayersClientComponentProps {
  initialPlayers: Player[];
}

// --- AddPlayerModal Component (No changes needed) ---
interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, manualRating: number) => Promise<void>;
}

function AddPlayerModal({ isOpen, onClose, onSave }: AddPlayerModalProps) {
  const [name, setName] = useState('');
  const [manualRatingInput, setManualRatingInput] = useState<number | string>(80);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsSaving(true);
    const numericRating = Number(manualRatingInput);
    if (name.trim() && !isNaN(numericRating) && numericRating >= 0 && numericRating <= 100) {
      try {
        await onSave(name.trim(), numericRating);
        setName(''); setManualRatingInput(80); onClose();
      } catch (error) {
        console.error("Save failed:", error);
        alert(`Failed to save player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally { setIsSaving(false); }
    } else {
      alert("Please enter a valid name and a manual rating between 0 and 100.");
      setIsSaving(false);
    }
  };
  useEffect(() => { if (!isOpen) { setName(''); setManualRatingInput(80); setIsSaving(false); } }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 z-50">
        <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold text-gray-800 dark:text-white">Add New Player</h2><button onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50" aria-label="Close modal"><X className="w-6 h-6" /></button></div>
        <form onSubmit={handleSubmit}>
           <div className="space-y-4">
            <div><label htmlFor="playerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Player Name</label><input type="text" id="playerName" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSaving} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="Enter player name"/></div>
            <div><label htmlFor="playerManualRating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manual Rating (0-100)</label><input type="number" id="playerManualRating" value={manualRatingInput} onChange={(e) => setManualRatingInput(e.target.value)} required min="0" max="100" disabled={isSaving} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="Enter rating (e.g., 80)"/><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Set the initial rating manually.</p></div>
          </div>
          <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50">Cancel</button><button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[110px]">{isSaving ? ( <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ) : ( 'Save Player' )}</button></div>
        </form>
      </div>
    </div>
  );
}
// --- End AddPlayerModal Component ---


// +++ NEW: EditPlayerModal Component +++
interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerToEdit: Player | null; // Player data to pre-fill the form
  // Handler to save changes, takes ID and updated data
  onSave: (id: number, name: string, manualRating: number) => Promise<void>;
}

function EditPlayerModal({ isOpen, onClose, playerToEdit, onSave }: EditPlayerModalProps) {
  // State for form inputs, initialized from playerToEdit when modal opens
  const [name, setName] = useState('');
  const [manualRatingInput, setManualRatingInput] = useState<number | string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Effect to pre-fill form when playerToEdit changes (modal opens)
  useEffect(() => {
    if (playerToEdit) {
      setName(playerToEdit.name);
      setManualRatingInput(playerToEdit.manual_rating);
    } else {
      // Reset if no player is being edited (e.g., modal closed)
      setName('');
      setManualRatingInput('');
    }
     setIsSaving(false); // Reset saving state when player changes or modal closes
  }, [playerToEdit, isOpen]); // Depend on playerToEdit and isOpen

  // Handle form submission for editing
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!playerToEdit) return; // Should not happen if modal is open correctly

    setIsSaving(true);
    const numericRating = Number(manualRatingInput);
    // Basic validation
    if (name.trim() && !isNaN(numericRating) && numericRating >= 0 && numericRating <= 100) {
      try {
        // Call the onSave handler passed via props with ID and updated data
        await onSave(playerToEdit.id, name.trim(), numericRating);
        onClose(); // Close modal on successful save
      } catch (error) {
        console.error("Update failed:", error);
        alert(`Failed to update player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsSaving(false);
      }
    } else {
      alert("Please enter a valid name and a manual rating between 0 and 100.");
      setIsSaving(false);
    }
  };

  // Don't render if closed or no player data
  if (!isOpen || !playerToEdit) return null;

  // Render the Edit Modal structure (very similar to Add Modal)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 z-50">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Edit Player</h2>
          <button onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50" aria-label="Close modal">
            <X className="w-6 h-6" />
          </button>
        </div>
        {/* Edit Player Form */}
        <form onSubmit={handleSubmit}>
           <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="editPlayerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Player Name</label>
              <input
                type="text" id="editPlayerName" value={name}
                onChange={(e) => setName(e.target.value)}
                required disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
              />
            </div>
            {/* Manual Rating Input */}
            <div>
              <label htmlFor="editPlayerManualRating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manual Rating (0-100)</label>
              <input
                type="number" id="editPlayerManualRating" value={manualRatingInput}
                onChange={(e) => setManualRatingInput(e.target.value)}
                required min="0" max="100" disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
              />
            </div>
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
// --- End EditPlayerModal Component ---


// --- Main Client Component ---
export default function PlayersClientComponent({ initialPlayers }: PlayersClientComponentProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // ++ State for Edit Modal ++
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  // Initialize Supabase client
  const supabase = createClient();

  // --- Modal Controls ---
  const handleAddPlayerClick = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setPlayerToEdit(null); // Clear player data when closing edit modal
  };

  // --- SAVE PLAYER Handler (Unchanged) ---
  const handleSavePlayer = async (name: string, manualRating: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const newPlayerData = { name, manual_rating: manualRating, user_id: user.id };
    const { data, error } = await supabase.from('players').insert(newPlayerData).select().single();
    if (error || !data) { console.error('Error saving player:', error); throw error || new Error("No data returned"); }
    setPlayers(current => [...current, data as Player]); console.log('Player saved:', data);
  };

  // --- EDIT PLAYER Handler (Opens Edit Modal) ---
  const handleEditPlayer = (playerId: number) => {
    const player = players.find(p => p.id === playerId); // Find the player in the current state
    if (player) {
      console.log(`Editing player:`, player);
      setPlayerToEdit(player); // Set the player to edit
      setIsEditModalOpen(true); // Open the edit modal
    } else {
      console.error(`Player with ID ${playerId} not found.`);
      alert("Could not find player data to edit.");
    }
  };

  // +++ UPDATE PLAYER Handler (Saves changes to Supabase) +++
  const handleUpdatePlayer = async (id: number, name: string, manualRating: number) => {
    console.log(`Updating player ${id} to:`, { name, manualRating });

    // Prepare update data
    const updateData = {
      name: name,
      manual_rating: manualRating,
    };

    // Call Supabase update
    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update(updateData)
      .match({ id: id }) // Specify which player to update by ID
      .select() // Select the updated row
      .single(); // Expect a single row back

    // Handle errors
    if (error || !updatedPlayer) {
      console.error('Error updating player:', error);
      alert(`Error updating player: ${error?.message || 'Unknown error'}`);
      throw error || new Error("Updated player data not returned");
    }

    console.log('Player updated successfully:', updatedPlayer);

    // Update local state with the updated player data
    setPlayers(currentPlayers =>
      currentPlayers.map(p => (p.id === id ? (updatedPlayer as Player) : p))
    );
    // Modal will close itself on success via its handleSubmit
  };


  // --- DELETE PLAYER Handler (Unchanged) ---
  const handleDeletePlayer = async (playerId: number) => {
    const originalPlayers = [...players];
    setPlayers(current => current.filter(p => p.id !== playerId));
    if (!confirm('Are you sure you want to permanently delete this player?')) {
       setPlayers(originalPlayers); return;
    }
    const { error } = await supabase.from('players').delete().match({ id: playerId });
    if (error) { console.error('Error deleting player:', error); alert(`Error: ${error.message}`); setPlayers(originalPlayers); }
    else { console.log('Player deleted:', playerId); alert('Player deleted.'); }
  };

  // --- JSX Rendering ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Players</h1>
        <button onClick={handleAddPlayerClick} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">
          <UserPlus className="w-5 h-5 mr-2" /> Add New Player
        </button>
      </div>

      {/* Player Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {/* Head */}
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rating (Manual)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          {/* Body */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {players.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No players found...</td></tr>
            ) : (
              players.map((player) => (
                <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{player.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300"><div className="flex items-center"><Star className="w-4 h-4 text-yellow-400 mr-1" />{player.manual_rating}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {/* Edit button now calls handleEditPlayer */}
                    <button onClick={() => handleEditPlayer(player.id)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600" aria-label={`Edit ${player.name}`}>
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeletePlayer(player.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600" aria-label={`Delete ${player.name}`}>
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Render Add Player Modal */}
      <AddPlayerModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} onSave={handleSavePlayer} />

      {/* Render Edit Player Modal */}
      <EditPlayerModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        playerToEdit={playerToEdit} // Pass the player data to the modal
        onSave={handleUpdatePlayer} // Pass the update handler
      />
    </div>
  );
}
