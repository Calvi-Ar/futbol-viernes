import { Player, TeamResult } from "./types";

const MAX_BRUTE = 20;
const GOALIE_BONUS = 2;
const TOLERANCE = 4;

export const getPlayerScore = (player: Player) =>
  Object.values(player.ratings).reduce((s, v) => s + v, 0);

const getEffectiveScore = (player: Player) =>
  getPlayerScore(player) + (player.isGoalie ? GOALIE_BONUS : 0);

const countBits = (n: number) => {
  let c = 0;
  let v = n;
  while (v) {
    v &= v - 1;
    c += 1;
  }
  return c;
};

function splitKey(teamAIds: string[], teamBIds: string[]): string {
  const a = [...teamAIds].sort().join(",");
  const b = [...teamBIds].sort().join(",");
  return a < b ? a : b;
}

type RecentTeams = { teamAIds: string[]; teamBIds: string[] };

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function maskToIndexes(mask: number, n: number): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (mask & (1 << i)) s.add(i);
  }
  return s;
}

function isMaskRecent(
  mask: number,
  players: Player[],
  recentKeys: Set<string>
): boolean {
  if (recentKeys.size === 0) return false;
  const aIds: string[] = [];
  const bIds: string[] = [];
  for (let i = 0; i < players.length; i++) {
    if (mask & (1 << i)) aIds.push(players[i].id);
    else bIds.push(players[i].id);
  }
  return recentKeys.has(splitKey(aIds, bIds));
}

/**
 * teamSize = players per side (e.g. 7 for 7v7). If not set, splits in half.
 * recentMatches = last N matches to avoid repeating (team compositions).
 */
export const buildTeams = (
  players: Player[],
  teamSize?: number,
  recentMatches?: RecentTeams[]
): TeamResult => {
  const totalEffective = players.reduce((s, p) => s + getEffectiveScore(p), 0);
  const totalGoalies = players.filter((p) => p.isGoalie).length;
  const sizeA =
    teamSize != null ? Math.min(teamSize, players.length) : Math.floor(players.length / 2);
  const empty: TeamResult = {
    teamA: [],
    teamB: [],
    scoreA: 0,
    scoreB: 0,
    goaliesA: 0,
    goaliesB: 0,
  };

  if (players.length === 0) return empty;

  const recentKeys = new Set(
    (recentMatches ?? []).map((m) => splitKey(m.teamAIds, m.teamBIds))
  );

  const makeResult = (indexes: Set<number>): TeamResult => {
    const teamA = players.filter((_, i) => indexes.has(i));
    const teamB = players.filter((_, i) => !indexes.has(i));
    const scoreA = teamA.reduce((s, p) => s + getPlayerScore(p), 0);
    const scoreB = teamB.reduce((s, p) => s + getPlayerScore(p), 0);
    const goaliesA = teamA.filter((p) => p.isGoalie).length;
    return {
      teamA,
      teamB,
      scoreA,
      scoreB,
      goaliesA,
      goaliesB: totalGoalies - goaliesA,
    };
  };

  if (players.length > MAX_BRUTE) {
    return buildGreedy(players, sizeA, totalGoalies, recentKeys);
  }

  // --- Brute-force: two-pass approach ---

  // Pass 1: find the minimum possible diff
  let minDiff = Infinity;
  const total = 1 << players.length;
  const maskDiffs: number[] = new Array(total);

  for (let mask = 0; mask < total; mask++) {
    if (countBits(mask) !== sizeA) {
      maskDiffs[mask] = -1;
      continue;
    }
    let effA = 0;
    for (let i = 0; i < players.length; i++) {
      if (mask & (1 << i)) effA += getEffectiveScore(players[i]);
    }
    const diff = Math.abs(effA - (totalEffective - effA));
    maskDiffs[mask] = diff;
    if (diff < minDiff) minDiff = diff;
  }

  // Pass 2: collect ALL masks within tolerance
  const validMasks: number[] = [];
  for (let mask = 0; mask < total; mask++) {
    if (maskDiffs[mask] >= 0 && maskDiffs[mask] <= minDiff + TOLERANCE) {
      validMasks.push(mask);
    }
  }

  if (validMasks.length === 0) return empty;

  // Pick randomly, trying to avoid recent splits (up to 100 attempts)
  const maxAttempts = Math.min(validMasks.length, 100);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const idx = Math.floor(Math.random() * validMasks.length);
    const mask = validMasks[idx];
    if (!isMaskRecent(mask, players, recentKeys)) {
      return makeResult(maskToIndexes(mask, players.length));
    }
  }

  // Fallback: return any random valid mask
  const fallbackIdx = Math.floor(Math.random() * validMasks.length);
  return makeResult(maskToIndexes(validMasks[fallbackIdx], players.length));
};

function buildGreedy(
  players: Player[],
  sizeA: number,
  totalGoalies: number,
  recentKeys: Set<string>
): TeamResult {
  const ATTEMPTS = 60;
  let bestResult: TeamResult | null = null;
  let bestDiff = Infinity;
  let bestIsRecent = true;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const shuffled = fisherYatesShuffle(players);

    const tA: Player[] = [];
    const tB: Player[] = [];
    let effA = 0,
      effB = 0,
      gA = 0;
    shuffled.forEach((p) => {
      const eff = getEffectiveScore(p);
      const g = p.isGoalie ? 1 : 0;
      if (
        tA.length < sizeA &&
        (effA <= effB || tB.length >= players.length - sizeA)
      ) {
        tA.push(p);
        effA += eff;
        gA += g;
      } else {
        tB.push(p);
        effB += eff;
      }
    });

    const diff = Math.abs(effA - effB);
    if (diff > TOLERANCE + bestDiff && !bestIsRecent) continue;

    const key = splitKey(
      tA.map((p) => p.id),
      tB.map((p) => p.id)
    );
    const isRecent = recentKeys.has(key);

    const isBetter =
      (!isRecent && bestIsRecent) ||
      (isRecent === bestIsRecent && diff < bestDiff);

    if (isBetter) {
      bestDiff = diff;
      bestIsRecent = isRecent;
      const scoreA = tA.reduce((s, p) => s + getPlayerScore(p), 0);
      const scoreB = tB.reduce((s, p) => s + getPlayerScore(p), 0);
      bestResult = {
        teamA: tA,
        teamB: tB,
        scoreA,
        scoreB,
        goaliesA: gA,
        goaliesB: totalGoalies - gA,
      };
    }
  }

  return bestResult ?? {
    teamA: [],
    teamB: [],
    scoreA: 0,
    scoreB: 0,
    goaliesA: 0,
    goaliesB: 0,
  };
}
