// lib/types.ts (or your shared types file location)

// Define the basic Player structure
export interface PlayerInfo {
  id: number;
  name: string;
  manual_rating: number | null;
}

// Define the structure for the match_players join table data
export interface MatchPlayerInfo {
  player_id: number;
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

// Structure for data needed when saving a new match
export type MatchSaveData = {
    match_date: string;
    score_a: number;
    score_b: number;
    replay_url?: string | null;
    teamAPlayerIds: number[];
    teamBPlayerIds: number[];
};

// --- ADDED MatchUpdateData TYPE ---
// Structure for data needed when updating an existing match
export type MatchUpdateData = MatchSaveData & {
    matchId: number; // Include the ID of the match being updated
};


// --- Other Type Definitions ---

// Leaderboard Data Structure
export interface LeaderboardEntry {
  playerId: number;
  playerName: string;
  rank?: number;
  score: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
}
export type LeaderboardData = LeaderboardEntry[];

// Client-side Duo Statistics Structure
export interface ClientDuoStat {
  player1Id: number;
  player2Id: number;
  player1Name?: string;
  player2Name?: string;
  gamesPlayed: number;
  winRate: number;
  gamesTogether: number;
  winsTogether: number;
  winRateDisplay?: string;
}

// Last Match Data Structure
export interface LastMatchData {
  id: number;
  match_date: string;
  score_a: number;
  score_b: number;
  replay_url?: string | null;
  teamAPlayers: string[];
  teamBPlayers: string[];
  teamANames: string[];
  teamBNames: string[];
}

// Add any other shared types your application uses
