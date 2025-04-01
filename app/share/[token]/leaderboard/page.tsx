import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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

// Define the type for the params in generateMetadata
interface MetadataParams {
  token: string;
}

interface PageProps {
  params: {
    token: string;
  };
}

// Define the type for the return value of generateStaticParams
interface StaticParams {
  token: string;
}

export async function generateMetadata({
  params,
}: {
  params: MetadataParams;
}): Promise<Metadata> {
  // read route params
  const { token } = params;

  return {
    title: `Leaderboard for ${token}`,
  };
}

export async function generateStaticParams(): Promise<StaticParams[]> {
  try {
    // Fetch all tokens from Supabase
    const { data, error } = await supabase
      .from('tokens') // Replace 'tokens' with your actual table name
      .select('token'); // Assuming your token column is named 'token'

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Map the tokens to the format Next.js expects
    return data.map((item) => ({
      token: item.token,
    }));
  } catch (error) {
    console.error('Error fetching tokens from Supabase:', error);
    return []; // Return an empty array if there's an error
  }
}

export default async function Page({ params }: PageProps) {
  const { token } = params;

  try {
    // Check if the token is valid by querying Supabase
    const { data, error } = await supabase
      .from('tokens') // Replace 'tokens' with your actual table name
      .select('token')
      .eq('token', token) // Check if a token exists that matches the provided token
      .single(); // Expect only one result

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found, token is invalid
        notFound();
      } else {
        throw new Error(`Supabase error: ${error.message}`);
      }
    }

    if (!data) {
      notFound();
    }
  } catch (error) {
    console.error('Error validating token:', error);
    notFound();
  }

  // Now you can use the token to fetch data or render the page
  // Example:
  // const data = await fetchDataForToken(token);

  return (
    <div>
      <h1>Leaderboard for Token: {token}</h1>
      {/* Render your leaderboard content here */}
    </div>
  );
}
