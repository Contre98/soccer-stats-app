// app/team-generator/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeamGeneratorClientComponent from './TeamGeneratorClientComponent'; // Import the client component

// This is an async Server Component that fetches data before rendering
export default async function TeamGeneratorPage() {
  const supabase = createClient(); // Initialize Supabase server client

  // Get the current user session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Redirect to login if the user is not authenticated
  // (Middleware should also handle this, but it's a safeguard)
  if (userError || !user) {
     console.error("Error getting user or no user found in Team Generator, redirecting.", userError);
     redirect('/login');
  }

  // Fetch the list of available players associated with the logged-in user
  // Select the columns needed for the generator (id, name, manual_rating)
  const { data: players, error } = await supabase
    .from('players') // Target the 'players' table
    .select('id, name, manual_rating') // Specify columns to fetch
    .eq('user_id', user.id) // Filter by the current user's ID
    .order('name', { ascending: true }); // Order players alphabetically by name

  // Handle potential errors during data fetching
  if (error) {
    console.error('Error fetching players for team generator:', error);
    // In a real app, you might want to show a user-friendly error message here
    // For now, we'll pass an empty array if fetching fails
  }

  // Render the Client Component, passing the fetched players list as a prop
  // Use '?? []' to ensure an empty array is passed if 'players' is null or undefined
  return (
    <TeamGeneratorClientComponent availablePlayers={players ?? []} />
  );
}

