// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Base Tailwind styles
import Link from 'next/link';
// Import icons from lucide-react
// Added LeaderboardIcon (using Trophy alias)
import { Home, Users, Swords, PlaySquare, Shuffle, LogIn, Link as LinkIcon, Trophy as LeaderboardIcon } from 'lucide-react';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fulbito Stats App",
  description: "Track your amateur soccer match stats and chemistry.",
};

// Simple Sidebar Link Component for reusability
function SidebarLink({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) {
  // TODO: Add active link styling based on current route
  return (
    <Link href={href} className="flex items-center px-4 py-2 text-gray-100 hover:bg-gray-700 rounded-md transition duration-150 ease-in-out">
      <Icon className="w-5 h-5 mr-3 flex-shrink-0" /> {/* Added flex-shrink-0 */}
      <span className="truncate">{children}</span> {/* Added truncate */}
    </Link>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Defaulting to dark mode for better contrast with sidebar */}
       <body className={`${inter.className} bg-gray-100 dark:bg-gray-900`}>
        <div className="flex h-screen overflow-hidden"> {/* Added overflow-hidden */}
          {/* Sidebar Navigation */}
          <aside className="w-64 bg-gray-800 dark:bg-gray-950 text-white flex flex-col p-4 rounded-r-lg shadow-lg flex-shrink-0"> {/* Added flex-shrink-0 */}
            {/* App Title */}
            <div className="text-2xl font-bold mb-6 px-4 py-2 border-b border-gray-700">
              ⚽ Fulbito Stats
            </div>
            {/* Navigation Links */}
            <nav className="flex flex-col space-y-2 overflow-y-auto"> {/* Added overflow-y-auto */}
              <SidebarLink href="/" icon={Home}>Dashboard</SidebarLink>
              {/* ++ Added Leaderboard Link ++ */}
              <SidebarLink href="/leaderboard" icon={LeaderboardIcon}>Leaderboard</SidebarLink>
              <SidebarLink href="/players" icon={Users}>Players</SidebarLink>
              <SidebarLink href="/matches" icon={Swords}>Matches</SidebarLink>
              <SidebarLink href="/team-generator" icon={Shuffle}>Team Generator</SidebarLink>
              <SidebarLink href="/chemistry" icon={LinkIcon}>Chemistry</SidebarLink>
              <SidebarLink href="/replays" icon={PlaySquare}>Replay Gallery</SidebarLink>
            </nav>
            {/* Login/Logout Link at the bottom */}
            {/* TODO: Replace this with dynamic AuthButton later */}
            <div className="mt-auto pt-4 border-t border-gray-700"> {/* Added padding-top and border */}
               <SidebarLink href="/login" icon={LogIn}>Login</SidebarLink>
               {/* We will add a Logout button here later */}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-6 overflow-y-auto bg-gray-100 dark:bg-gray-900"> {/* Ensure background color here too */}
            {/* Page content from page.tsx or other routes will be rendered here */}
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
