// app/dashboard/DashboardClientComponent.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatCard from '../../components/StatCard'; // Assuming path is correct
import { Swords, Trophy, Percent, TrendingUp, Loader2, Filter, CalendarDays, LinkIcon, AlertCircle } from 'lucide-react'; // Added AlertCircle
import { createClient } from '@/lib/supabase/client';
// --- Import Shared Types ---
import type { Player, LeaderboardData, ClientDuoStat, LastMatchData } from '@/lib/types'; // Adjust path if needed

// Type for Profile data (can also be moved to shared types if needed elsewhere)
interface Profile {
    id: string; // UUID
    username: string | null;
}

// Type for internal display stats state
interface PlayerDisplayStats {
  gamesPlayed: number;
  winLossStr: string;
  winRateDisplay: string; // This component calculates/formats this
  winStreak: number; // This data is currently missing from LeaderboardData
}

// Props for the component using shared types
interface DashboardClientProps {
  availablePlayers: Player[];
  leaderboardData: LeaderboardData[]; // Use shared type (winRate: number | null)
  bestDuo: ClientDuoStat | null;      // Use shared type
  lastMatch: LastMatchData | null;    // Use shared type
  initialError?: string | null; // Optional: Pass error from server
}

export default function DashboardClientComponent({
    availablePlayers,
    leaderboardData = [], // Default to empty array
    bestDuo,
    lastMatch,
    initialError
}: DashboardClientProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  // Initialize displayStats - Note: winStreak source data is missing
  const [displayStats, setDisplayStats] = useState<PlayerDisplayStats>({ gamesPlayed: 0, winLossStr: 'Select Player', winRateDisplay: 'N/A', winStreak: 0 });
  const [minGamesPlayed, setMinGamesPlayed] = useState<number>(0); // For top 3 filter
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading for stat cards update
  const [error, setError] = useState<string | null>(initialError || null); // Use initial error from props
  const [, setProfile] = useState<Profile | null>(null); // Profile state remains

  const supabase = createClient();

  // Effect to fetch user profile data on mount (same as before)
  useEffect(() => {
      const fetchProfile = async () => {
        setError(null); // Clear previous errors
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          if (user) {
              console.log("Fetching profile for user:", user.id);
              const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('id, username')
                  .eq('id', user.id)
                  .single();
              if (profileError) {
                  // Handle profile not found potentially differently?
                  if (profileError.code === 'PGRST116') {
                      console.log("No profile found for user, might need creation.");
                      setProfile(null); // Explicitly set to null
                  } else {
                      throw profileError; // Throw other profile errors
                  }
              } else if (profileData) {
                  console.log("Profile data fetched:", profileData);
                  setProfile(profileData);
              } else {
                   console.log("No profile data returned.");
                   setProfile(null);
              }
          } else {
              console.log("No user found for profile fetch.");
              setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          setError(`Could not load profile data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      // Only fetch profile if there wasn't an initial error loading dashboard data
      if (!initialError) {
          fetchProfile();
      }
  }, [supabase, initialError]); // Add initialError dependency

  // Helper to format Win Rate (moved outside useEffect)
  const formatWinRate = (winRate: number | null): string => {
      if (winRate === null || isNaN(winRate)) {
          return 'N/A';
      }
      return `${winRate.toFixed(1)}%`;
  };

  // Effect to update Stat Cards based on dropdown selection
  useEffect(() => {
    // Don't run if there was an initial error or leaderboard data is empty
    if (initialError || leaderboardData.length === 0) {
        setDisplayStats({ gamesPlayed: 0, winLossStr: 'N/A', winRateDisplay: 'N/A', winStreak: 0 });
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null); // Clear component-specific errors

    try {
        let statsToDisplay: PlayerDisplayStats;
        if (!selectedPlayerId) {
            // Default state when no player is selected
            statsToDisplay = { gamesPlayed: 0, winLossStr: 'Select Player', winRateDisplay: 'N/A', winStreak: 0 };
        } else {
            // Find selected player in the leaderboard data
            const playerData = leaderboardData.find(p => p.playerId.toString() === selectedPlayerId);
            if (playerData) {
                // Calculate display values using the correct LeaderboardData type
                statsToDisplay = {
                    gamesPlayed: playerData.gamesPlayed,
                    winLossStr: `${playerData.wins}W / ${playerData.draws}D / ${playerData.losses}L`,
                    winRateDisplay: formatWinRate(playerData.winRate), // Use formatter
                    winStreak: 0 // Streak data is not available from RPC function
                };
            } else {
                // Player selected but not found in leaderboard data (shouldn't happen if availablePlayers is sync)
                statsToDisplay = { gamesPlayed: 0, winLossStr: 'Not Found', winRateDisplay: 'N/A', winStreak: 0 };
                setError(`Could not find stats for the selected player.`);
            }
        }
        setDisplayStats(statsToDisplay);
    } catch(err) {
        console.error("Error processing stats for display:", err);
        setError("Error displaying stats.");
        setDisplayStats({ gamesPlayed: 0, winLossStr: 'Error', winRateDisplay: 'N/A', winStreak: 0 });
    }
    finally {
        setIsLoading(false);
    }
  }, [selectedPlayerId, leaderboardData, initialError]); // Rerun when selection or data changes

  // Filtering for Top 3 Leaderboard Snippet
  const filteredLeaderboard = leaderboardData.filter(player => player.gamesPlayed >= minGamesPlayed);
  // Sorting is now done by the RPC, but we slice here
  const top3Leaderboard = filteredLeaderboard.slice(0, 3); // Assumes RPC returns sorted data

  // Helper for Duo Win/Loss display
  const getDuoWinLoss = (stats: ClientDuoStat | null): string => {
      if (!stats || stats.gamesTogether === 0) return 'N/A';
      const losses = stats.gamesTogether - stats.winsTogether;
      // Basic validation for losses
      const displayLosses = losses >= 0 ? losses : '?';
      return `${stats.winsTogether}W - ${displayLosses}L`;
  };

  // --- JSX Rendering ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header and Player Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <div className="flex items-center space-x-2">
           <label htmlFor="player-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Stats for:</label>
           <select
                id="player-select"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={isLoading || availablePlayers.length === 0}
            >
               <option value="">-- Select Player --</option>
               {/* Use availablePlayers prop */}
               {availablePlayers.map(player => (
                   <option key={player.id} value={player.id.toString()}>{player.name}</option>
               ))}
            </select>
           {isLoading && <Loader2 className="h-5 w-5 animate-spin text-gray-500" />}
        </div>
      </div>

       {/* Error Display (Show server OR client error) */}
       {error && (
            <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-600" role="alert">
                <span className="font-medium flex items-center"> <AlertCircle className="w-4 h-4 mr-2"/> Error:</span> {error}
            </div>
       )}

      {/* Top Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8"> {/* Changed lg:grid-cols-4 to lg:grid-cols-3 */}
        <StatCard title="Games Played" value={isLoading ? '...' : displayStats.gamesPlayed} icon={Swords} description={selectedPlayerId ? `Selected player's matches` : "Select player"}/>
        <StatCard title="Record (W/D/L)" value={isLoading ? '...' : displayStats.winLossStr} icon={Trophy} description={selectedPlayerId ? "Selected player's results" : "Select player"}/>
        <StatCard title="Win Rate" value={isLoading ? '...' : displayStats.winRateDisplay} icon={Percent} description="Wins / (Wins + Losses)"/>
      </div>

      {/* --- Widgets Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Widget 1: Top 3 Leaderboard Snippet */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center whitespace-nowrap"><Trophy className="w-5 h-5 mr-2 text-yellow-500"/> Top 3 Players</h2>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <label htmlFor="min-games-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">Min:</label>
                    <input type="number" id="min-games-filter" min="0" value={minGamesPlayed} onChange={(e) => setMinGamesPlayed(Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-16 px-2 py-1 text-xs border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
            </div>
            <div className="overflow-x-auto">
                {/* Use filteredLeaderboard */}
                {filteredLeaderboard.length === 0 ? (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No players meet filter.</p>
                ) : (
                    <table className="min-w-full">
                        <thead className="sr-only"><tr><th>Rank</th><th>Player</th><th>Win Rate</th><th>Games</th></tr></thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {/* Use top3Leaderboard */}
                            {top3Leaderboard.map((playerStat, index) => (
                                <tr key={playerStat.playerId} className={`text-sm ${playerStat.playerId.toString() === selectedPlayerId ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                                    <td className="px-2 py-2 text-center text-gray-500 dark:text-gray-400 w-10">{index + 1}.</td>
                                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white truncate">{playerStat.playerName}</td>
                                    {/* Use formatter for winRate */}
                                    <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400 font-semibold w-16">{formatWinRate(playerStat.winRate)}</td>
                                    <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 w-20">({playerStat.gamesPlayed} Gms)</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="text-right mt-2"><Link href="/leaderboard" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View Full Leaderboard</Link></div>
        </div>

        {/* Widget 2: Best Chemistry Duo */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
           <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center"><LinkIcon className="w-5 h-5 mr-2 text-purple-500"/> Top Duo Chemistry</h2>
           {/* Use bestDuo prop */}
           {bestDuo ? (
               <div className="space-y-1">
                   <p className="text-md font-medium text-gray-900 dark:text-white">{bestDuo.player1Name} & {bestDuo.player2Name}</p>
                   <p className="text-sm text-gray-600 dark:text-gray-400">Win Rate: <span className="font-semibold text-blue-600 dark:text-blue-400">{bestDuo.winRateDisplay}</span></p>
                   <p className="text-sm text-gray-600 dark:text-gray-400">Record Together: <span className="font-medium text-gray-700 dark:text-gray-300">{getDuoWinLoss(bestDuo)}</span> ({bestDuo.gamesTogether} games)</p>
                   <p className="text-xs text-gray-400 dark:text-gray-500">(Min. 5 games)</p>
               </div>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Not enough duo data.</p>
            )}
            <div className="text-right mt-2"><Link href="/chemistry" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View All Duos</Link></div>
        </div>

        {/* Widget 3: Last Match */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-green-500"/> Last Match Played</h2>
            {/* Use lastMatch prop */}
            {lastMatch ? (
                <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date: {lastMatch.match_date}</p>
                    <p className="text-lg font-bold text-center text-gray-800 dark:text-white my-1">{lastMatch.score_a} - {lastMatch.score_b}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <p><span className="font-medium text-blue-600 dark:text-blue-400">A:</span> {lastMatch.teamANames.join(', ')}</p>
                        <p><span className="font-medium text-red-600 dark:text-red-400">B:</span> {lastMatch.teamBNames.join(', ')}</p>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No matches recorded.</p>
            )}
             <div className="text-right mt-2"><Link href="/matches" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View All Matches</Link></div>
        </div>
      </div>
    </div>
  );
}

