// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'; // Import the server client helper
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This route handles the redirect from Supabase after a user logs in or signs up.
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code'); // Get the authorization code from the URL query parameters
  const origin = requestUrl.origin; // Get the origin URL (e.g., http://localhost:3000)

  if (code) {
    // If a code is present, exchange it for a session
    const supabase = createClient(); // Create a server client using cookies()
    try {
        await supabase.auth.exchangeCodeForSession(code);
        console.log("Successfully exchanged code for session.");
        // Session is now stored in cookies managed by the server client
    } catch (error) {
        console.error("Error exchanging code for session:", error);
        // Handle error, maybe redirect to an error page or login page with an error message
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }
  } else {
      console.warn("No authorization code found in callback request.");
      // Redirect to login if no code is present (might happen in some error scenarios)
      return NextResponse.redirect(`${origin}/login?error=no_auth_code`);
  }

  // URL to redirect to after successful sign in
  console.log("Redirecting user to dashboard...");
  return NextResponse.redirect(`${origin}/`); // Redirect to the home/dashboard page
}
