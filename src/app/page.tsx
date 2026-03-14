"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { loadMatches } from "@/lib/storage";

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

export default function HomePage() {
  const [pendingMatch, setPendingMatch] = useState<ReturnType<typeof loadMatches>[number] | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const matches = loadMatches();
    const pending = matches.find((m) => m.status === "pending") ?? null;
    setPendingMatch(pending);
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", py: 4, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth="md" disableGutters>
          <Stack direction="row" alignItems="center" spacing={2}>
            <SportsSoccerIcon sx={{ fontSize: 40, color: "primary.main" }} />
            <Box>
              <Typography variant="h4">Inicio</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Fútbol del viernes — armá equipos y registrá resultados.
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
