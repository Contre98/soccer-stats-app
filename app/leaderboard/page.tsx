// app/leaderboard/page.tsx
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''; // Ensure you have this environment variable set
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Ensure you have this environment variable set

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function Page() {
  try {
    // Example: Fetch some data from Supabase (replace with your actual data fetching)
    const { data: leaderboardData, error } = await supabase
      .from('your_leaderboard_table') // Replace with your actual table name
      .select('*') // Select all columns (or specify the ones you need)
      .order('score', { ascending: false }); // Example: Order by score in descending order

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!leaderboardData) {
      return <div>No leaderboard data found.</div>;
    }

    return (
      <div>
        <h1>Leaderboard</h1>
        {/* Render your leaderboard content here */}
        <ul>
          {leaderboardData.map((item) => (
            <li key={item.id}>
              {/* Replace with your actual data fields */}
              {item.name}: {item.score}
            </li>
          ))}
        </ul>
      </div>
    );
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return <div>Error loading leaderboard.</div>;
  }
}
