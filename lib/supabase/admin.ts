// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are available server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase URL or Service Role Key in environment variables for admin client.');
}

// Create a Singleton Supabase client instance using the service role key
// This client bypasses RLS and should ONLY be used in server-side code
// where access control is handled manually (e.g., after validating a share token).
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
        // Important: Disable auto-refreshing tokens and persisting sessions for service role client
        autoRefreshToken: false,
        persistSession: false
    }
});

// Note: Using the service role key gives unrestricted database access.
// Ensure any function using this client performs its own authorization checks
// (e.g., validating the share token before fetching data).
