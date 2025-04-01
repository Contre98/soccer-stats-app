// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client configured for browser (Client Component) usage.
 *
 * Reads the Supabase URL and anonymous key from environment variables.
 * IMPORTANT: Environment variables must be prefixed with NEXT_PUBLIC_ to be accessible in the browser.
 *
 * @returns {SupabaseClient} A Supabase client instance.
 * @throws {Error} If Supabase URL or anon key is missing in environment variables.
 */
export function createClient() {
  // Ensure environment variables are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase URL or Anon Key in environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
  }

  // Create and return the Supabase client for browser context
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}
