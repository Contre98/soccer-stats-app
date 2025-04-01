// app/matches/MatchesClientComponent.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Link as LinkIcon, Loader2, PlusCircle, XCircle } from 'lucide-react'; // Added XCircle icon

// Types
interface Player { id: number; name: string; }
interface MatchWithPlayers {
    id: number; match_date: string; score_a: number; score_b: number; user_id: string;
    teamA_players: Player[]; teamB_players: Player[];
}
interface SavedMatchData { id: number; match_date: string; score_a: number; score_b: number; user_id: string; }

export default function MatchesClientComponent() {
    const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [newMatchDate, setNewMatchDate] = useState<string>('');
    const [newScoreA, setNewScoreA] = useState<number>(0);
    const [newScoreB, setNewScoreB] = useState<number>(0);
    const supabase = createClient();

    useEffect(() => {
        const fetchMatches = async () => {
            setIsLoading(true); setError(null);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("User not logged in");
                const { data: fetchedMatches, error: fetchError } = await supabase.from('matches').select('id, match_date, score_a, score_b, user_id, teamA_players:match_players!match_players_match_id_fkey(player_id, team), teamB_players:match_players!match_players_match_id_fkey(player_id, team)');
                if (fetchError) throw fetchError;
                if (!fetchedMatches) { setMatches([]); return; }
                setMatches(fetchedMatches as unknown as MatchWithPlayers[]);
            } catch (err) {
                console.error("Error fetching matches:", err);
                const message = err instanceof Error ? err.message : "Failed to fetch matches."; setError(message); setMatches([]);
            } finally { setIsLoading(false); }
        };
        fetchMatches();
    }, [supabase]); // Effect runs once on mount

    const handleSaveMatch = async () => {
        setIsSaving(true); setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not logged in");
            const { data: newMatch, error: saveError } = await supabase.from('matches').insert({ match_date: newMatchDate, score_a: newScoreA, score_b: newScoreB, user_id: user.id }).select('id').single();
            if (saveError) throw saveError;
            const newMatchId = newMatch.id;
            const newMatchBase: SavedMatchData = { id: newMatchId, match_date: newMatchDate, score_a: newScoreA, score_b: newScoreB, user_id: user.id };
            const { data: newlySavedMatchWithPlayers, error: fetchError } = await supabase.from('matches').select('id, match_date, score_a, score_b, user_id, teamA_players:match_players!match_players_match_id_fkey(player_id, team), teamB_players:match_players!match_players_match_id_fkey(player_id, team)').eq('id', newMatchId).single();
            if (fetchError || !newlySavedMatchWithPlayers) {
                console.error("Error fetching newly saved match details:", fetchError);
                // Create a MatchWithPlayers object with empty player arrays
                const fallbackMatch: MatchWithPlayers = {
                    ...newMatchBase,
                    teamA_players: [],
                    teamB_players: [],
                };
                setMatches(current => [fallbackMatch, ...current]); // Fallback
                alert("Match saved! Refresh may be needed to see player names.");
            } else {
                setMatches(current => [newlySavedMatchWithPlayers as unknown as MatchWithPlayers, ...current]);
            }
            setNewMatchDate(''); setNewScoreA(0); setNewScoreB(0); // Reset form
        } catch (err) {
            console.error("Error saving match:", err);
            const message = err instanceof Error ? err.message : "Failed to save match."; setError(message);
        } finally { setIsSaving(false); }
    };

    const handleDeleteMatch = async (matchId: number) => {
        setIsSaving(true); setError(null);
        try {
            const { error: deleteError } = await supabase.from('matches').delete().eq('id', matchId);
            if (deleteError) throw deleteError;
            setMatches(current => current.filter(match => match.id !== matchId)); // Remove from state
        } catch (err) {
            console.error("Error deleting match:", err);
            const message = err instanceof Error ? err.message : "Failed to delete match."; setError(message);
        } finally { setIsSaving(false); }
    };

    // --- JSX Rendering ---
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white flex items-center">
                <LinkIcon className="w-7 h-7 mr-3 text-purple-600" /> Matches
            </h1>

            {/* New Match Form */}
            <div className="mb-6 bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Add New Match</h2>
                <div className="grid grid-cols-3 gap-4">
                    {/* Date Input */}
                    <div className="col-span-1">
                        <label htmlFor="match-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                        <input type="date" id="match-date" value={newMatchDate} onChange={(e) => setNewMatchDate(e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    {/* Score A Input */}
                    <div className="col-span-1">
                        <label htmlFor="score-a" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Score A</label>
                        <input type="number" id="score-a" value={newScoreA} onChange={(e) => setNewScoreA(Number(e.target.value))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    {/* Score B Input */}
                    <div className="col-span-1">
                        <label htmlFor="score-b" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Score B</label>
                        <input type="number" id="score-b" value={newScoreB} onChange={(e) => setNewScoreB(Number(e.target.value))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                </div>
                {/* Save Button */}
                <div className="mt-4">
                    <button onClick={handleSaveMatch} disabled={isSaving} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                        Save Match
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (<div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /><span className="ml-3 text-gray-500 dark:text-gray-400">Loading matches...</span></div>)}
            {/* Error State */}
            {error && !isLoading && (<div className="mb-4 p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700">Error: {error}</div>)}

            {/* Matches Table */}
            {!isLoading && !error && matches.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Score</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Team A</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Team B</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Delete</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {matches.map(match => (
                                <tr key={match.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{match.match_date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{match.score_a} - {match.score_b}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{match.teamA_players.map(p => p.name).join(', ')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{match.teamB_players.map(p => p.name).join(', ')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleDeleteMatch(match.id)} disabled={isSaving} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                            <XCircle className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Message if no matches found */}
            {!isLoading && !error && matches.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400">No matches found. Add a new match!</div>
            )}
        </div>
    );
}
