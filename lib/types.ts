// lib/types.ts (or your shared types file location)

// Define the basic Player structure
export interface PlayerInfo {
  id: number;
  name: string;
  manual_rating: number | null; // Added manual_rating (nullable number)
}

// Define the structure for the match_players join table data
export interface MatchPlayerInfo {
  player_id: number; // Added this field based on query and usage
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

// --- UPDATED TYPE DEFINITIONS --- // (Assuming these are still needed elsewhere)

// Updated Leaderboard Data Structure
export interface LeaderboardEntry {
  playerId: number;
  playerName: string;
  rank?: number;
  score: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number; // Assuming this is a number (e.g., 0.0 to 1.0 or 0-100)
}
export type LeaderboardData = LeaderboardEntry[];

// Updated Client-side Duo Statistics Structure
export interface ClientDuoStat {
  player1Id: number;
  player2Id: number;
  player1Name?: string;
  player2Name?: string;
  gamesPlayed: number;
  winRate: number; // e.g., 0.0 to 1.0 or 0-100
  gamesTogether: number;
  winsTogether: number;
  winRateDisplay?: string; // Example: Formatted string like "55%"
}

// Updated Last Match Data Structure
export interface LastMatchData {
  id: number;
  match_date: string;
  score_a: number;
  score_b: number;
  replay_url?: string | null;
  teamAPlayers: string[]; // Array of player names or IDs
  teamBPlayers: string[]; // Array of player names or IDs
  teamANames: string[];   // Array of player names
  teamBNames: string[];   // Array of player names
}

// Add any other shared types your application uses
