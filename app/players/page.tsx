// app/players/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'; // Import server client
import { cookies } from 'next/headers'; // Needed for server client
import PlayersClientComponent from './PlayersClientComponent'; // Import the new client component
import { redirect } from 'next/navigation'; // For redirecting if user not found

// Define the Player type matching the database structure
// Can be moved to a shared types file later (e.g., types/supabase.ts)
interface Player {
  id: number;
  name: string;
  manual_rating: number;
  user_id: string;
  created_at: string;
}


// This page is now an async Server Component
export default async function PlayersPage() {
  const cookieStore = cookies(); // Get cookie store
  const supabase = createClient(); // Create server client instance

  // Get the current user session
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect to login if no session (although middleware should handle this)
  if (!session) {
     console.log("No session found in PlayersPage, redirecting...");
     redirect('/login');
  }

  // Fetch players belonging to the logged-in user
  // Ensure RLS is enabled and policies are correct in Supabase!
  const { data: players, error } = await supabase
    .from('players') // Select from the 'players' table
    .select('*') // Select all columns
    .eq('user_id', session.user.id) // Filter by the logged-in user's ID
    .order('name', { ascending: true }); // Order players by name

  // Handle potential fetch errors
  if (error) {
    console.error('Error fetching players:', error);
    // Optionally render an error message to the user
    // return <div>Error loading players. Please try again later.</div>;
  }

  // Render the Client Component, passing the fetched players as initial data
  // If players is null/undefined due to error, pass an empty array
  return <PlayersClientComponent initialPlayers={players ?? []} />;
}
