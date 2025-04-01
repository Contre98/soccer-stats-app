// app/chemistry/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ChemistryClientComponent from './ChemistryClientComponent'; // Import the client component

  // Ensure this is the default export and it's an async function returning JSX
  export default async function ChemistryPage() {
  const cookieStore = cookies();
  const supabase = createClient();

  // Get user session
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect if not logged in
  if (!session) {
    redirect('/login');
  }

  // Fetch available players for the dropdowns
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name') // Only need ID and name
    .eq('user_id', session.user.id)
    .order('name', { ascending: true });

  // Handle potential fetch error
  if (error) {
    console.error('Error fetching players for chemistry page:', error);
    // Consider rendering an error component or passing an empty array
  }

  // Render the client component, passing the fetched players list
  // This return statement makes this function a valid React component
  return (
    <ChemistryClientComponent availablePlayers={players ?? []} />
  );
}
