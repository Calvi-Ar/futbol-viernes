"use client";

import { useEffect, useRef, useState } from "react";
import { groupFetch } from "@/lib/api-client";
import { useGroup } from "@/app/GroupContext";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import {
  Box,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

type PlayerStats = {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  matchesWon: number;
  totalGoals: number;
};

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"] as const;

function RankingTable({
  title,
  icon,
  rows,
  valueLabel,
  getValue,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  rows: PlayerStats[];
  valueLabel: string;
  getValue: (s: PlayerStats) => number;
  emptyText: string;
}) {
  const sorted = [...rows].sort((a, b) => getValue(b) - getValue(a));

  return (
    <Paper
      sx={{
        flex: 1,
        minWidth: { xs: 0, sm: 300 },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2.5, py: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {icon}
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
      </Stack>

      {sorted.length === 0 ? (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {emptyText}
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 340 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 50, bgcolor: "background.paper" }}>#</TableCell>
                <TableCell sx={{ bgcolor: "background.paper" }}>Jugador</TableCell>
                <TableCell align="right" sx={{ bgcolor: "background.paper" }}>
                  {valueLabel}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((s, i) => {
                const val = getValue(s);
                if (val === 0) return null;
                return (
                  <TableRow key={s.playerId} sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.03)" } }}>
                    <TableCell>
                      {i < 3 ? (
                        <MilitaryTechIcon sx={{ color: MEDAL_COLORS[i], fontSize: 22 }} />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {i + 1}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={i < 3 ? 700 : 400}>
                        {s.playerName || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={val}
                        size="small"
                        color={i === 0 ? "primary" : "default"}
                        variant={i < 3 ? "filled" : "outlined"}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

export default function EstadisticasPage() {
  const { currentGroup, loading: groupLoading } = useGroup();
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevGroupRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (groupLoading || !currentGroup) return;

    if (prevGroupRef.current && prevGroupRef.current !== currentGroup.groupId) {
      setStats([]);
      setLoading(true);
      setError(null);
    }
    prevGroupRef.current = currentGroup.groupId;

    groupFetch("/api/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stats");
        return r.json();
      })
      .then((data: PlayerStats[]) => setStats(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupLoading, currentGroup]);

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", py: 4, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth="lg" disableGutters>
          <Typography variant="h4" sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}>Estadísticas</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Rankings históricos basados en todos los partidos finalizados.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: 3, px: { xs: 2, sm: 4 } }} disableGutters>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems="stretch"
          >
            <RankingTable
              title="Más partidos jugados"
              icon={<SportsSoccerIcon color="primary" />}
              rows={stats}
              valueLabel="Partidos"
              getValue={(s) => s.matchesPlayed}
              emptyText="No hay partidos registrados todavía."
            />
            <RankingTable
              title="Goleadores históricos"
              icon={<EmojiEventsIcon sx={{ color: "#FFD700" }} />}
              rows={stats}
              valueLabel="Goles"
              getValue={(s) => s.totalGoals}
              emptyText="No hay goles registrados todavía."
            />
            <RankingTable
              title="Más partidos ganados"
              icon={<WorkspacePremiumIcon sx={{ color: "#FFD700" }} />}
              rows={stats}
              valueLabel="Victorias"
              getValue={(s) => s.matchesWon}
              emptyText="No hay partidos finalizados todavía."
            />
          </Stack>
        )}
      </Container>
    </Box>
  );
}
