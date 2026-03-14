"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import ShareIcon from "@mui/icons-material/Share";
import { useGroup, type GroupRole } from "@/app/GroupContext";
import { groupFetch } from "@/lib/api-client";
import type { Player } from "@/lib/types";

type Member = {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: GroupRole;
  linkedPlayerId: string | null;
};

const roleLabels: Record<GroupRole, string> = {
  owner: "Owner",
  admin: "Admin",
  viewer: "Viewer",
};

const roleColors: Record<GroupRole, "primary" | "secondary" | "default"> = {
  owner: "primary",
  admin: "secondary",
  viewer: "default",
};

export default function GrupoPage() {
  const { currentGroup, loading: groupLoading } = useGroup();
  const [members, setMembers] = useState<Member[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<GroupRole>("viewer");
  const [inviting, setInviting] = useState(false);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkMember, setLinkMember] = useState<Member | null>(null);
  const [linkPlayerId, setLinkPlayerId] = useState("");

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const isOwner = currentGroup?.role === "owner";

  const inviteUrl = inviteCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteCode}`
    : null;

  const fetchData = useCallback(async () => {
    if (!currentGroup) return;
    setLoading(true);
    try {
      const [membersRes, playersRes] = await Promise.all([
        fetch(`/api/groups/${currentGroup.groupId}/members`),
        groupFetch("/api/players"),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (playersRes.ok) setPlayers(await playersRes.json());
    } catch {
      setError("Error al cargar datos del grupo");
    } finally {
      setLoading(false);
    }
  }, [currentGroup]);

  const fetchInviteCode = useCallback(async () => {
    if (!currentGroup || !isOwner) return;
    try {
      const res = await fetch(`/api/groups/${currentGroup.groupId}/invite`);
      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.code);
      }
    } catch { /* ignore */ }
  }, [currentGroup, isOwner]);

  const handleRegenerateCode = async () => {
    if (!currentGroup) return;
    const res = await fetch(`/api/groups/${currentGroup.groupId}/invite`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setInviteCode(data.code);
      setSuccess("Link de invitación regenerado");
    }
  };

  const handleCopyInvite = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (!groupLoading && currentGroup) {
      fetchData();
      fetchInviteCode();
    }
  }, [groupLoading, currentGroup, fetchData, fetchInviteCode]);

  const handleAddMember = async () => {
    if (!currentGroup || !inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${currentGroup.groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        setSuccess(`${inviteEmail.trim()} agregado como ${roleLabels[inviteRole]}`);
        setInviteEmail("");
        setInviteRole("viewer");
        setAddDialogOpen(false);
        await fetchData();
      } else {
        const data = await res.json();
        setError(data.error ?? "Error al agregar miembro");
      }
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId: string, role: GroupRole) => {
    if (!currentGroup) return;
    setError(null);
    const res = await fetch(`/api/groups/${currentGroup.groupId}/members`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) {
      setSuccess("Rol actualizado");
      await fetchData();
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al cambiar rol");
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!currentGroup) return;
    if (!confirm(`¿Eliminar a ${name} del grupo?`)) return;
    setError(null);
    const res = await fetch(
      `/api/groups/${currentGroup.groupId}/members?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setSuccess(`${name} eliminado del grupo`);
      await fetchData();
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al eliminar miembro");
    }
  };

  const handleLinkPlayer = async () => {
    if (!currentGroup || !linkMember) return;
    const res = await fetch(`/api/groups/${currentGroup.groupId}/members`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: linkMember.userId,
        linkedPlayerId: linkPlayerId || null,
      }),
    });
    if (res.ok) {
      setSuccess(`Jugador vinculado a ${linkMember.name}`);
      setLinkDialogOpen(false);
      setLinkMember(null);
      setLinkPlayerId("");
      await fetchData();
    }
  };

  const openLinkDialog = (member: Member) => {
    setLinkMember(member);
    setLinkPlayerId(member.linkedPlayerId ?? "");
    setLinkDialogOpen(true);
  };

  if (!currentGroup) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">Seleccioná un grupo primero.</Typography>
      </Box>
    );
  }

  if (currentGroup.role !== "owner") {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">Solo el Owner puede acceder a esta página.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", py: 4, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth="md" disableGutters>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <SettingsIcon sx={{ color: "primary.main" }} />
                <Typography variant="h4">{currentGroup.groupName}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Gestión del grupo — miembros y roles.
              </Typography>
            </Box>
            {isOwner && (
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setAddDialogOpen(true)}
              >
                Agregar miembro
              </Button>
            )}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ pt: 3, px: { xs: 2, sm: 4 } }} disableGutters>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {isOwner && inviteUrl && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ShareIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Link de invitación
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Compartí este link para que otros jugadores se unan al grupo como Viewers.
                Después podés cambiarles el rol.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField
                  value={inviteUrl}
                  size="small"
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                  sx={{ "& input": { fontSize: "0.85rem" } }}
                />
                <Stack direction="row" spacing={1} flexShrink={0}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyInvite}
                  >
                    {inviteCopied ? "¡Copiado!" : "Copiar"}
                  </Button>
                  <Tooltip title="Regenerar link (invalida el anterior)">
                    <IconButton size="small" onClick={handleRegenerateCode}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        )}

        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Miembro</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Jugador vinculado</TableCell>
                {isOwner && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Cargando...</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => {
                  const linkedPlayer = players.find((p) => p.id === m.linkedPlayerId);
                  return (
                    <TableRow key={m.userId}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar src={m.avatarUrl} alt={m.name} sx={{ width: 32, height: 32 }} />
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {m.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {m.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {isOwner && m.role !== "owner" ? (
                          <TextField
                            select
                            size="small"
                            value={m.role}
                            onChange={(e) => handleChangeRole(m.userId, e.target.value as GroupRole)}
                            sx={{ minWidth: 120 }}
                          >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="viewer">Visor</MenuItem>
                          </TextField>
                        ) : (
                          <Chip
                            label={roleLabels[m.role]}
                            size="small"
                            color={roleColors[m.role]}
                            variant={m.role === "owner" ? "filled" : "outlined"}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {linkedPlayer ? (
                          <Chip label={linkedPlayer.name} size="small" variant="outlined" icon={<LinkIcon />} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Sin vincular
                          </Typography>
                        )}
                      </TableCell>
                      {isOwner && (
                        <TableCell align="right">
                          <Tooltip title="Vincular jugador">
                            <IconButton size="small" onClick={() => openLinkDialog(m)}>
                              {m.linkedPlayerId ? <LinkIcon fontSize="small" color="primary" /> : <LinkOffIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          {m.role !== "owner" && (
                            <Tooltip title="Eliminar del grupo">
                              <IconButton size="small" onClick={() => handleRemoveMember(m.userId, m.name)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>

        {!isOwner && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Solo el Owner del grupo puede gestionar miembros y roles.
          </Alert>
        )}
      </Container>

      {/* Add member dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Agregar miembro</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Email del usuario"
              placeholder="ejemplo@gmail.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              fullWidth
              autoFocus
              helperText="El usuario debe haber iniciado sesión al menos una vez."
            />
            <TextField
              select
              label="Rol"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as GroupRole)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="viewer">Visor</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)} color="secondary">Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAddMember}
            disabled={!inviteEmail.trim() || inviting}
          >
            {inviting ? "Agregando..." : "Agregar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link player dialog */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Vincular jugador a {linkMember?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Vinculá un jugador del grupo a esta cuenta de usuario. Esto permite
              resaltar sus estadísticas personales.
            </Typography>
            <TextField
              select
              label="Jugador"
              value={linkPlayerId}
              onChange={(e) => setLinkPlayerId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>Sin vincular</em>
              </MenuItem>
              {players.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLinkDialogOpen(false)} color="secondary">Cancelar</Button>
          <Button variant="contained" onClick={handleLinkPlayer}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
