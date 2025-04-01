// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = await createClient(request);
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    const { pathname } = request.nextUrl;

    // Define protected routes
    const protectedRoutes = ['/', '/players', '/matches', '/team-generator', '/replays', '/leaderboard', '/chemistry']; // Add all pages requiring login
    // Define public-only routes
    const publicRoutes = ['/login'];

    const isProtectedRoute = protectedRoutes.some(route => pathname === route || (route === '/' && pathname === '/'));
    const isPublicRoute = publicRoutes.includes(pathname);

    // --- Authentication Logic ---
    if (!user && isProtectedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }
    if (user && isPublicRoute) {
       const redirectUrl = request.nextUrl.clone();
       redirectUrl.pathname = '/';
       return NextResponse.redirect(redirectUrl);
    }

    return response; // Allow request, potentially with updated session cookie

  } catch (e) {
    console.error("[Middleware] Error:", e);
    return NextResponse.next({ request: { headers: request.headers } });
  }
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /auth/callback (Supabase auth callback route)
     * - /share/ (NEW: Exclude public share paths) - Added /share/.*
     * Feel free to modify this pattern to include more exceptions.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|share/).*)',
     // Also explicitly match the root if needed, depending on above pattern
     //'/', // Might be needed if the above pattern doesn't cover root correctly
  ],
}
