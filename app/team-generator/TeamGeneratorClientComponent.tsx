// app/team-generator/TeamGeneratorClientComponent.tsx
'use client';

import { useState } from 'react';
import { Users, Shuffle, ShieldCheck, Star, Trophy, Loader2, CheckSquare, Square, Save, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { createClient } from '@/lib/supabase/client';
import { addMatchWithPlayers } from '@/lib/actions/matchActions';
import SaveGeneratedMatchModal, { SaveGeneratedMatchData } from './SaveGeneratedMatchModal';


// Player type - ensure manual_rating can potentially be null if that's possible in DB
interface Player { id: number; name: string; manual_rating: number | null; } // Adjusted type
// Props
interface TeamGeneratorClientProps { availablePlayers: Player[]; }
// Type for a generated team option result
interface TeamOption { teamA: Player[]; teamB: Player[]; diff: number; sumA: number; sumB: number; }
// Define available team sizes
type TeamSize = 5 | 6 | 8 | 11;
const teamSizes: TeamSize[] = [5, 6, 8, 11];

// Helper function to create a unique key for a team combination
const getCombinationKey = (teamA: Player[], teamB: Player[]): string => {
    // Sort IDs within each team, then sort team strings to make key consistent
    const teamAIds = teamA.map(p => p.id).sort((a, b) => a - b).join(',');
    const teamBIds = teamB.map(p => p.id).sort((a, b) => a - b).join(',');
    return [teamAIds, teamBIds].sort().join('|');
};

// --- CORRECTED and COMPLETE getCombinations function ---
/**
 * Generates combinations of k elements from an array.
 * @param array The array to generate combinations from.
 * * @param k The size of each combination.
 * @returns A generator yielding combinations.
 */
function* getCombinations<T>(array: T[], k: number): Generator<T[]> {
    const n = array.length;
    if (k < 0 || k > n) {
        return; // Invalid input
    }
    if (k === 0) {
        yield []; // Base case: combination of size 0 is an empty array
        return;
    }
    if (k === n) {
        yield [...array]; // Base case: combination of size n is the array itself
        return;
    }
    if (k > n / 2) {
        // Optimization: C(n, k) = C(n, n-k). Generate combinations of items *not* to include.
        const kComplement = n - k;
        const indicesToExclude = new Set<number>();
        const generator = getCombinationsIndices(n, kComplement);
        for (const excludedIndices of generator) {
            indicesToExclude.clear();
            excludedIndices.forEach(idx => indicesToExclude.add(idx));
            const combination: T[] = [];
            for (let i = 0; i < n; i++) {
                if (!indicesToExclude.has(i)) {
                    combination.push(array[i]);
                }
            }
            yield combination;
        }
        return;
    }

    // Standard recursive approach using indices
    const indicesGenerator = getCombinationsIndices(n, k);
    for (const indices of indicesGenerator) {
        yield indices.map(index => array[index]);
    }
}

// Helper for getCombinations using indices
function* getCombinationsIndices(n: number, k: number): Generator<number[]> {
    const indices: number[] = Array.from({ length: k }, (_, i) => i);
    yield [...indices]; // Yield the initial combination

    while (true) {
        let i = k - 1;
        // Find the rightmost index that can be incremented
        while (i >= 0 && indices[i] === i + n - k) {
            i--;
        }

        if (i < 0) {
            // All combinations generated
            return;
        }

        // Increment the found index
        indices[i]++;

        // Update subsequent indices
        for (let j = i + 1; j < k; j++) {
            indices[j] = indices[j - 1] + 1;
        }

        yield [...indices]; // Yield the new combination
    }
}
// --- END of getCombinations function ---


export default function TeamGeneratorClientComponent({ availablePlayers }: TeamGeneratorClientProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
  const [selectedTeamSize, setSelectedTeamSize] = useState<TeamSize>(5);
  const [generatedOptions, setGeneratedOptions] = useState<TeamOption[]>([]);
  const [teamsGenerated, setTeamsGenerated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [optionToSave, setOptionToSave] = useState<TeamOption | null>(null);
  const supabase = createClient();

  const resetGeneratedTeams = () => { setTeamsGenerated(false); setGeneratedOptions([]); }
  const handlePlayerSelectionChange = (playerId: number) => { setSelectedPlayerIds(prev => { const n = new Set(prev); if (n.has(playerId)) { n.delete(playerId); } else { n.add(playerId); } return n; }); resetGeneratedTeams(); };
  const handleTeamSizeChange = (size: TeamSize) => { setSelectedTeamSize(size); resetGeneratedTeams(); };
  const handleSelectAll = () => { setSelectedPlayerIds(new Set(availablePlayers.map(p=>p.id))); resetGeneratedTeams(); };
  const handleDeselectAll = () => { setSelectedPlayerIds(new Set()); resetGeneratedTeams(); };

  // --- Team Generation using Combinations ---
  const handleGenerateTeams = () => {
    const k = selectedTeamSize;
    const n = k * 2;

    if (selectedPlayerIds.size !== n) {
      alert(`Please select exactly ${n} players for ${k}v${k} format.`);
      return;
    }

    // --- **ADDED: Validate Player Ratings** ---
    const selectedPlayers = availablePlayers.filter(p => selectedPlayerIds.has(p.id));
    const playersWithInvalidRatings = selectedPlayers.filter(p =>
        p.manual_rating === null || typeof p.manual_rating !== 'number' || isNaN(p.manual_rating)
    );

    if (playersWithInvalidRatings.length > 0) {
        const playerNames = playersWithInvalidRatings.map(p => p.name).join(', ');
        alert(`Cannot generate teams. The following selected players have missing or invalid ratings: ${playerNames}`);
        return;
    }
    // --- End Validation ---

    if (k >= 8) console.warn(`Generating combinations for ${k}v${k} might take some time...`);

    setIsLoading(true);
    resetGeneratedTeams();
    console.log("Starting team generation...");

    // Use setTimeout to allow UI to update with loading state
    setTimeout(() => {
        try {
            const results: TeamOption[] = [];
            const seenKeys = new Set<string>();
            let combinationCounter = 0;
            const MAX_COMBINATIONS_TO_PROCESS = 50000; // Safety break for very large numbers

            console.log(`Generating combinations of ${k} from ${selectedPlayers.length} players...`);
            const combinationsGenerator = getCombinations(selectedPlayers, k);

            for (const teamA of combinationsGenerator) {
                combinationCounter++;
                // Safety break
                if (combinationCounter > MAX_COMBINATIONS_TO_PROCESS) {
                    console.warn(`Stopping generation after processing ${MAX_COMBINATIONS_TO_PROCESS} combinations.`);
                    alert(`Generation stopped after processing ${MAX_COMBINATIONS_TO_PROCESS} combinations to prevent performance issues. Try a smaller format.`);
                    break;
                }

                if(combinationCounter % 1000 === 0) console.log(`Processed ${combinationCounter} combinations...`); // Log progress less frequently

                const teamAIds = new Set(teamA.map(p => p.id));
                const teamB = selectedPlayers.filter(p => !teamAIds.has(p.id));

                if (teamB.length !== k) { console.error("Logic error: Team B size mismatch", teamA, teamB); continue; }

                // Calculate sums - **ADDED: Use || 0 for safety**
                const sumA = teamA.reduce((sum, p) => sum + (p.manual_rating || 0), 0);
                const sumB = teamB.reduce((sum, p) => sum + (p.manual_rating || 0), 0);
                const diff = Math.abs(sumA - sumB);

                const key = getCombinationKey(teamA, teamB);
                if (!seenKeys.has(key)) {
                    results.push({ teamA, teamB, diff, sumA, sumB });
                    seenKeys.add(key);
                }
            }
            console.log(`Finished processing combinations. Total processed: ${combinationCounter}`);
            console.log(`Found ${results.length} unique team pairings.`);

            results.sort((a, b) => a.diff - b.diff);
            console.log("Sorted Results (showing first few):", results.slice(0, 5));

            const topOptions = results.slice(0, 3);
            console.log("Top 3 Options selected:", topOptions);

            setGeneratedOptions(topOptions);
            setTeamsGenerated(true); // Set this regardless of whether options were found

        } catch (error) {
            console.error("Error during team generation:", error);
            alert("An error occurred while generating teams.");
            setTeamsGenerated(false); // Ensure UI resets
            setGeneratedOptions([]);
        } finally {
            setIsLoading(false);
        }
    }, 10);
  };

  // --- Handlers for Saving Generated Match (Unchanged) ---
  const handleOpenSaveModal = (option: TeamOption) => { setOptionToSave(option); setIsSaveModalOpen(true); };
  const handleCloseSaveModal = () => { setIsSaveModalOpen(false); setOptionToSave(null); };
  const handleSaveGeneratedMatch = async (saveData: SaveGeneratedMatchData) => {
      if (!optionToSave) throw new Error("No option selected.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      // Ensure ratings are numbers before proceeding (validation should prevent this, but double check)
      const matchInsertData = { ...saveData, user_id: user.id };
      const teamAPlayerIds = optionToSave.teamA.map(p => p.id);
      const teamBPlayerIds = optionToSave.teamB.map(p => p.id);

      try {
          const savedMatch = await addMatchWithPlayers(supabase, matchInsertData, teamAPlayerIds, teamBPlayerIds);
          console.log("Generated match saved:", savedMatch);
          alert("Generated match saved!");
      }
      catch (error) {
          console.error("Failed to save generated match:", error);
          alert(`Error saving generated match: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error; // Re-throw to prevent modal closing
      }
  };

  const totalSelected = selectedPlayerIds.size;
  const requiredPlayers = selectedTeamSize * 2;

  // --- JSX Rendering (Largely Unchanged) ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Title */}
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Team Generator</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Player Selection */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            {/* Header + Select/Deselect All */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center"><Users className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" /> Select Players</h2>
                <div className="flex space-x-2">
                    <button onClick={handleSelectAll} className="p-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50" title="Select All" disabled={availablePlayers.length === 0 || isLoading}>
                        <CheckSquare className="w-4 h-4"/>
                    </button>
                    <button onClick={handleDeselectAll} className="p-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50" title="Deselect All" disabled={selectedPlayerIds.size === 0 || isLoading}>
                        <Square className="w-4 h-4"/>
                    </button>
                </div>
            </div>
            {/* Player List */}
            <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {availablePlayers.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No players found...</p>
                )}
                {availablePlayers.map((player) => (
                    <label key={player.id} className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition duration-150 ease-in-out ${player.manual_rating === null ? 'opacity-60' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <input
                            type="checkbox"
                            checked={selectedPlayerIds.has(player.id)}
                            onChange={() => handlePlayerSelectionChange(player.id)}
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                            // Optionally disable players with null rating if they cannot be used
                            // disabled={player.manual_rating === null}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{player.name}</span>
                        <span className={`ml-auto text-xs flex items-center ${player.manual_rating === null ? 'text-red-500 dark:text-red-400 italic' : 'text-gray-500 dark:text-gray-400'}`}>
                            {player.manual_rating === null ? (
                                <AlertTriangle className="w-3 h-3 mr-1 text-red-400" />
                            ) : (
                                <Star className="w-3 h-3 mr-1 text-yellow-400" />
                            )}
                            {player.manual_rating ?? 'N/A'} {/* Show N/A if rating is null */}
                        </span>
                    </label>
                ))}
            </div>
            {/* Selection Counter */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className={`text-sm font-medium ${totalSelected === requiredPlayers ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>Selected: {totalSelected} / {requiredPlayers}</p>
                {totalSelected !== requiredPlayers && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">Please select exactly {requiredPlayers} players.</p>
                )}
            </div>
        </div>

        {/* Column 2: Options & Generated Teams */}
        <div className="md:col-span-2 space-y-6">
          {/* Team Size Selection */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Select Format</h2>
            <div className="flex flex-wrap gap-3">
                {teamSizes.map((size) => (
                    <button key={size} onClick={() => handleTeamSizeChange(size)} className={`px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 ${ selectedTeamSize === size ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600' }`}>
                        {size}v{size}
                    </button>
                ))}
            </div>
          </div>

          {/* Generate Button */}
          <button onClick={handleGenerateTeams} disabled={isLoading || totalSelected !== requiredPlayers} className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Shuffle className="w-5 h-5 mr-2" />}
            {isLoading ? 'Generating...' : 'Generate Teams'}
          </button>

          {/* Generated Teams Display Area */}
          <div className="space-y-6">
            {/* Loading State */}
            {isLoading && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-center">
                    <div className="flex justify-center items-center">
                        <Loader2 className="w-6 h-6 mr-2 animate-spin"/>
                        <span className="text-gray-600 dark:text-gray-400">Generating teams...</span>
                    </div>
                </div>
            )}

            {/* Placeholder before generation */}
            {!teamsGenerated && !isLoading && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Select {requiredPlayers} players and click &quot;Generate Teams&quot;.</p>
                </div>
            )}

            {/* Results Display */}
            {teamsGenerated && !isLoading && generatedOptions.length > 0 && (
                <>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Top {generatedOptions.length} Balanced Option{generatedOptions.length === 1 ? '' : 's'} Found</h2>
                    {generatedOptions.map((option, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                            {/* Option Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                                    {index === 0 ? <Trophy className="w-5 h-5 mr-2 inline text-yellow-500"/> : <span className="mr-2 font-bold">{index + 1}.</span>}
                                    Option {index + 1} {index === 0 ? '(Best Balance)' : ''}
                                </h3>
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Rating Diff: {option.diff}</span>
                            </div>
                            {/* Teams Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Team A */}
                                <div className="border border-blue-200 dark:border-blue-700 rounded p-3">
                                    <h4 className="text-md font-semibold mb-2 text-blue-700 dark:text-blue-400 flex items-center justify-between">
                                        <span><ShieldCheck className="w-4 h-4 mr-1 inline"/> Team A</span>
                                        <span className="text-xs font-mono">Σ {option.sumA}</span>
                                    </h4>
                                    <ul className="space-y-1">
                                        {option.teamA.map(player => (
                                            <li key={player.id} className="text-sm text-gray-800 dark:text-gray-200 flex justify-between items-center">
                                                <span>{player.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                                    <Star className="w-3 h-3 mr-1 text-yellow-400" /> {player.manual_rating ?? 'N/A'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Team B */}
                                <div className="border border-red-200 dark:border-red-700 rounded p-3">
                                    <h4 className="text-md font-semibold mb-2 text-red-700 dark:text-red-400 flex items-center justify-between">
                                        <span><ShieldCheck className="w-4 h-4 mr-1 inline"/> Team B</span>
                                        <span className="text-xs font-mono">Σ {option.sumB}</span>
                                    </h4>
                                    <ul className="space-y-1">
                                        {option.teamB.map(player => (
                                            <li key={player.id} className="text-sm text-gray-800 dark:text-gray-200 flex justify-between items-center">
                                                <span>{player.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                                    <Star className="w-3 h-3 mr-1 text-yellow-400" /> {player.manual_rating ?? 'N/A'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            {/* Save Button */}
                            <div className="mt-4 text-right">
                                <button
                                    onClick={() => handleOpenSaveModal(option)}
                                    className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded shadow hover:bg-gray-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 disabled:opacity-50"
                                    disabled={isLoading} // Disable while loading generally
                                >
                                    <Save className="w-4 h-4 mr-1.5" />Save Option {index + 1} as Match
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* Error Message Display (No balanced teams found) */}
            {teamsGenerated && !isLoading && generatedOptions.length === 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-red-200 dark:border-red-700 text-center">
                    <p className="text-red-500 dark:text-red-400 font-semibold">Could not generate any unique balanced teams with this selection.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Try selecting different players or check player ratings.</p>
                </div>
            )}
          </div> {/* End of results display area */}
        </div> {/* End of Column 2 */}
      </div> {/* End of Grid */}

      {/* Render SaveGeneratedMatchModal */}
      <SaveGeneratedMatchModal
          isOpen={isSaveModalOpen}
          onClose={handleCloseSaveModal}
          onSave={handleSaveGeneratedMatch}
          teamA={optionToSave?.teamA ?? []}
          teamB={optionToSave?.teamB ?? []}
      />
    </div>
  );
}

