// app/dashboard/DashboardClientComponent.tsx
// Final Combined Version + Share Link Functionality
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatCard from '../../components/StatCard';
import { Swords, Trophy, Percent, TrendingUp, User, Loader2, Filter, Star, Link as LinkIcon, CalendarDays, ShieldCheck, Share2, Copy } from 'lucide-react'; // Added Share2, Copy
import { createClient } from '@/lib/supabase/client';

// --- Type Definitions (Ensure exported or shared) ---
export interface Player { id: number; name: string; }
export interface LeaderboardData {
  playerId: number; playerName: string; gamesPlayed: number; wins: number;
  losses: number; draws: number; winRate: number | string;
  winRateDisplay: string; streak: number;
}
export interface DuoStat {
  player1Name: string; player2Name: string; gamesTogether: number;
  winsTogether: number; winRateDisplay: string;
}
export interface LastMatchData {
  id: number; match_date: string; score_a: number; score_b: number;
  teamANames: string[]; teamBNames: string[];
}
interface PlayerDisplayStats {
  gamesPlayed: number; winLossStr: string; winRateDisplay: string; winStreak: number;
}
// ++ Type for Profile data ++
interface Profile {
    id: string; // UUID
    username: string | null;
    share_token: string | null; // Added share token
}

// Props for the component
interface DashboardClientProps {
  availablePlayers: Player[];
  leaderboardData?: LeaderboardData[];
  bestDuo: DuoStat | null;
  lastMatch: LastMatchData | null;
}

