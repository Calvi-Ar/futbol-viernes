"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { groupFetch } from "@/lib/api-client";
import { useGroup } from "@/app/GroupContext";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import BalanceIcon from "@mui/icons-material/Balance";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Player, Match, PreferredPosition, Rating } from "@/lib/types";
import {
  addPlayerToBigQuery,
  updatePlayerInBigQuery,
  deletePlayerFromBigQuery,
} from "@/lib/sync-bigquery";
import { loadPlayers, loadMatches, savePlayers } from "@/lib/storage";
import { buildTeams, getPlayerScore } from "@/lib/teams";

const ratingFields: Array<{ key: keyof Player["ratings"]; label: string }> = [
  { key: "stamina", label: "Resistencia" },
  { key: "control", label: "Control de balón" },
  { key: "shot", label: "Potencia de tiro" },
  { key: "dribble", label: "Regate" },
  { key: "defense", label: "Defensa" },
];

const ratingMarks = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
];

const defaultRatings: Player["ratings"] = {
  stamina: 3, control: 3, shot: 3, dribble: 3, defense: 3,
};

const MATCH_SIZES = [5, 6, 7, 8] as const;

const PREFERRED_POSITION_OPTIONS: { value: PreferredPosition; label: string }[] = [
  { value: null, label: "—" },
  { value: "goalkeeper", label: "Arquero" },
  { value: "defense", label: "Defensa" },
  { value: "midfielder", label: "Mediocampista" },
  { value: "attacker", label: "Atacante" },
  { value: "winger", label: "Extremo" },
];

