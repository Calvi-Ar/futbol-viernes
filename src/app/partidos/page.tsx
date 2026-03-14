"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { groupFetch } from "@/lib/api-client";
import { useGroup } from "@/app/GroupContext";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import BalanceIcon from "@mui/icons-material/Balance";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Match, Player, Scorer } from "@/lib/types";
import {
  addMatchToBigQuery,
  updateMatchInBigQuery,
  deleteMatchFromBigQuery,
} from "@/lib/sync-bigquery";
import { loadMatches, loadPlayers, saveMatches } from "@/lib/storage";
import { buildTeams, getPlayerScore } from "@/lib/teams";

export default function PartidosPage() {
  return (
    <Suspense>
      <PartidosContent />
    </Suspense>
  );
}

function PartidosContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const searchParams = useSearchParams();
  const { currentGroup, loading: groupLoading, canEdit } = useGroup();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const openedPendingRef = useRef(false);
  const expandedPendingRef = useRef(false);

  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [placeName, setPlaceName] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [generatedTeams, setGeneratedTeams] = useState<ReturnType<typeof buildTeams> | null>(null);
  const [goalsA, setGoalsA] = useState(0);
  const [goalsB, setGoalsB] = useState(0);
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [notes, setNotes] = useState("");

  // For adding a scorer
  const [scorerPlayerId, setScorerPlayerId] = useState("");
  const [scorerGoals, setScorerGoals] = useState(1);

  const prevGroupRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (groupLoading || !currentGroup) return;

    if (prevGroupRef.current && prevGroupRef.current !== currentGroup.groupId) {
      setMatches([]);
      setPlayers([]);
      setHydrated(false);
      handleCloseMatchDialog();
      setExpandedMatchId(null);
      openedPendingRef.current = false;
      expandedPendingRef.current = false;
    }
    prevGroupRef.current = currentGroup.groupId;

    Promise.all([
      groupFetch("/api/matches").then((r) => (r.ok ? r.json() : Promise.reject())),
      groupFetch("/api/players").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([matchesData, playersData]: [Match[], Player[]]) => {
        setMatches(matchesData);
        setPlayers(playersData);
        saveMatches(matchesData);
      })
      .catch(() => {
        setMatches(loadMatches());
        setPlayers(loadPlayers());
      })
      .finally(() => setHydrated(true));
  }, [groupLoading, currentGroup]);

  useEffect(() => {
    if (!hydrated || matches.length === 0 || openedPendingRef.current) return;
    if (searchParams.get("open") === "pending") {
      const pending = matches.find((m) => m.status === "pending");
      if (pending) {
        openedPendingRef.current = true;
        setEditingMatchId(pending.id);
        setMatchDate(pending.date);
        setPlaceName(pending.place ?? "");
        setSelectedPlayerIds(new Set([...pending.teams.teamA.map((p) => p.id), ...pending.teams.teamB.map((p) => p.id)]));
        setGeneratedTeams(pending.teams);
        setGoalsA(pending.goalsA);
        setGoalsB(pending.goalsB);
        setScorers([...pending.scorers]);
        setNotes(pending.notes);
        setIsMatchDialogOpen(true);
        window.history.replaceState({}, "", "/partidos");
      }
    }
  }, [hydrated, matches, searchParams]);

  useEffect(() => {
    if (!hydrated || matches.length === 0 || expandedPendingRef.current) return;
    if (searchParams.get("expand") === "pending") {
      const pending = matches.find((m) => m.status === "pending");
      if (pending) {
        expandedPendingRef.current = true;
        setExpandedMatchId(pending.id);
        window.history.replaceState({}, "", "/partidos");
      }
    }
  }, [hydrated, matches, searchParams]);

  const persistMatches = useCallback((next: Match[]) => {
    setMatches(next);
    saveMatches(next);
  }, []);

  const allMatchPlayers = generatedTeams
    ? [...generatedTeams.teamA, ...generatedTeams.teamB]
    : players.filter((p) => selectedPlayerIds.has(p.id));

  const handleTogglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setGeneratedTeams(null);
  };

  const handleSelectAll = () => {
    if (selectedPlayerIds.size === players.length) {
      setSelectedPlayerIds(new Set());
    } else {
      setSelectedPlayerIds(new Set(players.map((p) => p.id)));
    }
    setGeneratedTeams(null);
  };

  const handleGenerateTeams = () => {
    const recent = matches.slice(0, 3).map((m) => ({
      teamAIds: m.teams.teamA.map((p) => p.id),
      teamBIds: m.teams.teamB.map((p) => p.id),
    }));
    setGeneratedTeams(buildTeams(allMatchPlayers, undefined, recent));
  };

  const handleAddScorer = () => {
    if (!scorerPlayerId || scorerGoals < 1 || !generatedTeams) return;
    const player = allMatchPlayers.find((p) => p.id === scorerPlayerId);
    if (!player) return;
    const team: "a" | "b" = generatedTeams.teamA.some((p) => p.id === scorerPlayerId) ? "a" : "b";
    setScorers((prev) => {
      const existing = prev.find((s) => s.playerId === scorerPlayerId);
      if (existing) {
        return prev.map((s) => s.playerId === scorerPlayerId ? { ...s, goals: s.goals + scorerGoals } : s);
      }
      return [...prev, { playerId: player.id, playerName: player.name, goals: scorerGoals, team }];
    });
    setScorerPlayerId("");
    setScorerGoals(1);
  };

  const handleRemoveScorer = (playerId: string) => {
    setScorers((prev) => prev.filter((s) => s.playerId !== playerId));
  };

  const handleSaveMatch = async () => {
    if (!generatedTeams) return;
    const match: Match = {
      id: editingMatchId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: matchDate,
      place: placeName.trim() || undefined,
      teams: generatedTeams,
      goalsA,
      goalsB,
      scorers,
      notes,
      status: "finalized",
    };
    setSaving(true);
    let ok: boolean;
    if (editingMatchId) {
      persistMatches(matches.map((m) => (m.id === editingMatchId ? match : m)));
      ok = await updateMatchInBigQuery(match);
    } else {
      persistMatches([match, ...matches]);
      ok = await addMatchToBigQuery(match);
    }
    setSaving(false);
    if (!ok) {
      alert("No se pudo guardar el partido en BigQuery. Revisá la consola para más detalles.");
      return;
    }
    handleCloseMatchDialog();
  };

  const handleDeleteMatch = async (id: string) => {
    persistMatches(matches.filter((m) => m.id !== id));
    const ok = await deleteMatchFromBigQuery(id);
    if (!ok) {
      alert("No se pudo eliminar el partido de BigQuery.");
    }
  };

  const handleCloseMatchDialog = () => {
    setIsMatchDialogOpen(false);
    setEditingMatchId(null);
    setPlaceName("");
    setSelectedPlayerIds(new Set());
    setGeneratedTeams(null);
    setGoalsA(0);
    setGoalsB(0);
    setScorers([]);
    setNotes("");
    setScorerPlayerId("");
    setScorerGoals(1);
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatchId(match.id);
    setMatchDate(match.date);
    setPlaceName(match.place ?? "");
    const ids = new Set([
      ...match.teams.teamA.map((p) => p.id),
      ...match.teams.teamB.map((p) => p.id),
    ]);
    setSelectedPlayerIds(ids);
    setGeneratedTeams(match.teams);
    setGoalsA(match.goalsA);
    setGoalsB(match.goalsB);
    setScorers([...match.scorers]);
    setNotes(match.notes);
    setScorerPlayerId("");
    setScorerGoals(1);
    setIsMatchDialogOpen(true);
  };

  const handleOpenNewMatch = () => {
    setEditingMatchId(null);
    setMatchDate(new Date().toISOString().slice(0, 10));
    setPlaceName("");
    setSelectedPlayerIds(new Set());
    setGeneratedTeams(null);
    setGoalsA(0);
    setGoalsB(0);
    setScorers([]);
    setNotes("");
    setScorerPlayerId("");
    setScorerGoals(1);
    setIsMatchDialogOpen(true);
  };

  const formatDate = (dateInput: string | { value?: string } | unknown): string => {
    const dateStr = typeof dateInput === "object" && dateInput !== null && "value" in dateInput
      ? String((dateInput as { value: string }).value)
      : String(dateInput ?? "");
    try {
      const [y, m, d] = dateStr.split("-");
      if (d && m && y) return `${d}/${m}/${y}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  if (!hydrated) return null;

  return (
    <Box sx={{ pb: 8 }}>
      {/* Page header */}
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", py: 4, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth="md" disableGutters>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}>Partidos</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Registra resultados y revisá cómo se armaron los equipos.
              </Typography>
            </Box>
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenNewMatch}
                disabled={players.length < 2}
              >
                Nuevo partido
              </Button>
            )}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ pt: 3, px: { xs: 2, sm: 4 } }} disableGutters>
        {players.length < 2 && (
          <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
            Necesitás al menos 2 jugadores cargados en la sección Equipos para crear un partido.
          </Alert>
        )}

        {matches.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <EmojiEventsIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
            <Typography color="text.secondary">
              Todavía no hay partidos registrados.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {matches.map((match) => (
              <Accordion
                key={match.id}
                expanded={expandedMatchId === match.id}
                onChange={(_, expanded) => setExpandedMatchId(expanded ? match.id : null)}
                sx={{
                  bgcolor: "background.paper",
                  "&:before": { display: "none" },
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "14px !important",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 2 }} sx={{ width: "100%" }} flexWrap="wrap" useFlexGap>
                      <Chip label={formatDate(match.date)} size="small" variant="outlined" />
                      {match.place && (
                        <Chip label={String(match.place)} size="small" variant="outlined" />
                      )}
                      {match.status === "pending" && (
                        <Chip label="Pendiente" size="small" color="warning" />
                      )}
                      <Typography fontWeight={700} sx={{ flex: 1, fontSize: { xs: "0.85rem", sm: "1rem" } }}>
                        Equipo 1{" "}
                        <Box component="span" sx={{ color: "primary.main" }}>
                          {match.goalsA}
                        </Box>
                        {" — "}
                        <Box component="span" sx={{ color: "secondary.main" }}>
                          {match.goalsB}
                        </Box>
                        {" "}Equipo 2
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  {canEdit && (
                    <Box sx={{ display: "flex", gap: 0.5, pr: 1, flexShrink: 0 }}>
                      <Tooltip title="Editar partido">
                        <IconButton
                          size="small"
                          onClick={() => handleEditMatch(match)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar partido">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteMatch(match.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {/* Teams */}
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                      {[
                        { title: "Equipo 1", team: match.teams.teamA, score: match.teams.scoreA, color: "primary" as const },
                        { title: "Equipo 2", team: match.teams.teamB, score: match.teams.scoreB, color: "secondary" as const },
                      ].map((t) => (
                        <Paper key={t.title} sx={{ p: 2, flex: 1, bgcolor: "rgba(255,255,255,0.02)" }}>
                          <Stack spacing={1}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <SportsSoccerIcon color={t.color} fontSize="small" />
                              <Typography variant="subtitle2">{t.title}</Typography>
                            </Stack>
                            <Divider />
                            {t.team.map((p) => (
                              <Stack key={p.id} direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body2" sx={{ flex: 1 }}>{p.name}</Typography>
                                {p.isGoalie && <Chip label="ARQ" size="small" color="warning" variant="outlined" />}
                                <Chip label={getPlayerScore(p)} size="small" />
                              </Stack>
                            ))}
                            <Divider />
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip icon={<BalanceIcon />} label={`Total ${t.score}`} color={t.color} variant="outlined" size="small" />
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>

                    {/* Scorers */}
                    {match.scorers.length > 0 && (
                      <Paper sx={{ p: 2, bgcolor: "rgba(255,255,255,0.02)" }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Goleadores</Typography>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                          {(["a", "b"] as const).map((t) => {
                            const teamScorers = match.scorers.filter((s) => s.team === t);
                            if (teamScorers.length === 0) return null;
                            return (
                              <Box key={t} sx={{ flex: 1 }}>
                                <Typography variant="caption" color={t === "a" ? "primary.main" : "secondary.main"} fontWeight={700} sx={{ mb: 0.5, display: "block" }}>
                                  {t === "a" ? "Equipo 1" : "Equipo 2"}
                                </Typography>
                                <Stack spacing={0.5}>
                                  {teamScorers.map((s) => (
                                    <Stack key={s.playerId} direction="row" alignItems="center" spacing={1}>
                                      <SportsSoccerIcon fontSize="small" sx={{ color: "text.secondary" }} />
                                      <Typography variant="body2" sx={{ flex: 1 }}>{s.playerName}</Typography>
                                      <Chip label={`${s.goals} gol${s.goals > 1 ? "es" : ""}`} size="small" />
                                    </Stack>
                                  ))}
                                </Stack>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Paper>
                    )}

                    {match.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                        {match.notes}
                      </Typography>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </Container>

      {/* New / Edit match dialog */}
      <Dialog open={isMatchDialogOpen} onClose={handleCloseMatchDialog} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {editingMatchId ? <EditIcon color="primary" /> : <AddIcon color="primary" />}
            <span>{editingMatchId ? "Editar partido" : "Nuevo partido"}</span>
          </Stack>
          <IconButton onClick={handleCloseMatchDialog} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {/* Date & Place */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Fecha del partido"
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                size="small"
                sx={{ maxWidth: 220 }}
              />
              <TextField
                label="Lugar (opcional)"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                size="small"
                sx={{ minWidth: 180, flex: 1 }}
                placeholder="Cancha, club, etc."
              />
            </Stack>

            {/* Player selection */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">
                  Seleccionar jugadores ({selectedPlayerIds.size} de {players.length})
                </Typography>
                <Button size="small" onClick={handleSelectAll}>
                  {selectedPlayerIds.size === players.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </Button>
              </Stack>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                {players.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    onClick={() => handleTogglePlayer(p.id)}
                    color={selectedPlayerIds.has(p.id) ? "primary" : "default"}
                    variant={selectedPlayerIds.has(p.id) ? "filled" : "outlined"}
                  />
                ))}
              </Stack>
            </Box>

            {/* Generate teams */}
            <Button
              variant="outlined"
              onClick={handleGenerateTeams}
              disabled={allMatchPlayers.length < 2}
              startIcon={<BalanceIcon />}
            >
              Armar equipos ({allMatchPlayers.length} jugadores)
            </Button>

            {/* Show generated teams */}
            {generatedTeams && (
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                {[
                  { title: "Equipo 1", team: generatedTeams.teamA, score: generatedTeams.scoreA, color: "primary" as const },
                  { title: "Equipo 2", team: generatedTeams.teamB, score: generatedTeams.scoreB, color: "secondary" as const },
                ].map((t) => (
                  <Paper key={t.title} sx={{ p: 2, flex: 1, bgcolor: "rgba(255,255,255,0.03)" }}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" color={`${t.color}.main`}>{t.title} — Total {t.score}</Typography>
                      <Divider />
                      {t.team.map((p) => (
                        <Stack key={p.id} direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" sx={{ flex: 1 }}>{p.name}</Typography>
                          {p.isGoalie && <Chip label="ARQ" size="small" color="warning" variant="outlined" />}
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            {generatedTeams && (
              <>
                <Divider />
                {/* Result */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                  <Typography variant="subtitle2" sx={{ minWidth: { xs: "auto", sm: 80 } }}>Resultado</Typography>
                  <TextField
                    label="Equipo 1"
                    type="number"
                    value={goalsA}
                    onChange={(e) => setGoalsA(Math.max(0, Number(e.target.value)))}
                    size="small"
                    sx={{ width: { xs: "100%", sm: 100 } }}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                  <Typography variant="h6">—</Typography>
                  <TextField
                    label="Equipo 2"
                    type="number"
                    value={goalsB}
                    onChange={(e) => setGoalsB(Math.max(0, Number(e.target.value)))}
                    size="small"
                    sx={{ width: { xs: "100%", sm: 100 } }}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </Stack>

                {/* Scorers */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Goleadores</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                    <TextField
                      select
                      label="Jugador"
                      value={scorerPlayerId}
                      onChange={(e) => setScorerPlayerId(e.target.value)}
                      size="small"
                      sx={{ minWidth: 180 }}
                    >
                      {allMatchPlayers.map((p) => {
                        const t = generatedTeams?.teamA.some((x) => x.id === p.id) ? "Eq.1" : "Eq.2";
                        return <MenuItem key={p.id} value={p.id}>{p.name} ({t})</MenuItem>;
                      })}
                    </TextField>
                    <TextField
                      label="Goles"
                      type="number"
                      value={scorerGoals}
                      onChange={(e) => setScorerGoals(Math.max(1, Number(e.target.value)))}
                      size="small"
                      sx={{ width: 80 }}
                      slotProps={{ htmlInput: { min: 1 } }}
                    />
                    <Button size="small" variant="outlined" onClick={handleAddScorer}>
                      Agregar
                    </Button>
                  </Stack>
                  {scorers.length > 0 && (
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 1 }}>
                      {(["a", "b"] as const).map((t) => {
                        const teamScorers = scorers.filter((s) => s.team === t);
                        if (teamScorers.length === 0) return null;
                        return (
                          <Box key={t} sx={{ flex: 1 }}>
                            <Typography variant="caption" color={t === "a" ? "primary.main" : "secondary.main"} fontWeight={700}>
                              {t === "a" ? "Equipo 1" : "Equipo 2"}
                            </Typography>
                            <Table size="small">
                              <TableBody>
                                {teamScorers.map((s) => (
                                  <TableRow key={s.playerId}>
                                    <TableCell sx={{ py: 0.5 }}>{s.playerName}</TableCell>
                                    <TableCell align="center" sx={{ py: 0.5 }}>{s.goals}</TableCell>
                                    <TableCell align="right" sx={{ py: 0.5 }}>
                                      <IconButton size="small" onClick={() => handleRemoveScorer(s.playerId)}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>

                {/* Notes */}
                <TextField
                  label="Notas (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={2}
                  size="small"
                  fullWidth
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseMatchDialog} color="secondary">Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveMatch}
            disabled={!generatedTeams || saving}
          >
            {saving ? "Guardando…" : editingMatchId ? "Guardar cambios" : "Guardar partido"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
