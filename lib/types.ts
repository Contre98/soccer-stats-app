// lib/types.ts (or your shared types file location)

// Define the basic Player structure
export interface PlayerInfo {
  id: number;
  name: string;
  manual_rating: number | null;
}

// Define the structure for the match_players join table data
export interface MatchPlayerInfo {
  team: string; // 'A' or 'B'
  players: PlayerInfo | null; // Represents the single joined 'players' record (or null)
}

// Define the structure for a Match, including the nested match_players
export interface MatchWithPlayers {
  id: number;
  match_date: string;
  score_a: number;
  score_b: number;
  replay_url?: string | null;
  user_id: string;
  created_at: string;
  match_players: MatchPlayerInfo[]; // Array of player entries for the match
}

// Define the type for searchParams passed to page components
export interface MatchesPageSearchParams {
  [key: string]: string | string[] | undefined;
  myParam?: string;
  myOtherParam?: string | string[];
}

// --- UPDATED TYPE DEFINITIONS ---

// Updated Leaderboard Data Structure
export interface LeaderboardEntry {
  playerId: number; // Correctly defined, ensure usage matches this casing
  playerName: string;
  rank?: number;
  score: number;
  // Added fields based on errors:
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number; // Assuming this is a number (e.g., 0.0 to 1.0)
  // Add any other relevant leaderboard fields
}
export type LeaderboardData = LeaderboardEntry[];

// Updated Client-side Duo Statistics Structure
export interface ClientDuoStat {
  player1Id: number;
  player2Id: number;
  player1Name?: string;
  player2Name?: string;
  gamesPlayed: number; // Original field
  winRate: number;     // Original field (e.g., 0.0 to 1.0)
  // Added fields based on errors:
  gamesTogether: number;
  winsTogether: number;
  winRateDisplay?: string; // Example: Assuming this is a formatted string like "55%"
  // Add other relevant duo statistics
}

// Updated Last Match Data Structure
export interface LastMatchData {
  id: number;
  match_date: string;
  score_a: number;
  score_b: number;
  replay_url?: string | null;
  teamAPlayers: string[]; // Original field
  teamBPlayers: string[]; // Original field
  // Added fields based on errors (assuming they are arrays of names):
  teamANames: string[];
  teamBNames: string[];
  // Add other relevant fields for displaying the last match summary
}


// Add any other shared types your application uses
