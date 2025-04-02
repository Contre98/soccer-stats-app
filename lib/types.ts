// lib/types.ts (or your shared types file location)

// Define the basic Player structure
export interface PlayerInfo {
  id: number;
  name: string;
}

// Define the structure for the match_players join table data
// Crucially, 'players' refers to the single related player record.
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

// You can also add the search params type here if used elsewhere
export interface MatchesPageSearchParams {
  [key: string]: string | string[] | undefined;
  myParam?: string;
  myOtherParam?: string | string[];
}

// Add any other shared types your application uses
