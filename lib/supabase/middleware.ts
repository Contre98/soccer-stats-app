// lib/supabase/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Creates a Supabase client specifically for use within Next.js Middleware.
 *
 * Reads Supabase URL and anonymous key from environment variables.
 * Handles reading and writing cookies within the middleware context using request/response objects.
 * This is crucial for maintaining authentication state across server requests.
 *
 * @param {NextRequest} request - The incoming Next.js request object.
 * @returns {{supabase: SupabaseClient, response: NextResponse}} An object containing the Supabase client and a response object.
 * @throws {Error} If Supabase URL or anon key is missing in environment variables.
 */
export async function createClient(request: NextRequest) {
  // Create an unmodified response object to potentially pass down
  // We might update this response later based on auth state
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Ensure environment variables are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase URL or Anon Key in environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
  }

  // Create the Supabase client for middleware context
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      // Define cookie handling logic specific to middleware
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is set, update the request and response cookies
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ // Create a new response to apply changes
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the request and response cookies
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ // Create a new response to apply changes
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  return { supabase, response }
}
