// lib/actions/matchActions.ts
// Reusable function to save match data and player links

import { SupabaseClient } from '@supabase/supabase-js'; // Import Supabase type

// Define structure for basic match data needed for insert
interface MatchInsertData {
  match_date: string;
  score_a: number;
  score_b: number;
  replay_url?: string | null;
  user_id: string; // User ID must be provided
}

// Define structure for the returned match data (adjust based on your select query)
interface SavedMatchData {
    id: number;
    // Include other fields returned by select() if needed
    [key: string]: unknown;
}

/**
 * Saves a match and its player associations to Supabase.
 * Performs sequential inserts: first into 'matches', then into 'match_players'.
 * Attempts to clean up orphaned match if player insert fails.
 *
 * @param supabase - An initialized Supabase client instance (browser or server).
 * @param matchData - Basic data for the 'matches' table insert.
 * @param teamAPlayerIds - Array of player IDs for Team A.
 * @param teamBPlayerIds - Array of player IDs for Team B.
 * @returns The newly created match data (from the 'matches' table insert).
 * @throws Error if any Supabase operation fails.
 */
export async function addMatchWithPlayers(
    supabase: SupabaseClient, // Accept Supabase client instance
    matchData: MatchInsertData,
    teamAPlayerIds: number[],
    teamBPlayerIds: number[]
): Promise<SavedMatchData> {

    console.log('Saving match to Supabase:', matchData);

    // 1. Insert into 'matches' table
    const { data: newMatch, error: matchError } = await supabase
      .from('matches')
      .insert(matchData)
      .select() // Select the newly inserted match row to get its ID
      .single(); // Expect a single row back

    // Handle error during match insertion
    if (matchError || !newMatch) {
      console.error('Error inserting match:', matchError);
      throw matchError || new Error("Match data was not returned after insert.");
    }

    console.log('Match inserted successfully, ID:', newMatch.id);

    // 2. Prepare data for 'match_players' table
    const matchPlayersData = [
      ...teamAPlayerIds.map(playerId => ({
        match_id: newMatch.id,
        player_id: playerId,
        team: 'A',
        user_id: matchData.user_id, // Pass user_id for RLS
      })),
      ...teamBPlayerIds.map(playerId => ({
        match_id: newMatch.id,
        player_id: playerId,
        team: 'B',
        user_id: matchData.user_id,
      })),
    ];

    // 3. Insert into 'match_players' table
    console.log('Inserting into match_players:', matchPlayersData);
    const { error: playersError } = await supabase
      .from('match_players')
      .insert(matchPlayersData);

    // Handle error during player link insertion
    if (playersError) {
      console.error('Error inserting match players:', playersError);
      // Attempt to clean up the orphaned match record
      console.warn(`Attempting to delete orphaned match record ID: ${newMatch.id}`);
      await supabase.from('matches').delete().match({ id: newMatch.id });
      throw playersError; // Re-throw the error
    }

    console.log('Match players inserted successfully.');

    // 4. Return the saved match data (or potentially refetch with players)
    // For now, just return the basic match data received from the first insert
    return newMatch as SavedMatchData;
}
