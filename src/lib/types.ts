export type Rating = 1 | 2 | 3 | 4 | 5;

export type PreferredPosition =
  | "goalkeeper"
  | "defense"
  | "midfielder"
  | "attacker"
  | "winger"
  | null;

export type Player = {
  id: string;
  name: string;
  age?: number;
  isGoalie: boolean;
  preferredPosition?: PreferredPosition;
  ratings: {
    stamina: Rating;
    control: Rating;
    shot: Rating;
    dribble: Rating;
    defense: Rating;
  };
};

export type TeamResult = {
  teamA: Player[];
  teamB: Player[];
  scoreA: number;
  scoreB: number;
  goaliesA: number;
  goaliesB: number;
};

export type MatchStatus = "pending" | "cancelled" | "finalized";

export type Scorer = {
  playerId: string;
  playerName: string;
  goals: number;
  team: "a" | "b";
};

export type Match = {
  id: string;
  date: string;
  place?: string;
  teams: TeamResult;
  goalsA: number;
  goalsB: number;
  scorers: Scorer[];
  notes: string;
  status: MatchStatus;
};
