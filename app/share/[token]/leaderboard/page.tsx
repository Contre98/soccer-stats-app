// app/share/[token]/leaderboard/page.tsx (Server Component)
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin'; // Assuming admin client setup is correct

// Define LeaderboardData type locally or import if defined elsewhere
interface LeaderboardData {
  playerId: number;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | string;
  winRateDisplay: string;
  streak: number;
}

// Define a specific type alias for this page's props WITHIN this file
type PageProps = {
  params: { token: string };
};

// Use the locally defined PageProps type here
export default async function ShareLeaderboardPage({ params }: PageProps) {
  const shareToken = params.token;
  // Basic validation - consider more robust validation if needed
  if (!shareToken || typeof shareToken !== 'string') {
    console.error("Share leaderboard: Invalid or missing token format.");
    notFound();
  }

  // --- 1. Validate Token & Get User ID ---
  let userId: string;
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('share_token', shareToken)
      .single(); // Use single() to expect one or zero rows

    if (profileError) {
        // Log different errors, e.g., PgrstError RLS violation vs. actual DB error
        console.error("Share leaderboard: Error fetching profile by token:", profileError.message);
        if (profileError.code === 'PGRST116') { // Code for "JSON object requested, multiple (or no) rows returned"
             console.warn(`Share token "${shareToken}" not found or not unique.`);
        }
        notFound(); // Treat profile fetch errors as "not found" for security
    }

    if (!profile) {
      console.warn(`Share token "${shareToken}" did not match any profile.`);
      notFound();
    }
    userId = profile.id;
    console.log(`Share leaderboard: Valid token found for user ID: ${userId}`); // Debug log

  } catch (err) {
      console.error("Share leaderboard: Unexpected error validating token:", err);
      notFound(); // Treat unexpected errors as "not found"
  }


  // --- 2. Fetch Data for Leaderboard using Admin Client ---
  const leaderboardData: LeaderboardData[] = [];
  let fetchError: string | null = null;

  try {
      // Fetch players, matches, matchPlayers... (same fetch logic as share dashboard)
      // Use Promise.all for concurrent fetching
      const [playerRes, matchRes, matchPlayerRes] = await Promise.all([
          supabaseAdmin.from('players').select('id, name').eq('user_id', userId).order('name', { ascending: true }),
          supabaseAdmin.from('matches').select('id, match_date, score_a, score_b').eq('user_id', userId).order('match_date', { ascending: false }),
          supabaseAdmin.from('match_players').select('match_id, player_id, team').eq('user_id', userId)
      ]);

      // Centralized error check after Promise.all
      if (playerRes.error) throw new Error(`Failed to fetch players: ${playerRes.error.message}`);
      if (matchRes.error) throw new Error(`Failed to fetch matches: ${matchRes.error.message}`);
      if (matchPlayerRes.error) throw new Error(`Failed to fetch match players: ${matchPlayerRes.error.message}`);

      // Ensure data is not null before proceeding
      const availablePlayers = playerRes.data ?? [];
      const matchesData = matchRes.data ?? [];
      const matchPlayersData = matchPlayerRes.data ?? [];

      // --- 3. Calculate Stats ---
      if (availablePlayers.length > 0 && matchesData.length > 0) {
          const matchResultsMap = new Map<number, { score_a: number; score_b: number; match_date: string }>();
          matchesData.forEach(m => matchResultsMap.set(m.id, { score_a: m.score_a, score_b: m.score_b, match_date: m.match_date }));

          for (const player of availablePlayers) {
            let gp = 0, w = 0, l = 0, d = 0, streak = 0;
            const playerParticipation: { match_id: number; team: 'A' | 'B'; match_date: string }[] = [];

            matchPlayersData.forEach(mp => {
                // Ensure mp and mp.match_id are valid before accessing map
                if (mp && mp.player_id === player.id && mp.match_id != null) {
                    const matchInfo = matchResultsMap.get(mp.match_id);
                    if (matchInfo && mp.team) { // Ensure team is also defined
                        playerParticipation.push({
                            match_id: mp.match_id,
                            team: mp.team, // Asserting team is 'A' or 'B' if DB guarantees it
                            match_date: matchInfo.match_date
                        });
                    }
                }
            });

            gp = playerParticipation.length;
            // Sort by date descending
            playerParticipation.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

            let currentStreak = 0;
            let streakEnded = false;

            for (const participation of playerParticipation) {
                const matchResult = matchResultsMap.get(participation.match_id);
                if (matchResult) {
                    const playerTeam = participation.team;
                    const scoreA = matchResult.score_a;
                    const scoreB = matchResult.score_b;
                    let wonMatch = false;

                    if ((playerTeam === 'A' && scoreA > scoreB) || (playerTeam === 'B' && scoreB > scoreA)) {
                        w++;
                        wonMatch = true;
                    } else if ((playerTeam === 'A' && scoreB > scoreA) || (playerTeam === 'B' && scoreA > scoreB)) {
                        l++;
                    } else {
                        d++;
                    }

                    // Calculate streak based on *chronological* order (most recent first)
                    if (!streakEnded) {
                        if (wonMatch) {
                            currentStreak++;
                        } else {
                            streakEnded = true; // Stop counting streak once a non-win occurs
                        }
                    }
                }
            }
            streak = currentStreak; // Assign the calculated streak

            const decided = w + l;
            let wr: number | string = 'N/A';
            let wrd = 'N/A'; // winRateDisplay

            if (decided > 0) {
                wr = parseFloat(((w / decided) * 100).toFixed(1));
                wrd = `${wr}%`;
            } else if (gp > 0 && w > 0) { // Handle case of only draws/wins but no losses
                wr = 100.0;
                wrd = '100.0%';
            }

            leaderboardData.push({
                playerId: player.id,
                playerName: player.name,
                gamesPlayed: gp,
                wins: w,
                losses: l,
                draws: d,
                winRate: wr,
                winRateDisplay: wrd, // Use the calculated display string
                streak: streak // Use the calculated streak
            });
          }
          // Default sort by Win Rate (descending), handle 'N/A'
          leaderboardData.sort((a, b) => {
              const rateA = a.winRate === 'N/A' ? -1 : Number(a.winRate); // Treat N/A as lowest
              const rateB = b.winRate === 'N/A' ? -1 : Number(b.winRate);
              if (rateB !== rateA) {
                  return rateB - rateA; // Sort by win rate descending
              }
              // Secondary sort by games played (descending) if win rates are equal
              return b.gamesPlayed - a.gamesPlayed;
          });
      }
  } catch (err) {
      console.error("Error fetching/processing shared leaderboard:", err);
      fetchError = err instanceof Error ? err.message : "Could not load shared leaderboard.";
  }

  // --- 4. Render Read-Only Leaderboard Table ---
  // Note: Sorting controls are removed as this is a read-only server component view
  return (
    <div>
        {/* Display Fetch Error */}
        {fetchError && (
            <div className="mb-4 p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700">
                Error: {fetchError}
            </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">#</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Player</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Played</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Wins</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Win Rate</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Streak</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Handle loading state or empty data */}
              {leaderboardData.length === 0 && !fetchError ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No player data available for this shared link.</td></tr>
              ) : (
                leaderboardData.map((playerStat, index) => (
                  <tr key={playerStat.playerId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{playerStat.playerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">{playerStat.gamesPlayed}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 dark:text-green-400 text-center">{playerStat.wins}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 text-center font-semibold">{playerStat.winRateDisplay}</td>
                    {/* Display streak correctly */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                        {playerStat.streak > 0 ? `W${playerStat.streak}` : (playerStat.gamesPlayed > 0 ? 'L/D' : '-')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}
