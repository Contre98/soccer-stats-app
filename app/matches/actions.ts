// app/matches/actions.ts
'use server'; // Mark this file as containing Server Actions

import { createClient } from '@/lib/supabase/server'; // Use server client
import { type MatchSaveData, type MatchUpdateData, type MatchWithPlayers } from '@/lib/types'; // Import necessary types
import { revalidatePath } from 'next/cache'; // To trigger cache invalidation

// --- Action Result Types ---
interface AddActionResult {
  success: boolean;
  error?: string | null;
  newMatch?: MatchWithPlayers | null;
}
interface UpdateActionResult {
  success: boolean;
  error?: string | null;
  updatedMatch?: MatchWithPlayers | null;
}
interface DeleteActionResult {
    success: boolean;
    error?: string | null;
}
// --- Added Bulk Delete Result Type ---
interface BulkDeleteActionResult {
    success: boolean;
    error?: string | null;
    deletedCount?: number; // Optional: report how many were attempted/deleted
}

/**
 * Server Action to add a new match and its players.
 */
export async function addMatchAction(matchData: MatchSaveData): Promise<AddActionResult> {
  console.log("TUVIEJA")
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) { return { success: false, error: 'Authentication required.' }; }
  if (!matchData || matchData.teamAPlayerIds.length === 0 || matchData.teamBPlayerIds.length === 0) { return { success: false, error: 'Invalid match data provided.' }; }
  if (isNaN(matchData.score_a) || isNaN(matchData.score_b) || matchData.score_a < 0 || matchData.score_b < 0) { return { success: false, error: 'Invalid scores provided.' }; }

  try {
    const { data: newMatchData, error: matchInsertError } = await supabase.from('matches').insert({ user_id: user.id, match_date: matchData.match_date, score_a: matchData.score_a, score_b: matchData.score_b, replay_url: matchData.replay_url, }).select('id').single();
    if (matchInsertError) throw matchInsertError;
    if (!newMatchData?.id) throw new Error('Failed to retrieve new match ID.');
    const newMatchId = newMatchData.id;
    const playersToInsert = [ ...matchData.teamAPlayerIds.map(playerId => ({ match_id: newMatchId, player_id: playerId, team: 'A', user_id: user.id })), ...matchData.teamBPlayerIds.map(playerId => ({ match_id: newMatchId, player_id: playerId, team: 'B', user_id: user.id })), ];
    const { error: playersInsertError } = await supabase.from('match_players').insert(playersToInsert);
    if (playersInsertError) throw playersInsertError; // Ideally rollback match insert here
    const { data: completeNewMatch, error: fetchError } = await supabase.from('matches').select(`*, match_players (player_id, team, players (id, name, manual_rating))`).eq('id', newMatchId).single();
    if (fetchError) { console.error("Failed to fetch newly created match, but insert likely succeeded.", fetchError); }
    revalidatePath('/matches'); revalidatePath('/dashboard');
    return { success: true, newMatch: completeNewMatch as MatchWithPlayers | null };
  } catch (error) {
    console.error('Error saving match (Server Action - Add):', error);
    if (typeof error === 'object' && error !== null && 'message' in error) { return { success: false, error: (error as { message: string }).message }; }
    return { success: false, error: 'An unexpected error occurred while saving the match.' };
  }
}


/**
 * Server Action to update an existing match and its players.
 */
export async function updateMatchAction(matchData: MatchUpdateData): Promise<UpdateActionResult> {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { return { success: false, error: 'Authentication required.' }; }
    if (!matchData || !matchData.matchId || matchData.teamAPlayerIds.length === 0 || matchData.teamBPlayerIds.length === 0) { return { success: false, error: 'Invalid match update data provided.' }; }
    if (isNaN(matchData.score_a) || isNaN(matchData.score_b) || matchData.score_a < 0 || matchData.score_b < 0) { return { success: false, error: 'Invalid scores provided.' }; }
    const matchIdToUpdate = matchData.matchId;
    try {
        // Ideally wrap in transaction
        const { error: matchUpdateError } = await supabase.from('matches').update({ match_date: matchData.match_date, score_a: matchData.score_a, score_b: matchData.score_b, replay_url: matchData.replay_url, }).eq('id', matchIdToUpdate).eq('user_id', user.id);
        if (matchUpdateError) throw matchUpdateError;
        const { error: deletePlayersError } = await supabase.from('match_players').delete().eq('match_id', matchIdToUpdate);
        if (deletePlayersError) throw deletePlayersError;
        const playersToInsert = [ ...matchData.teamAPlayerIds.map(playerId => ({ match_id: matchIdToUpdate, player_id: playerId, team: 'A', user_id: user.id })), ...matchData.teamBPlayerIds.map(playerId => ({ match_id: matchIdToUpdate, player_id: playerId, team: 'B', user_id: user.id })), ];
        const { error: insertPlayersError } = await supabase.from('match_players').insert(playersToInsert);
        if (insertPlayersError) throw insertPlayersError; // Ideally rollback
        const { data: completeUpdatedMatch, error: fetchError } = await supabase.from('matches').select(`*, match_players (player_id, team, players (id, name, manual_rating))`).eq('id', matchIdToUpdate).single();
        if (fetchError) { console.error("Failed to fetch updated match, but update likely succeeded.", fetchError); }
        revalidatePath('/matches'); revalidatePath('/dashboard');
        return { success: true, updatedMatch: completeUpdatedMatch as MatchWithPlayers | null };
    } catch (error) {
        console.error('Error updating match (Server Action - Update):', error);
        if (typeof error === 'object' && error !== null && 'message' in error) { return { success: false, error: (error as { message: string }).message }; }
        return { success: false, error: 'An unexpected error occurred while updating the match.' };
    }
}

