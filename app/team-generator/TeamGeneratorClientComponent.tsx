// app/team-generator/TeamGeneratorClientComponent.tsx
'use client';

import { useState } from 'react';
// Assuming all these icons are actually used somewhere in the full JSX
import { Users, Shuffle, ShieldCheck, Star, Trophy, Loader2, CheckSquare, Square, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addMatchWithPlayers } from '@/lib/actions/matchActions';
// Ensure SaveGeneratedMatchModal is correctly imported
import SaveGeneratedMatchModal, { SaveGeneratedMatchData } from './SaveGeneratedMatchModal';


// Player type
interface Player { id: number; name: string; manual_rating: number; }
// Props
interface TeamGeneratorClientProps { availablePlayers: Player[]; }
// Type for a generated team option result
interface TeamOption { teamA: Player[]; teamB: Player[]; diff: number; sumA: number; sumB: number; }
// Define available team sizes
type TeamSize = 5 | 6 | 8 | 11;
const teamSizes: TeamSize[] = [5, 6, 8, 11];

// Helper function to create a unique key for a team combination
const getCombinationKey = (teamA: Player[], teamB: Player[]): string => {
    const teamAIds = teamA.map(p => p.id).sort().join(',');
    const teamBIds = teamB.map(p => p.id).sort().join(',');
    return [teamAIds, teamBIds].sort().join('|');
};

