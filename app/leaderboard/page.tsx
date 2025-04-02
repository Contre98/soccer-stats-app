// app/leaderboard/page.tsx (Server Component - Calls RPC Function)
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// Import the client component and its types
import LeaderboardClientComponent from './LeaderboardClientComponent';
// Ensure this type matches the columns returned by the SQL function!
import type { LeaderboardData } from './LeaderboardClientComponent';

// Define a type for potential PostgREST errors (subset of properties)
interface PostgrestError {
    message: string;
    details?: string | null;
    hint?: string | null;
    code?: string | null;
}

// Helper to check if an error object looks like a PostgrestError
function isPostgrestError(error: any): error is PostgrestError {
    return typeof error === 'object' && error !== null && 'message' in error;
}

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
    // --- Fix: Improved Error Handling Type Safety ---
    console.error("Caught error calling/processing RPC function get_leaderboard_stats:");
    if (isPostgrestError(err)) { // Check if it has PostgrestError shape
        console.error("Error Message:", err.message);
        console.error("Error Details:", err.details);
        console.error("Error Hint:", err.hint);
        console.error("Error Code:", err.code);
        fetchError = new Error(`Database Error: ${err.message}${err.hint ? ` (Hint: ${err.hint})` : ''}`);
    } else if (err instanceof Error) { // Handle generic Errors
         console.error("Error Message:", err.message);
         fetchError = err;
    } else {
      // Handle non-Error throws (less common)
      console.error("Unknown error type:", err);
      fetchError = new Error("An unknown error occurred fetching leaderboard data.");
    }
    // --- End Fix ---
    leaderboardData = []; // Ensure data is empty on error
  }

  // --- Render Client Component ---
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Leaderboard</h1>
      {fetchError && (
        <div className="mb-4 p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700" role="alert">
          Error loading leaderboard data: {fetchError.message}
        </div>
      )}
      {/* Ensure LeaderboardClientComponent handles potential null winRate */}
      <LeaderboardClientComponent initialLeaderboardData={leaderboardData} />
    </div>
  );
}
