"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { loadMatches } from "@/lib/storage";
import { useGroup } from "./GroupContext";

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

function CreateGroupDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [migrateExisting, setMigrateExisting] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), migrateExisting }),
      });
      if (res.ok) {
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Crear grupo</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Nombre del grupo"
            placeholder="Ej: Amigos fútbol viernes"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
          />
          <FormControlLabel
            control={
              <Switch
                checked={migrateExisting}
                onChange={(e) => setMigrateExisting(e.target.checked)}
              />
            }
            label="Migrar jugadores y partidos existentes a este grupo"
          />
          <Typography variant="caption" color="text.secondary">
            Si ya tenés jugadores y partidos cargados, activá esta opción para
            asociarlos al nuevo grupo.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="secondary">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!name.trim() || saving}
        >
          {saving ? "Creando..." : "Crear grupo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function HomePage() {
  const { currentGroup, groups, loading, refetchGroups } = useGroup();
  const [pendingMatch, setPendingMatch] = useState<ReturnType<typeof loadMatches>[number] | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    const matches = loadMatches();
    const pending = matches.find((m) => m.status === "pending") ?? null;
    setPendingMatch(pending);
    setHydrated(true);
  }, []);

  if (!hydrated || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (groups.length === 0) {
    return (
      <Box sx={{ pb: 8 }}>
        <Container maxWidth="sm" sx={{ pt: 10, textAlign: "center" }}>
          <Paper sx={{ p: 5 }}>
            <SportsSoccerIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              ¡Bienvenido!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Para empezar, creá tu primer grupo. Un grupo reúne a los
              jugadores que se juntan a jugar, y te permite gestionar equipos,
              partidos y estadísticas.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateGroup(true)}
            >
              Crear grupo
            </Button>
          </Paper>
        </Container>
        <CreateGroupDialog
          open={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onCreated={async () => {
            setShowCreateGroup(false);
            await refetchGroups();
            window.location.reload();
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", py: 4, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth="md" disableGutters>
          <Stack direction="row" alignItems="center" spacing={2}>
            <SportsSoccerIcon sx={{ fontSize: 40, color: "primary.main" }} />
            <Box>
              <Typography variant="h4">Inicio</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {currentGroup?.groupName} — armá equipos y registrá resultados.
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ pt: 4, px: { xs: 2, sm: 4 } }} disableGutters>
        <Stack spacing={3}>
          {pendingMatch ? (
            <Paper sx={{ p: 3, border: "1px solid rgba(76,175,80,0.3)", bgcolor: "rgba(76,175,80,0.06)" }}>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EmojiEventsIcon color="warning" />
                  <Typography variant="h6">Partido pendiente</Typography>
                </Stack>
                <Typography color="text.secondary">
                  Hay un partido programado para el <strong>{formatDate(pendingMatch.date)}</strong>.
                  Cuando terminen de jugar, ingresá el resultado.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    component={Link}
                    href="/partidos?open=pending"
                    variant="contained"
                    size="large"
                    startIcon={<EmojiEventsIcon />}
                  >
                    Ingresar resultado
                  </Button>
                  <Button component={Link} href="/partidos?expand=pending" variant="outlined" size="large">
                    Ver equipos
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <SportsSoccerIcon sx={{ fontSize: 56, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No hay partido pendiente
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Armá los equipos y confirmá el partido para empezar.
              </Typography>
              <Button
                component={Link}
                href="/equipos"
                variant="contained"
                size="large"
                startIcon={<GroupsIcon />}
              >
                Ir a Equipos
              </Button>
            </Paper>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap>
            <Button
              component={Link}
              href="/equipos"
              variant="outlined"
              fullWidth
              startIcon={<GroupsIcon />}
              sx={{ py: 2 }}
            >
              Equipos
            </Button>
            <Button
              component={Link}
              href="/partidos"
              variant="outlined"
              fullWidth
              startIcon={<EmojiEventsIcon />}
              sx={{ py: 2 }}
            >
              Partidos
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
