// app/share/[token]/layout.tsx
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home, Trophy, Users, Swords, Shuffle, Link as LinkIcon, PlaySquare } from 'lucide-react';

// Simple Read-only Sidebar Link
function ShareSidebarLink({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) {
  // TODO: Add active link styling based on current route segment
  return (
    <Link href={href} className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md transition duration-150 ease-in-out">
      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
      <span className="truncate">{children}</span>
    </Link>
  );
}

export default async function ShareLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { token: string };
}) {
  const shareToken = params.token;

  // --- Validate Token & Get Team Name ---
  // This validation runs for every page within the share section
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, full_name') // Select name for display
    .eq('share_token', shareToken)
    .single();

  // If token is invalid or profile fetch fails, render a "Not Found" page
  if (profileError || !profile) {
    console.error(`Share layout: Invalid token (${shareToken}) or error fetching profile:`, profileError);
    notFound(); // Use Next.js notFound helper
  }

  const teamName = profile.full_name || profile.username || `Team Stats`;

  return (
    <html lang="en">
      {/* Basic dark mode support */}
      <body className={`bg-gray-100 dark:bg-gray-900`}>
        <div className="flex h-screen overflow-hidden">
          {/* Read-Only Sidebar */}
          <aside className="w-64 bg-gray-800 dark:bg-gray-950 text-white flex flex-col p-4 rounded-r-lg shadow-lg flex-shrink-0">
            <div className="text-xl font-bold mb-1 px-4 py-2 border-b border-gray-700">
              ⚽ {teamName}
            </div>
            <div className="text-xs font-light text-gray-400 px-4 mb-4">(Public View)</div>

            {/* Navigation Links within the Share section */}
            <nav className="flex flex-col space-y-2 overflow-y-auto">
              {/* Links point relative to the current token */}
              <ShareSidebarLink href={`/share/${shareToken}/`} icon={Home}>Dashboard</ShareSidebarLink>
              <ShareSidebarLink href={`/share/${shareToken}/leaderboard`} icon={Trophy}>Leaderboard</ShareSidebarLink>
              {/* Add links for other sections as they are created */}
              {/* <ShareSidebarLink href={`/share/${shareToken}/players`} icon={Users}>Players</ShareSidebarLink> */}
              {/* <ShareSidebarLink href={`/share/${shareToken}/matches`} icon={Swords}>Matches</ShareSidebarLink> */}
              {/* <ShareSidebarLink href={`/share/${shareToken}/chemistry`} icon={LinkIcon}>Chemistry</ShareSidebarLink> */}
              {/* <ShareSidebarLink href={`/share/${shareToken}/replays`} icon={PlaySquare}>Replay Gallery</ShareSidebarLink> */}
            </nav>
            {/* Optional: Footer or branding */}
            <div className="mt-auto text-center text-xs text-gray-500 p-2">
                Powered by Your App
            </div>
          </aside>

          {/* Main Content Area for the specific shared page */}
          <main className="flex-1 p-6 overflow-y-auto bg-gray-100 dark:bg-gray-900">
            {children} {/* The specific page component will be rendered here */}
          </main>
        </div>
      </body>
    </html>
  );
}

// Optional: Revalidate less often if data doesn't change frequently
// export const revalidate = 3600; // Revalidate data every hour
