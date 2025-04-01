// app/login/page.tsx
'use client'; // This page requires client-side interactivity for the Auth UI

import { createClient } from '@/lib/supabase/client'; // Import the browser client helper
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
// ++ Import useState and useEffect ++
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router

export default function LoginPage() {
  const supabase = createClient(); // Initialize the Supabase client for the browser
  const router = useRouter();
  // ++ Add state for theme ++
  const [theme, setTheme] = useState('light'); // Default theme

  // ++ Use useEffect to detect theme ONLY on the client-side ++
  useEffect(() => {
    // This code runs only after the component mounts in the browser
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(currentTheme);

    // Listener for authentication events (SIGNED_IN, SIGNED_OUT)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          console.log('User signed in, redirecting to dashboard...');
          router.push('/'); // Redirect to home/dashboard page
          // Optionally refresh to ensure server components reload data if needed
          // router.refresh();
        }
        // Optional: Handle SIGNED_OUT or other events if needed
      }
    );

    // Cleanup the listener when the component unmounts
    return () => {
      authListener?.subscription.unsubscribe();
    };
    // Add supabase and router as dependencies for the auth listener part
  }, [supabase, router]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Soccer Stats Login
        </h1>
        {/* Supabase Auth UI Component */}
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          // ++ Use the theme state variable ++
          theme={theme}
          providers={['google', 'github']} // Optional: Add social providers if configured
          // Ensure this matches your callback route URL and Supabase settings
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')}/auth/callback`}
        />
      </div>
    </div>
  );
}

// Reminder: For redirectTo to work in production, set NEXT_PUBLIC_SITE_URL
// environment variable on your hosting provider (e.g., Vercel).
// Also ensure callback URLs are added in Supabase Auth settings.
