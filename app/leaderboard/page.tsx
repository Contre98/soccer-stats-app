// app/leaderboard/page.tsx (Server Component - Calls RPC Function)
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// Import the client component and its types
import LeaderboardClientComponent from './LeaderboardClientComponent';
// Ensure this type matches the columns returned by the SQL function!
import type { LeaderboardData } from './LeaderboardClientComponent';

export default async function LeaderboardPage() {
  const supabase = createClient();

  // --- Get Session ---
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Redirecting, user not found:", userError);
    redirect('/login');
  }
  const userId = user.id;

  // --- Fetch Leaderboard Data using RPC ---
  let leaderboardData: LeaderboardData[] = [];
  let fetchError: Error | null = null;

  // --- UPDATED try...catch block with improved logging ---
  try {
    console.log(`Calling RPC get_leaderboard_stats for user: ${userId}`); // Log before call

    // Call the database function
    const { data, error: rpcError } = await supabase
      .rpc('get_leaderboard_stats', { requesting_user_id: userId }); // Pass user ID

    // Check specifically for RPC error
    if (rpcError) {
      console.error("RPC Error Object:", JSON.stringify(rpcError, null, 2)); // Log the full error object
      // Throw the specific RPC error to be caught below
      throw rpcError;
    }

    // RPC succeeded, process data
    leaderboardData = data ?? [];
    console.log(`RPC get_leaderboard_stats returned ${leaderboardData.length} rows.`); // Log success

  } catch (err) {
    // Log detailed error information
    console.error("Caught error calling/processing RPC function get_leaderboard_stats:");
    if (err instanceof Error) {
        console.error("Error Message:", err.message);
        // Attempt to log PostgREST error details if available
        const pgError = err as any; // Use any type for potential PostgREST properties
        console.error("Error Details:", pgError.details); // Might be null
        console.error("Error Hint:", pgError.hint);       // Might be null
        console.error("Error Code:", pgError.code);       // Might be null
        // Set fetchError for the UI
        fetchError = new Error(`Database Error: ${pgError.message || 'Unknown RPC error'}${pgError.hint ? ` (Hint: ${pgError.hint})` : ''}`);
    } else {
      // Handle non-Error throws (less common)
      console.error("Unknown error type:", err);
      fetchError = new Error("An unknown error occurred fetching leaderboard data.");
    }
    leaderboardData = []; // Ensure data is empty on error
  }
  // --- END of UPDATED try...catch block ---

  // --- Render Client Component ---
  // Pass the data fetched via RPC (or empty array) and any error
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Leaderboard</h1>
      {/* Display Error if fetch failed */}
      {fetchError && (
        <div className="mb-4 p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700" role="alert">
          Error loading leaderboard data: {fetchError.message}
        </div>
      )}
      {/* Render client component, passing the RPC data */}
      {/* Ensure LeaderboardClientComponent handles potential null winRate */}
      <LeaderboardClientComponent initialLeaderboardData={leaderboardData} />
    </div>
  );
}