export default function DashboardClientComponent({
    availablePlayers,
    leaderboardData = [],
    bestDuo,
    lastMatch
}: DashboardClientProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [displayStats, setDisplayStats] = useState<PlayerDisplayStats>({ gamesPlayed: 0, winLossStr: 'Select Player', winRateDisplay: 'N/A', winStreak: 0 });
  const [minGamesPlayed, setMinGamesPlayed] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading for stat cards update
  const [error, setError] = useState<string | null>(null);
  // ++ State for profile and share link ++
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shareLink, setShareLink] = useState<string>('');
  const [isGeneratingToken, setIsGeneratingToken] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string>('');

  const supabase = createClient();

  // Effect to fetch user profile data on mount
  useEffect(() => {
      const fetchProfile = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              console.log("Fetching profile for user:", user.id); // Debug log
              const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('id, username, share_token') // Fetch share_token
                  .eq('id', user.id)
                  .single();

              if (profileError) {
                  console.error("Error fetching profile:", profileError);
                  setError("Could not load profile data for sharing.");
              } else if (profileData) {
                  console.log("Profile data fetched:", profileData); // Debug log
                  setProfile(profileData);
                  if (profileData.share_token) {
                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                      setShareLink(`${origin}/share/${profileData.share_token}`);
                      console.log("Share link set:", `${origin}/share/${profileData.share_token}`); // Debug log
                  } else {
                      console.log("No share token found for profile."); // Debug log
                      setShareLink(''); // Ensure link is empty if token is null
                  }
              } else {
                   console.log("No profile data returned."); // Debug log
              }
          } else {
              console.log("No user found for profile fetch."); // Debug log
          }
      };
      fetchProfile();
  }, [supabase]); // Dependency: supabase client instance

  // Effect to update Stat Cards based on dropdown selection
  useEffect(() => { /* ... (StatCard update logic - unchanged) ... */
    setIsLoading(true); setError(null);
    try {
        let statsToDisplay: PlayerDisplayStats;
        if (!selectedPlayerId) { statsToDisplay = { gamesPlayed: 0, winLossStr: 'Select Player', winRateDisplay: 'N/A', winStreak: 0 }; }
        else { const d = leaderboardData.find(p => p.playerId.toString() === selectedPlayerId); if (d) { statsToDisplay = { gamesPlayed: d.gamesPlayed, winLossStr: `${d.wins}W / ${d.draws}D / ${d.losses}L`, winRateDisplay: d.winRateDisplay, winStreak: d.streak }; } else { statsToDisplay = { gamesPlayed: 0, winLossStr: 'Not Found', winRateDisplay: 'N/A', winStreak: 0 }; setError(`Could not find stats.`); } }
        setDisplayStats(statsToDisplay);
    } catch(err) { console.error("Err processing stats:", err); setError("Err display stats."); setDisplayStats({ gamesPlayed: 0, winLossStr: 'Error', winRateDisplay: 'N/A', winStreak: 0 }); }
    finally { setIsLoading(false); }
  }, [selectedPlayerId, leaderboardData]);

  // Filtering/Sorting/Slicing for Top 3 (unchanged)
  const filteredLeaderboard = leaderboardData.filter(player => player.gamesPlayed >= minGamesPlayed);
  const top3Leaderboard = filteredLeaderboard.slice(0, 3);
  const getDuoWinLoss = (stats: DuoStat | null) => { /* ... */ if (!stats || stats.gamesTogether === 0) return 'N/A'; const l = stats.gamesTogether - stats.winsTogether; return `${stats.winsTogether}W - ${l}L`; };

  // ++ Handler to generate or regenerate share token ++
  const handleGenerateShareToken = async () => {
      if (!profile) return;
      setIsGeneratingToken(true); setCopySuccess('');
      try {
          const newToken = crypto.randomUUID();
          const { data: updatedProfile, error: updateError } = await supabase
              .from('profiles')
              .update({ share_token: newToken })
              .eq('id', profile.id)
              .select('share_token')
              .single();
          if (updateError) throw updateError;
          if (updatedProfile?.share_token) {
              setProfile(prev => prev ? { ...prev, share_token: updatedProfile.share_token } : null);
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              const newLink = `${origin}/share/${updatedProfile.share_token}`;
              setShareLink(newLink);
              alert("New share link generated!");
          } else { throw new Error("Failed to retrieve new token."); }
      } catch (error) { console.error("Error generating share token:", error); alert(`Error generating link: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally { setIsGeneratingToken(false); }
  };

  // ++ Handler to copy share link to clipboard ++
  const handleCopyLink = () => {
      if (!shareLink) return;
      navigator.clipboard.writeText(shareLink)
          .then(() => { setCopySuccess('Link Copied!'); setTimeout(() => setCopySuccess(''), 2000); })
          .catch(err => { console.error('Failed to copy link: ', err); setCopySuccess('Failed to copy!'); setTimeout(() => setCopySuccess(''), 2000); });
  };

  // --- JSX Rendering ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header and Player Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <div className="flex items-center space-x-2">{/* ... Player Select Dropdown ... */}
           <label htmlFor="player-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Stats for:</label>
           <select id="player-select" value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" disabled={isLoading} ><option value="">-- Select Player --</option>{availablePlayers.map(player => (<option key={player.id} value={player.id.toString()}>{player.name}</option>))} </select>
           {isLoading && <Loader2 className="h-5 w-5 animate-spin text-gray-500" />}
        </div>
      </div>

       {/* Error Display */}
       {error && (<div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert"><span className="font-medium">Error:</span> {error}</div>)}

      {/* Top Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">{/* ... StatCards ... */}
        <StatCard title="Games Played" value={isLoading ? '...' : displayStats.gamesPlayed} icon={Swords} description={selectedPlayerId ? `Selected player's matches` : "Select player"}/>
        <StatCard title="Record (W/D/L)" value={isLoading ? '...' : displayStats.winLossStr} icon={Trophy} description={selectedPlayerId ? "Selected player's results" : "Select player"}/>
        <StatCard title="Win Rate" value={isLoading ? '...' : displayStats.winRateDisplay} icon={Percent} description="Wins / (Wins + Losses)"/>
        <StatCard title="Current Win Streak" value={isLoading ? '...' : displayStats.winStreak} icon={TrendingUp} description="Consecutive Wins"/>
      </div>

      {/* --- Widgets Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Widget 1: Top 3 Leaderboard Snippet */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">{/* ... Top 3 JSX ... */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3"><h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center whitespace-nowrap"><Trophy className="w-5 h-5 mr-2 text-yellow-500"/> Top 3 Players</h2><div className="flex items-center space-x-2 flex-shrink-0"><Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" /><label htmlFor="min-games-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">Min:</label><input type="number" id="min-games-filter" min="0" value={minGamesPlayed} onChange={(e) => setMinGamesPlayed(Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-16 px-2 py-1 text-xs border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"/></div></div>
            <div className="overflow-x-auto">{top3Leaderboard.length === 0 ? ( <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No players meet filter.</p> ) : ( <table className="min-w-full"><thead className="sr-only"><tr><th>Rank</th><th>Player</th><th>Win Rate</th><th>Games</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{top3Leaderboard.map((playerStat, index) => ( <tr key={playerStat.playerId} className={`text-sm ${playerStat.playerId.toString() === selectedPlayerId ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}><td className="px-2 py-2 text-center text-gray-500 dark:text-gray-400 w-10">{index + 1}.</td><td className="px-3 py-2 font-medium text-gray-900 dark:text-white truncate">{playerStat.playerName}</td><td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400 font-semibold w-16">{playerStat.winRateDisplay}</td><td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 w-20">({playerStat.gamesPlayed} Gms)</td></tr> ))}</tbody></table> )}</div>
            <div className="text-right mt-2"><Link href="/leaderboard" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View Full Leaderboard</Link></div>
        </div>

        {/* Widget 2: Best Chemistry Duo */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">{/* ... Best Duo JSX ... */}
           <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center"><LinkIcon className="w-5 h-5 mr-2 text-purple-500"/> Top Duo Chemistry</h2>
           {bestDuo ? ( <div className="space-y-1"><p className="text-md font-medium text-gray-900 dark:text-white">{bestDuo.player1Name} & {bestDuo.player2Name}</p><p className="text-sm text-gray-600 dark:text-gray-400">Win Rate: <span className="font-semibold text-blue-600 dark:text-blue-400">{bestDuo.winRateDisplay}</span></p><p className="text-sm text-gray-600 dark:text-gray-400">Record Together: <span className="font-medium text-gray-700 dark:text-gray-300">{getDuoWinLoss(bestDuo)}</span> ({bestDuo.gamesTogether} games)</p><p className="text-xs text-gray-400 dark:text-gray-500">(Min. 5 games)</p></div> ) : ( <p className="text-sm text-gray-500 dark:text-gray-400">Not enough duo data.</p> )}
            <div className="text-right mt-2"><Link href="/chemistry" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View All Duos</Link></div>
        </div>

        {/* Widget 3: Last Match */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">{/* ... Last Match JSX ... */}
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-green-500"/> Last Match Played</h2>
            {lastMatch ? ( <div className="space-y-2"><p className="text-sm text-gray-600 dark:text-gray-400">Date: {lastMatch.match_date}</p><p className="text-lg font-bold text-center text-gray-800 dark:text-white my-1">{lastMatch.score_a} - {lastMatch.score_b}</p><div className="text-xs text-gray-500 dark:text-gray-400 space-y-1"><p><span className="font-medium text-blue-600 dark:text-blue-400">A:</span> {lastMatch.teamANames.join(', ')}</p><p><span className="font-medium text-red-600 dark:text-red-400">B:</span> {lastMatch.teamBNames.join(', ')}</p></div></div> ) : ( <p className="text-sm text-gray-500 dark:text-gray-400">No matches recorded.</p> )}
             <div className="text-right mt-2"><Link href="/matches" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View All Matches</Link></div>
        </div>

        {/* ++ NEW: Share Link Section ++ */}
        <div className="lg:col-span-3 mt-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
             <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center">
                 <Share2 className="w-5 h-5 mr-2 text-cyan-500"/> Share Public Stats Link
             </h2>
             {profile ? (
                 shareLink ? (
                     <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input type="text" readOnly value={shareLink} className="flex-grow px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm" onClick={(e) => (e.target as HTMLInputElement).select()} />
                        <div className="flex items-center gap-2 flex-shrink-0">
                             <button onClick={handleCopyLink} className="p-1.5 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200" title="Copy Link"><Copy className="w-4 h-4"/></button>
                             <button onClick={handleGenerateShareToken} disabled={isGeneratingToken} className="text-xs text-gray-500 hover:underline disabled:opacity-50">{isGeneratingToken ? 'Generating...' : 'Regenerate'}</button>
                        </div>
                        {copySuccess && <span className="text-xs text-green-600 dark:text-green-400 ml-2 flex-shrink-0">{copySuccess}</span>}
                     </div>
                 ) : (
                     <div className="flex items-center gap-2">
                         <p className="text-sm text-gray-500 dark:text-gray-400">No share link generated yet.</p>
                         <button onClick={handleGenerateShareToken} disabled={isGeneratingToken} className="px-3 py-1 bg-cyan-600 text-white text-xs font-medium rounded shadow hover:bg-cyan-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 disabled:opacity-50">{isGeneratingToken ? 'Generating...' : 'Generate Link'}</button>
                     </div>
                 )
             ) : (
                 <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile...</p>
             )}
             <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Share this link with team members for read-only access to stats (no login required).</p>
        </div>
        {/* -- End Share Link Section -- */}

      </div>
    </div>
  );
}
