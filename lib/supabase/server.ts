// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client configured for server-side usage (Server Components, Route Handlers, Server Actions).
 *
 * Reads Supabase URL and anonymous key from environment variables.
 * Manages authentication state by reading and writing cookies using the Next.js `cookies` function.
 *
 * @returns {SupabaseClient} A Supabase client instance for server-side operations.
 * @throws {Error} If Supabase URL or anon key is missing in environment variables.
 */
export function createClient() {
  // Get the cookie store from Next.js headers
  const cookieStore = cookies()

  // Ensure environment variables are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase URL or Anon Key in environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
  }

  // Create and return the Supabase client for server context
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      // Define cookie handling logic for server-side authentication
      cookies: {
        async get(name: string) {
          return (await cookieStore).get(name)?.value
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Note: You might add more specific server clients here later if needed,
// e.g., one using the service_role key for admin tasks, but start with this.
