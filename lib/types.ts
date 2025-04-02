// lib/types.ts

// Player definition used across components
export interface Player {
  id: number;
  name: string;
  manual_rating: number | null;
}

// Corrected LeaderboardData definition matching RPC output
export interface LeaderboardData {
  playerId: number;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null;
}

// Type for the Best Duo data passed to the client component
export interface ClientDuoStat {
  player1Name: string;
  player2Name: string;
  gamesTogether: number;
  winsTogether: number;
  winRateDisplay: string;
}

// Type for the Last Match data passed to the client component
export interface LastMatchData {
  id: number;
  match_date: string;
  score_a: number;
  score_b: number;
  teamANames: string[];
  teamBNames: string[];
}

// --- NEW: Types for Matches Page ---

// Basic player info used within Match types
export interface PlayerInfo {
  id: number;
  name: string;
}

// Represents a player linked to a match
export interface MatchPlayerInfo {
  team: string;
  // Represents the nested 'players' relation, returned as array by Supabase select
  players: PlayerInfo[] | null;
}

// Represents a match including its players
export interface MatchWithPlayers {
  id: number;
  match_date: string;
  score_a: number;
  score_b: number;
  replay_url?: string | null;
  user_id: string; // Assuming user_id is needed/present
  created_at: string; // Assuming created_at is needed/present
  match_players: MatchPlayerInfo[];
}

// --- END NEW Types ---

