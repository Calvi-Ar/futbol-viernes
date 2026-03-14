"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import BalanceIcon from "@mui/icons-material/Balance";
import SportsIcon from "@mui/icons-material/Sports";
import CasinoIcon from "@mui/icons-material/Casino";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Player } from "@/lib/types";
import { addMatchToBigQuery } from "@/lib/sync-bigquery";
import { loadMatches, saveMatches } from "@/lib/storage";
import { buildTeams, getPlayerScore } from "@/lib/teams";
import type { TeamResult } from "@/lib/types";

type RecentTeams = { teamAIds: string[]; teamBIds: string[] };

interface EquiposData {
  teams: TeamResult;
  selectedPlayers: Player[];
  matchSize: number;
  recentMatches: RecentTeams[];
}

export default function EquiposPage() {
  const router = useRouter();
  const [data, setData] = useState<EquiposData | null>(null);
  const [teams, setTeams] = useState<TeamResult | null>(null);
  const [confirmPlay, setConfirmPlay] = useState(false);
  const [playDate, setPlayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [playPlace, setPlayPlace] = useState("");
  const [playNotes, setPlayNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("equipos-data");
    if (raw) {
      try {
        const parsed: EquiposData = JSON.parse(raw);
        setData(parsed);
        setTeams(parsed.teams);
      } catch {
        /* invalid data */
      }
    }
  }, []);

  const handleRemix = () => {
    if (!data) return;
    const newTeams = buildTeams(data.selectedPlayers, data.matchSize, data.recentMatches);
    setTeams(newTeams);
    setConfirmPlay(false);
  };

  const handleCrearPartido = async () => {
    if (!teams || !data) return;
    const match = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: playDate,
      place: playPlace.trim() || undefined,
      teams,
      goalsA: 0,
      goalsB: 0,
      scorers: [],
      notes: playNotes,
      status: "pending" as const,
    };
    setSaving(true);
    const ok = await addMatchToBigQuery(match);
    setSaving(false);
    if (!ok) {
      alert("No se pudo crear el partido en BigQuery.");
      return;
    }
    const existing = loadMatches();
    saveMatches([match, ...existing]);
    sessionStorage.removeItem("equipos-data");
    router.push("/partidos");
  };

  if (!data || !teams) {
    return (
      <Box sx={{ pb: 8 }}>
        <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", py: 4, px: { xs: 2, sm: 4 } }}>
          <Container maxWidth="md" disableGutters>
            <Typography variant="h4">Equipos</Typography>
          </Container>
        </Box>
        <Container maxWidth="md" sx={{ pt: 4, px: { xs: 2, sm: 4 } }} disableGutters>
          <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
            No hay equipos armados. Seleccioná jugadores en la página de Jugadores y hacé clic en &quot;Armar equipos&quot;.
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/jugadores")}
          >
            Ir a Jugadores
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", py: 4, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth="md" disableGutters>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push("/jugadores")}
              sx={{ color: "text.secondary" }}
            >
              Jugadores
            </Button>
          </Stack>
          <Typography variant="h4" sx={{ mt: 1 }}>
            Equipos armados — {data.matchSize} vs {data.matchSize}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Revisá los equipos, mezclalos de nuevo, o confirmá el partido.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ pt: 3, px: { xs: 2, sm: 4 } }} disableGutters>
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {[
              { title: "Equipo 1", team: teams.teamA, score: teams.scoreA, goalies: teams.goaliesA, color: "primary" as const, gradient: "linear-gradient(135deg, rgba(76,175,80,0.12) 0%, transparent 100%)" },
              { title: "Equipo 2", team: teams.teamB, score: teams.scoreB, goalies: teams.goaliesB, color: "secondary" as const, gradient: "linear-gradient(135deg, rgba(144,202,249,0.12) 0%, transparent 100%)" },
            ].map((t) => (
              <Paper key={t.title} sx={{ p: 3, flex: 1, background: t.gradient }}>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <SportsSoccerIcon color={t.color} />
                    <Typography variant="h6">{t.title}</Typography>
                  </Stack>
                  <Divider />
                  <Stack spacing={1}>
                    {t.team.length === 0 ? (
                      <Typography color="text.secondary" variant="body2">No hay jugadores.</Typography>
                    ) : (
                      t.team.map((player) => (
                        <Stack key={player.id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.5, px: 1, borderRadius: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.04)" } }}>
                          <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{player.name}</Typography>
                          {player.isGoalie && <Chip label="ARQ" size="small" color="warning" variant="outlined" />}
                          <Chip size="small" label={getPlayerScore(player)} />
                        </Stack>
                      ))
                    )}
                  </Stack>
                  <Divider />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip icon={<BalanceIcon />} label={`Total ${t.score}`} color={t.color} variant="outlined" size="small" />
                    <Chip label={`Arqueros ${t.goalies}`} variant="outlined" size="small" />
                    <Chip label={`Jugadores ${t.team.length}`} variant="outlined" size="small" />
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>

          {!confirmPlay ? (
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                size="large"
                startIcon={<CasinoIcon />}
                onClick={handleRemix}
              >
                Mezclar de nuevo
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<SportsIcon />}
                onClick={() => setConfirmPlay(true)}
              >
                ¡A jugar!
              </Button>
            </Stack>
          ) : (
            <Paper sx={{ p: 2, bgcolor: "rgba(255,255,255,0.03)" }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Crear partido con estos equipos</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Fecha del partido"
                  type="date"
                  value={playDate}
                  onChange={(e) => setPlayDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  size="small"
                  sx={{ maxWidth: 220 }}
                />
                <TextField
                  label="Lugar (opcional)"
                  value={playPlace}
                  onChange={(e) => setPlayPlace(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Cancha, club, etc."
                />
                <TextField
                  label="Notas (opcional)"
                  value={playNotes}
                  onChange={(e) => setPlayNotes(e.target.value)}
                  multiline
                  rows={2}
                  size="small"
                  fullWidth
                />
                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" onClick={() => setConfirmPlay(false)}>
                    Volver
                  </Button>
                  <Button variant="contained" onClick={handleCrearPartido} startIcon={<SportsIcon />} disabled={saving}>
                    {saving ? "Creando…" : "Crear partido"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
