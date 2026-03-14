import { Player, TeamResult } from "./types";

const MAX_BRUTE = 20;
const GOALIE_BONUS = 2;

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

/**
 * Produces a canonical key for a team split so we can compare compositions.
 * We sort the smaller team's ids to get a stable representation.
 * Since teamA vs teamB is the same split, we pick the lexicographically smaller set.
 */
function splitKey(teamAIds: string[], teamBIds: string[]): string {
  const a = [...teamAIds].sort().join(",");
  const b = [...teamBIds].sort().join(",");
  return a < b ? a : b;
}

type RecentTeams = { teamAIds: string[]; teamBIds: string[] };

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
  const empty: TeamResult = { teamA: [], teamB: [], scoreA: 0, scoreB: 0, goaliesA: 0, goaliesB: 0 };

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
    return { teamA, teamB, scoreA, scoreB, goaliesA, goaliesB: totalGoalies - goaliesA };
  };

  const isRecentSplit = (indexes: Set<number>): boolean => {
    if (recentKeys.size === 0) return false;
    const aIds = players.filter((_, i) => indexes.has(i)).map((p) => p.id);
    const bIds = players.filter((_, i) => !indexes.has(i)).map((p) => p.id);
    return recentKeys.has(splitKey(aIds, bIds));
  };

  if (players.length > MAX_BRUTE) {
    return buildGreedy(players, sizeA, totalGoalies, recentKeys);
  }

  // Brute-force: collect top balanced candidates, pick one not in recent
  type Candidate = { diff: number; indexes: Set<number> };
  const candidates: Candidate[] = [];
  const MAX_CANDIDATES = 50;

  const total = 1 << players.length;
  for (let mask = 0; mask < total; mask += 1) {
    if (countBits(mask) !== sizeA) continue;
    let effA = 0;
    const indexes = new Set<number>();
    for (let i = 0; i < players.length; i += 1) {
      if (mask & (1 << i)) {
        indexes.add(i);
        effA += getEffectiveScore(players[i]);
      }
    }
    const effB = totalEffective - effA;
    const diff = Math.abs(effA - effB);

    if (candidates.length < MAX_CANDIDATES) {
      candidates.push({ diff, indexes });
      candidates.sort((a, b) => a.diff - b.diff);
    } else if (diff < candidates[candidates.length - 1].diff) {
      candidates[candidates.length - 1] = { diff, indexes };
      candidates.sort((a, b) => a.diff - b.diff);
    }
  }

  // Filter out recent repeats
  const fresh = candidates.filter((c) => !isRecentSplit(c.indexes));
  const pool = fresh.length > 0 ? fresh : candidates;

  if (pool.length === 0) return empty;

  // Among remaining, pick randomly from those within 2 points of the best diff
  const bestDiff = pool[0].diff;
  const nearBest = pool.filter((c) => c.diff <= bestDiff + 2);
  const pick = nearBest[Math.floor(Math.random() * nearBest.length)];
  return makeResult(pick.indexes);
};

function buildGreedy(
  players: Player[],
  sizeA: number,
  totalGoalies: number,
  recentKeys: Set<string>
): TeamResult {
  const ATTEMPTS = 20;
  let bestResult: TeamResult | null = null;
  let bestDiff = Infinity;
  let bestIsRecent = true;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const shuffled = [...players].sort(
      (a, b) => getEffectiveScore(b) - getEffectiveScore(a)
    );

    // Add randomness: for non-first attempts, shuffle players with similar scores
    if (attempt > 0) {
      for (let i = 0; i < shuffled.length - 1; i++) {
        const diff = Math.abs(getEffectiveScore(shuffled[i]) - getEffectiveScore(shuffled[i + 1]));
        if (diff <= 2 && Math.random() > 0.5) {
          [shuffled[i], shuffled[i + 1]] = [shuffled[i + 1], shuffled[i]];
        }
      }
    }

    const tA: Player[] = [];
    const tB: Player[] = [];
    let effA = 0, effB = 0, gA = 0;
    shuffled.forEach((p) => {
      const eff = getEffectiveScore(p);
      const g = p.isGoalie ? 1 : 0;
      if (tA.length < sizeA && (effA <= effB || tB.length >= players.length - sizeA)) {
        tA.push(p); effA += eff; gA += g;
      } else {
        tB.push(p); effB += eff;
      }
    });

    const diff = Math.abs(effA - effB);
    const key = splitKey(tA.map((p) => p.id), tB.map((p) => p.id));
    const isRecent = recentKeys.has(key);

    const isBetter =
      (!isRecent && bestIsRecent) ||
      (isRecent === bestIsRecent && diff < bestDiff);

    if (isBetter) {
      bestDiff = diff;
      bestIsRecent = isRecent;
      const scoreA = tA.reduce((s, p) => s + getPlayerScore(p), 0);
      const scoreB = tB.reduce((s, p) => s + getPlayerScore(p), 0);
      bestResult = { teamA: tA, teamB: tB, scoreA, scoreB, goaliesA: gA, goaliesB: totalGoalies - gA };
    }
  }

  return bestResult ?? { teamA: [], teamB: [], scoreA: 0, scoreB: 0, goaliesA: 0, goaliesB: 0 };
}