/**
 * Server Action to delete a single match and its associated players.
 */
export async function deleteMatchAction(matchId: number): Promise<DeleteActionResult> {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { return { success: false, error: 'Authentication required.' }; }
    if (!matchId || typeof matchId !== 'number') { return { success: false, error: 'Invalid Match ID provided.' }; }
    try {
        // Ideally wrap in transaction
        const { error: deletePlayersError } = await supabase.from('match_players').delete().eq('match_id', matchId);
        if (deletePlayersError) throw deletePlayersError;
        const { error: deleteMatchError } = await supabase.from('matches').delete().eq('id', matchId).eq('user_id', user.id);
        if (deleteMatchError) throw deleteMatchError;
        revalidatePath('/matches'); revalidatePath('/dashboard');
        console.log(`Match ${matchId} deleted successfully.`);
        return { success: true };
    } catch (error) {
        console.error(`Error deleting match ${matchId} (Server Action - Delete):`, error);
        if (typeof error === 'object' && error !== null && 'message' in error) { return { success: false, error: (error as { message: string }).message }; }
        return { success: false, error: 'An unexpected error occurred while deleting the match.' };
    }
}

/**
 * Server Action to delete multiple matches and their associated players.
 * @param matchIds An array of match IDs to delete.
 * @returns Promise<BulkDeleteActionResult> Object indicating success or failure.
 */
export async function bulkDeleteMatchesAction(matchIds: number[]): Promise<BulkDeleteActionResult> {
    const supabase = createClient();

    // 1. Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error('Server Action (Bulk Delete): User not authenticated.', userError);
        return { success: false, error: 'Authentication required.' };
    }

    // 2. Validate input
    if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
        return { success: false, error: 'No match IDs provided for deletion.' };
    }
    // Ensure all IDs are numbers (basic check)
    if (!matchIds.every(id => typeof id === 'number' && !isNaN(id))) {
        return { success: false, error: 'Invalid match IDs provided.' };
    }

    try {
        // --- Database Operations (Ideally within a transaction) ---

        // 3. Delete associated match_players first using the 'in' filter
        const { error: deletePlayersError, count: deletedPlayersCount } = await supabase
            .from('match_players')
            .delete({ count: 'exact' }) // Request count for logging/checking
            .in('match_id', matchIds);
            // Note: RLS should restrict this to match_ids owned by the user indirectly via the matches table,
            // but verifying ownership before delete is safer if RLS isn't perfect.

        if (deletePlayersError) throw deletePlayersError;
        console.log(`Bulk delete: Deleted ${deletedPlayersCount} match_players entries.`);

        // 4. Delete the matches themselves using the 'in' filter
        const { error: deleteMatchesError, count: deletedMatchesCount } = await supabase
            .from('matches')
            .delete({ count: 'exact' }) // Request count
            .in('id', matchIds)
            .eq('user_id', user.id); // Crucial: Ensure user owns all matches being deleted

        if (deleteMatchesError) throw deleteMatchesError;

        // Optional: Check if deletedMatchesCount matches matchIds.length
        if (deletedMatchesCount !== matchIds.length) {
            console.warn(`Bulk delete: Attempted to delete ${matchIds.length} matches, but ${deletedMatchesCount} were deleted. This might indicate some matches were already deleted or didn't belong to the user.`);
            // Decide if this should be an error or just a warning
        }

        // --- End Database Operations ---

        // 5. Revalidate paths
        revalidatePath('/matches');
        revalidatePath('/dashboard');

        console.log(`Matches ${matchIds.join(', ')} deleted successfully.`);
        return { success: true, deletedCount: deletedMatchesCount ?? 0 };

    } catch (error) {
        console.error(`Error bulk deleting matches (Server Action - Bulk Delete):`, error);
        if (typeof error === 'object' && error !== null && 'message' in error) {
            return { success: false, error: (error as { message: string }).message };
        }
        return { success: false, error: 'An unexpected error occurred during bulk delete.' };
    }
}