export default function JugadoresPage() {
  const router = useRouter();
  const { currentGroup, loading: groupLoading, canEdit } = useGroup();
  const [players, setPlayers] = useState<Player[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [matchSize, setMatchSize] = useState(7);
  const [selectedForMatch, setSelectedForMatch] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [isGoalie, setIsGoalie] = useState(false);
  const [preferredPosition, setPreferredPosition] = useState<PreferredPosition>(null);
  const [ratings, setRatings] = useState<Player["ratings"]>(defaultRatings);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (groupLoading || !currentGroup) return;
    groupFetch("/api/players")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Player[]) => {
        setPlayers(data);
        savePlayers(data);
      })
      .catch(() => {
        setPlayers(loadPlayers());
      })
      .finally(() => setHydrated(true));

    groupFetch("/api/matches")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Match[]) => setRecentMatches(data.slice(0, 3)))
      .catch(() => setRecentMatches(loadMatches().slice(0, 3)));
  }, [groupLoading, currentGroup]);

  const persist = useCallback((next: Player[]) => {
    setPlayers(next);
    savePlayers(next);
  }, []);

  const resetForm = () => {
    setName("");
    setAge("");
    setIsGoalie(false);
    setPreferredPosition(null);
    setRatings(defaultRatings);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ageNum = age === "" ? undefined : Number(age);
    if (editingId) {
      const updated: Player = {
        id: editingId,
        name: trimmed,
        age: ageNum,
        isGoalie,
        preferredPosition: preferredPosition ?? undefined,
        ratings: { ...ratings },
      };
      persist(players.map((p) => (p.id === editingId ? updated : p)));
      setSaving(true);
      const ok = await updatePlayerInBigQuery(updated);
      setSaving(false);
      if (!ok) {
        alert("No se pudo actualizar el jugador en BigQuery. Revisá la consola del navegador para más detalles.");
        return;
      }
      resetForm();
      setIsAddPlayerModalOpen(false);
    } else {
      const payload = {
        name: trimmed,
        age: ageNum,
        isGoalie,
        preferredPosition: preferredPosition ?? undefined,
        ratings,
      };
      const newPlayer: Player = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...payload,
      };
      persist([...players, newPlayer]);
      addPlayerToBigQuery(newPlayer);
      resetForm();
    }
  };

  const handleEdit = (player: Player) => {
    setName(player.name);
    setAge(player.age ?? "");
    setIsGoalie(player.isGoalie);
    setPreferredPosition(player.preferredPosition ?? null);
    setRatings({ ...player.ratings });
    setEditingId(player.id);
    setIsAddPlayerModalOpen(true);
  };

  const handleOpenAddPlayer = () => {
    resetForm();
    setIsAddPlayerModalOpen(true);
  };

  const handleCloseAddPlayerModal = () => {
    setIsAddPlayerModalOpen(false);
    resetForm();
  };

  const handleRemoveClick = (player: Player) => {
    setPlayerToDelete({ id: player.id, name: player.name });
  };

  const handleConfirmRemove = async () => {
    if (!playerToDelete) return;
    const { id } = playerToDelete;
    setSelectedForMatch((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    persist(players.filter((p) => p.id !== id));
    setPlayerToDelete(null);
    if (editingId === id) resetForm();
    setSaving(true);
    const ok = await deletePlayerFromBigQuery(id);
    setSaving(false);
    if (!ok) {
      alert("No se pudo eliminar el jugador de BigQuery. Revisá la consola del navegador para más detalles.");
    }
  };

  const handleClearAll = () => {
    setSelectedForMatch(new Set());
    players.forEach((p) => deletePlayerFromBigQuery(p.id));
    persist([]);
    resetForm();
  };

  const selectedPlayers = players.filter((p) => selectedForMatch.has(p.id));
  const requiredCount = 2 * matchSize;
  const canBuildTeams = selectedForMatch.size === requiredCount;

  const handleToggleForMatch = (playerId: string) => {
    setSelectedForMatch((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleSelectAllForMatch = () => {
    if (selectedForMatch.size === players.length) {
      setSelectedForMatch(new Set());
    } else {
      setSelectedForMatch(new Set(players.map((p) => p.id)));
    }
  };

  const handleBuildTeams = () => {
    if (!canBuildTeams) return;
    const recent = recentMatches.map((m) => ({
      teamAIds: m.teams.teamA.map((p) => p.id),
      teamBIds: m.teams.teamB.map((p) => p.id),
    }));
    const teams = buildTeams(selectedPlayers, matchSize, recent);
    sessionStorage.setItem(
      "equipos-data",
      JSON.stringify({ teams, selectedPlayers, matchSize, recentMatches: recent })
    );
    router.push("/equipos");
  };

  if (!hydrated) return null;

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", py: 4, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth="md" disableGutters>
          <Typography variant="h4">Jugadores</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Administra tus jugadores y seleccioná quiénes juegan para armar equipos.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ pt: 3, px: { xs: 2, sm: 4 } }} disableGutters>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <GroupsIcon fontSize="small" />
                  Jugadores ({players.length})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Los arqueros suman +2 al balance para repartir mejor.
                </Typography>
              </Stack>
              {canEdit && (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Button variant="contained" startIcon={<PersonAddIcon />} onClick={handleOpenAddPlayer}>
                    Agregar jugador
                  </Button>
                  <Button variant="outlined" color="error" size="small" onClick={handleClearAll}>
                    Limpiar todo
                  </Button>
                </Stack>
              )}
            </Stack>

            {canEdit && (
              <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={2} flexWrap="wrap">
                <Typography variant="subtitle2" color="text.secondary">
                  Partido:
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {MATCH_SIZES.map((n) => (
                    <Chip
                      key={n}
                      label={`${n} vs ${n}`}
                      onClick={() => setMatchSize(n)}
                      color={matchSize === n ? "primary" : "default"}
                      variant={matchSize === n ? "filled" : "outlined"}
                      size="small"
                    />
                  ))}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  ({selectedForMatch.size} / {requiredCount} jugadores para este partido)
                </Typography>
              </Stack>
            )}

            {players.length === 0 ? (
              <Alert severity="warning" variant="outlined">
                Agrega jugadores para generar equipos balanceados.
              </Alert>
            ) : (
              <>
                <Box
                  sx={{
                    maxHeight: 320,
                    overflowY: "auto",
                    overflowX: "auto",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {canEdit && (
                          <TableCell padding="checkbox" sx={{ bgcolor: "background.paper" }}>
                            <Checkbox
                              indeterminate={selectedForMatch.size > 0 && selectedForMatch.size < players.length}
                              checked={players.length > 0 && selectedForMatch.size === players.length}
                              onChange={handleSelectAllForMatch}
                              size="small"
                              title={selectedForMatch.size === players.length ? "Deseleccionar todos" : "Seleccionar todos"}
                            />
                          </TableCell>
                        )}
                        <TableCell sx={{ bgcolor: "background.paper" }}>Nombre</TableCell>
                        <TableCell align="center" sx={{ bgcolor: "background.paper" }}>Edad</TableCell>
                        <TableCell align="center" sx={{ bgcolor: "background.paper" }}>Posición</TableCell>
                        <TableCell align="center" sx={{ bgcolor: "background.paper" }}>Habilidad</TableCell>
                        {canEdit && <TableCell align="right" sx={{ bgcolor: "background.paper" }}>Acciones</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {players.map((player) => (
                        <TableRow
                          key={player.id}
                          sx={{
                            "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
                            ...(editingId === player.id && { bgcolor: "rgba(76,175,80,0.08)" }),
                            ...(selectedForMatch.has(player.id) && { bgcolor: "rgba(76,175,80,0.06)" }),
                          }}
                        >
                          {canEdit && (
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedForMatch.has(player.id)}
                                onChange={() => handleToggleForMatch(player.id)}
                                size="small"
                                title="Juega este partido"
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{player.name}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">{player.age ?? "—"}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {PREFERRED_POSITION_OPTIONS.find((o) => o.value === player.preferredPosition)?.label ?? "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={getPlayerScore(player)} size="small" />
                          </TableCell>
                          {canEdit && (
                            <TableCell align="right">
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => handleEdit(player)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar">
                                <IconButton size="small" onClick={() => handleRemoveClick(player)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>

                {canEdit && (
                  <Button
                    variant="contained" size="large"
                    onClick={handleBuildTeams}
                    disabled={!canBuildTeams}
                    startIcon={<BalanceIcon />}
                    sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
                  >
                    Armar equipos ({matchSize} vs {matchSize})
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Paper>
      </Container>

      {/* Delete player confirmation */}
      <Dialog open={playerToDelete !== null} onClose={() => setPlayerToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar jugador</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que querés eliminar a <strong>{playerToDelete?.name}</strong> de la lista de jugadores?
            Esta acción también lo quitará de BigQuery.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPlayerToDelete(null)} color="secondary">
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmRemove} disabled={saving}>
            {saving ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit player modal */}
      <Dialog open={isAddPlayerModalOpen} onClose={handleCloseAddPlayerModal} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PersonAddIcon color="primary" />
            <span>{editingId ? "Editar jugador" : "Agregar jugador"}</span>
          </Stack>
          <IconButton onClick={handleCloseAddPlayerModal} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              <TextField
                label="Nombre del jugador"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                fullWidth
                size="small"
              />
              <TextField
                label="Edad"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                size="small"
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { min: 0, max: 120 } }}
              />
              <FormControlLabel
                sx={{ whiteSpace: "nowrap" }}
                control={<Checkbox checked={isGoalie} onChange={(e) => setIsGoalie(e.target.checked)} />}
                label="Solo arquero"
              />
            </Stack>

            <TextField
              select
              label="Posición preferida"
              value={preferredPosition ?? ""}
              onChange={(e) => setPreferredPosition((e.target.value || null) as PreferredPosition)}
              size="small"
              fullWidth
            >
              {PREFERRED_POSITION_OPTIONS.map((opt) => (
                <MenuItem key={opt.label} value={opt.value ?? ""}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <Stack spacing={2.5}>
              {ratingFields.map((field) => (
                <Stack key={field.key} spacing={0.5}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {field.label}
                  </Typography>
                  <Slider
                    value={ratings[field.key]}
                    min={1} max={5} step={1}
                    marks={ratingMarks}
                    valueLabelDisplay="auto"
                    onChange={(_, v) => setRatings((prev) => ({ ...prev, [field.key]: v as Rating }))}
                  />
                </Stack>
              ))}
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleSubmit} sx={{ minWidth: 160 }} disabled={saving}>
                {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar jugador"}
              </Button>
              {editingId && (
                <Button variant="outlined" color="secondary" onClick={handleCloseAddPlayerModal}>
                  Cancelar
                </Button>
              )}
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