// Helper function to generate combinations
// NOTE: Removed unused yieldedCount1 and yieldedCount2 variables and their increments
function* getCombinations<T>(array: T[], k: number): Generator<T[]> {
    if (k < 0 || k > array.length) { return; }
    if (k === 0) { yield []; return; }
    if (k === array.length) { yield [...array]; return; }

    const firstElement = array[0];
    const restOfArray = array.slice(1);

    // Combinations including the first element
    for (const combo of getCombinations(restOfArray, k - 1)) {
        yield [firstElement, ...combo];
        // Removed yieldedCount1++;
    }

    // Combinations *not* including the first element
    if (restOfArray.length >= k) {
        for (const combo of getCombinations(restOfArray, k)) {
             yield combo;
             // Removed yieldedCount2++;
        }
    }
}


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
    const k = selectedTeamSize; const n = k * 2;
    if (selectedPlayerIds.size !== n) { alert(`Please select exactly ${n} players...`); return; }
    if (k >= 8) console.warn(`Generating combinations for ${k}v${k} might take some time...`);

    setIsLoading(true); resetGeneratedTeams();
    console.log("Starting team generation..."); // DEBUG

    // Use setTimeout to allow UI to update with loading state
    setTimeout(() => {
        try { // Add try block for safety during complex calculation
            const selectedPlayers = availablePlayers.filter(p => selectedPlayerIds.has(p.id));
            const results: TeamOption[] = [];
            const seenKeys = new Set<string>();
            let combinationCounter = 0;

            // 1. Generate all combinations for Team A
            console.log(`Generating combinations of ${k} from ${selectedPlayers.length} players...`); // DEBUG
            for (const teamA of getCombinations(selectedPlayers, k)) {
                combinationCounter++;
                if(combinationCounter % 50 === 0) console.log(`Processed ${combinationCounter} combinations...`); // DEBUG progress

                // 2. Find complementary Team B
                const teamAIds = new Set(teamA.map(p => p.id));
                const teamB = selectedPlayers.filter(p => !teamAIds.has(p.id));

                if (teamB.length !== k) { console.error("Logic error: Team B size mismatch", teamA, teamB); continue; }

                // 3. Calculate sums and diff
                const sumA = teamA.reduce((sum, p) => sum + p.manual_rating, 0);
                const sumB = teamB.reduce((sum, p) => sum + p.manual_rating, 0);
                const diff = Math.abs(sumA - sumB);

                // 4. Check for duplicates (A vs B == B vs A) and store
                const key = getCombinationKey(teamA, teamB);
                if (!seenKeys.has(key)) {
                    results.push({ teamA, teamB, diff, sumA, sumB });
                    seenKeys.add(key);
                }
            }
            console.log(`Finished processing combinations. Total processed: ${combinationCounter}`); // DEBUG
            console.log(`Found ${results.length} unique team pairings.`); // DEBUG

            // 5. Sort results by rating difference (best first)
            results.sort((a, b) => a.diff - b.diff);
            console.log("Sorted Results (showing first few):", results.slice(0, 5)); // DEBUG

            // 6. Get the top 3 options
            const topOptions = results.slice(0, 3);
            console.log("Top 3 Options selected:", topOptions); // DEBUG

            // 7. Update state
            setGeneratedOptions(topOptions);
            setTeamsGenerated(true);

        } catch (error) {
            console.error("Error during team generation:", error);
            alert("An error occurred while generating teams.");
            setTeamsGenerated(false); // Ensure UI resets
            setGeneratedOptions([]);
        } finally {
            setIsLoading(false); // Stop loading indicator
        }
    }, 10); // Small delay for UI update
  };

  // Handlers for Saving Generated Match (Unchanged)
  const handleOpenSaveModal = (option: TeamOption) => { setOptionToSave(option); setIsSaveModalOpen(true); };
  const handleCloseSaveModal = () => { setIsSaveModalOpen(false); setOptionToSave(null); };
  const handleSaveGeneratedMatch = async (saveData: SaveGeneratedMatchData) => {
      if (!optionToSave) throw new Error("No option selected."); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Not authenticated.");
      const matchInsertData = { ...saveData, user_id: user.id }; const teamAPlayerIds = optionToSave.teamA.map(p => p.id); const teamBPlayerIds = optionToSave.teamB.map(p => p.id);
      try { const savedMatch = await addMatchWithPlayers(supabase, matchInsertData, teamAPlayerIds, teamBPlayerIds); console.log("Generated match saved:", savedMatch); alert("Generated match saved!"); }
      catch (error) { console.error("Failed to save generated match:", error); alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`); throw error; }
  };

  const totalSelected = selectedPlayerIds.size;
  const requiredPlayers = selectedTeamSize * 2;

  // --- JSX Rendering ---
  // NOTE: Fixed unescaped quotes in placeholder text below (around line 170 in original log)
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Team Generator</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Player Selection */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center"><Users className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" /> Select Players</h2>
                <div className="flex space-x-2">
                    <button onClick={handleSelectAll} className="p-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50" title="Select All" disabled={availablePlayers.length === 0 || isLoading}><CheckSquare className="w-4 h-4"/></button>
                    <button onClick={handleDeselectAll} className="p-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50" title="Deselect All" disabled={selectedPlayerIds.size === 0 || isLoading}><Square className="w-4 h-4"/></button>
                </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {availablePlayers.length === 0 && (<p className="text-sm text-gray-500 dark:text-gray-400">No players found...</p>)}
                {availablePlayers.map((player) => (
                    <label key={player.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition duration-150 ease-in-out">
                        <input type="checkbox" checked={selectedPlayerIds.has(player.id)} onChange={() => handlePlayerSelectionChange(player.id)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"/>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{player.name}</span>
                        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 flex items-center"><Star className="w-3 h-3 mr-1 text-yellow-400" /> {player.manual_rating}</span>
                    </label>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className={`text-sm font-medium ${totalSelected === requiredPlayers ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Selected: {totalSelected} / {requiredPlayers}</p>
            </div>
        </div>
        {/* Column 2: Options & Generated Teams */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Select Format</h2>
              <div className="flex flex-wrap gap-3">
                  {teamSizes.map((size) => (
                      <button key={size} onClick={() => handleTeamSizeChange(size)} className={`px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 ${ selectedTeamSize === size ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600' }`}>{size}v{size}</button>
                  ))}
              </div>
          </div>
          <button onClick={handleGenerateTeams} disabled={isLoading || totalSelected !== requiredPlayers} className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Shuffle className="w-5 h-5 mr-2" />}
              {isLoading ? 'Generating...' : 'Generate Teams'}
          </button>
          {/* Generated Teams Display */}
          {teamsGenerated && generatedOptions.length > 0 && (
             <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Top {generatedOptions.length} Balanced Option{generatedOptions.length === 1 ? '' : 's'} Found</h2>
                {generatedOptions.map((option, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                                {index === 0 ? <Trophy className="w-5 h-5 mr-2 inline text-yellow-500"/> : <span className="mr-2 font-bold">{index + 1}.</span>}
                                Option {index + 1} {index === 0 ? '(Best Balance)' : ''}
                            </h3>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Rating Diff: {option.diff}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="border border-blue-200 dark:border-blue-700 rounded p-3">
                                <h4 className="text-md font-semibold mb-2 text-blue-700 dark:text-blue-400 flex items-center justify-between">
                                    <span><ShieldCheck className="w-4 h-4 mr-1 inline"/> Team A</span>
                                    <span className="text-xs font-mono">Σ {option.sumA}</span>
                                </h4>
                                <ul className="space-y-1">
                                    {option.teamA.map(player => (
                                        <li key={player.id} className="text-sm text-gray-800 dark:text-gray-200 flex justify-between items-center">
                                            <span>{player.name}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center"><Star className="w-3 h-3 mr-1 text-yellow-400" /> {player.manual_rating}</span>
                                        </li>
                                    ))}
                                </ul>
                             </div>
                             <div className="border border-red-200 dark:border-red-700 rounded p-3">
                                <h4 className="text-md font-semibold mb-2 text-red-700 dark:text-red-400 flex items-center justify-between">
                                     <span><ShieldCheck className="w-4 h-4 mr-1 inline"/> Team B</span>
                                     <span className="text-xs font-mono">Σ {option.sumB}</span>
                                </h4>
                                <ul className="space-y-1">
                                     {option.teamB.map(player => (
                                         <li key={player.id} className="text-sm text-gray-800 dark:text-gray-200 flex justify-between items-center">
                                             <span>{player.name}</span>
                                             <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center"><Star className="w-3 h-3 mr-1 text-yellow-400" /> {player.manual_rating}</span>
                                         </li>
                                     ))}
                                </ul>
                             </div>
                        </div>
                        <div className="mt-4 text-right">
                             <button
                                onClick={() => handleOpenSaveModal(option)}
                                className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded shadow hover:bg-gray-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 disabled:opacity-50"
                                disabled={isLoading}
                             >
                                <Save className="w-4 h-4 mr-1.5" />Save Option {index + 1} as Match
                             </button>
                        </div>
                    </div>
                ))}
             </div>
          )}
           {/* Placeholders */}
           {!teamsGenerated && !isLoading && (
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-center">
               {/* Fixed unescaped quote */}
               <p className="text-gray-500 dark:text-gray-400">Select {requiredPlayers} players and click &quot;Generate Teams&quot;...</p>
             </div>
           )}
           {teamsGenerated && generatedOptions.length === 0 && (
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-center">
               <p className="text-red-500 dark:text-red-400">Could not generate any unique balanced teams with this selection.</p>
             </div>
           )}
           {isLoading && (
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-center">
               <div className="flex justify-center items-center">
                 <Loader2 className="w-6 h-6 mr-2 animate-spin"/> <span className="text-gray-600 dark:text-gray-400">Generating...</span>
               </div>
             </div>
           )}
        </div>
      </div>

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
