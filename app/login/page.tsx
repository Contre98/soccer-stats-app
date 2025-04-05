// app/login/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js'; // Import type for clarity

export default function LoginPage() {
  const supabase: SupabaseClient = createClient(); // Add type annotation
  const router = useRouter();
  const [theme, setTheme] = useState('light'); // Default theme
  const [isMounted, setIsMounted] = useState(false); // Track mount state

  useEffect(() => {
    setIsMounted(true); // Component has mounted
    // --- UPDATED: Detect theme based on media query ---
    const currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    // --------------------------------------------------
    console.log('Detected theme:', currentTheme); // Keep this log for now
    setTheme(currentTheme);

    // Listener for authentication events
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          console.log('User signed in, redirecting to dashboard...');
          router.push('/'); // Redirect to home/dashboard page
        }
      }
    );

    // Cleanup listener
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]); // Dependencies remain the same

  // Define appearance dynamically based on theme state
  const dynamicAppearance = {
    theme: ThemeSupa, // Base theme
    variables: {
      default: {
        // Base theme variables inherited
      },
      dark: {
        colors: {
           // Keep placeholder override
           inputPlaceholder: '#A0AEC0', // Tailwind gray-400

           // --- Add overrides for default buttons (Google/GitHub) ---
           defaultButtonBackground: '#374151', // Example: Tailwind gray-700
           defaultButtonBackgroundHover: '#4B5563', // Example: Tailwind gray-600
           defaultButtonBorder: '#4B5563', // Example: Tailwind gray-600
           defaultButtonText: '#FFFFFF', // White text on dark button
           // --------------------------------------------------------

           // --- Add override for input border ---
           inputBorder: '#6B7280', // Example: Tailwind gray-500 (more visible)
           // -----------------------------------

           // Add other dark theme color overrides here if needed
        }
      },
    },
    // Keep the style override for input text color
    style: {
      input: {
        color: theme === 'dark' ? '#E5E7EB' : '#000000', // Using light gray text (gray-200)
      },
    },
  };

  // Avoid rendering Auth component until theme is determined client-side
  if (!isMounted) {
    // Optional: Render a loading state or null during mount
    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
            {/* You can add a simple loader here */}
        </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Soccer Stats Login
        </h1>
        {/* Pass the dynamically created appearance object */}
        <Auth
          supabaseClient={supabase}
          appearance={dynamicAppearance} // Use the dynamic appearance object
          theme={theme} // Pass theme for ThemeSupa base styles
          providers={[]}
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')}/auth/callback`}
        />
      </div>
    </div>
  );
}
