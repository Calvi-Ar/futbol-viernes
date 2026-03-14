import type { Player, Match } from "./types";
import { groupFetch } from "./api-client";

export function addPlayerToBigQuery(player: Player): void {
  groupFetch("/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(player),
  }).catch((err) => console.error("[BigQuery add player]", err));
}

export async function updatePlayerInBigQuery(player: Player): Promise<boolean> {
  try {
    const res = await groupFetch(`/api/players/${encodeURIComponent(player.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(player),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[BigQuery update player]", res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[BigQuery update player]", err);
    return false;
  }
}

export async function deletePlayerFromBigQuery(playerId: string): Promise<boolean> {
  try {
    const res = await groupFetch(`/api/players/${encodeURIComponent(playerId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[BigQuery delete player]", res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[BigQuery delete player]", err);
    return false;
  }
}

export async function addMatchToBigQuery(match: Match): Promise<boolean> {
  try {
    const res = await groupFetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(match),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[BigQuery add match]", res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[BigQuery add match]", err);
    return false;
  }
}

export async function updateMatchInBigQuery(match: Match): Promise<boolean> {
  try {
    const res = await groupFetch(`/api/matches/${encodeURIComponent(match.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(match),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[BigQuery update match]", res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[BigQuery update match]", err);
    return false;
  }
}

export async function deleteMatchFromBigQuery(matchId: string): Promise<boolean> {
  try {
    const res = await groupFetch(`/api/matches/${encodeURIComponent(matchId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[BigQuery delete match]", res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[BigQuery delete match]", err);
    return false;
  }
}
