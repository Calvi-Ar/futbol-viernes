import { Match, Player } from "./types";

const PLAYERS_KEY = "futbol-friday-players";
const MATCHES_KEY = "futbol-friday-matches";

export const loadPlayers = (): Player[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    return raw ? (JSON.parse(raw) as Player[]) : [];
  } catch {
    return [];
  }
};

export const savePlayers = (players: Player[]) => {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
};

export const loadMatches = (): Match[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MATCHES_KEY);
    const list = raw ? (JSON.parse(raw) as Match[]) : [];
    return list.map((m) => ({
      ...m,
      status: (m as Match & { status?: Match["status"] }).status ?? "finalized",
      scorers: (m.scorers ?? []).map((s) => ({
        ...s,
        team: s.team ?? "a",
      })),
    }));
  } catch {
    return [];
  }
};

export const saveMatches = (matches: Match[]) => {
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
};
