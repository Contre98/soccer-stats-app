// lib/types.ts

// Player definition used across components
export interface Player {
    id: number;
    name: string;
    manual_rating: number | null; // Allows for null ratings
  }
  
  // Corrected LeaderboardData definition matching RPC output
  export interface LeaderboardData {
    playerId: number; // Matches bigint from SQL (TS number handles it)
    playerName: string;
    gamesPlayed: number; // Matches bigint from SQL
    wins: number;       // Matches bigint from SQL
    losses: number;     // Matches bigint from SQL
    draws: number;      // Matches bigint from SQL
    winRate: number | null; // Matches numeric from SQL
  }
  
  // Type for the Best Duo data passed to the client component
  export interface ClientDuoStat {
    player1Name: string;
    player2Name: string;
    gamesTogether: number;
    winsTogether: number;
    winRateDisplay: string; // Formatted string for display
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
  
  // You can add other shared types here as your application grows
  
  