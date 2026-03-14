"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import GoogleIcon from "@mui/icons-material/Google";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import type { Player, PreferredPosition, Rating } from "@/lib/types";

const POSITION_OPTIONS: { value: PreferredPosition; label: string }[] = [
  { value: null, label: "Sin definir" },
  { value: "goalkeeper", label: "Arquero" },
  { value: "defense", label: "Defensa" },
  { value: "midfielder", label: "Mediocampista" },
  { value: "attacker", label: "Atacante" },
  { value: "winger", label: "Extremo" },
];

const RATING_FIELDS: { key: keyof Player["ratings"]; label: string }[] = [
  { key: "stamina", label: "Estado Físico" },
  { key: "control", label: "Habilidad de Juego" },
  { key: "shot", label: "Disparo" },
  { key: "speed", label: "Velocidad" },
  { key: "dribble", label: "Gambeta" },
  { key: "defense", label: "Defensa" },
];

type Step = "loading" | "error" | "sign-in" | "create-player" | "joining" | "done";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const { data: session, status: sessionStatus } = useSession();

  const [groupName, setGroupName] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [playerAge, setPlayerAge] = useState<number | "">("");
  const [playerPosition, setPlayerPosition] = useState<PreferredPosition>(null);
  const [playerIsGoalie, setPlayerIsGoalie] = useState(false);
  const [playerFanOf, setPlayerFanOf] = useState("");
  const [ratings, setRatings] = useState<Player["ratings"]>({
    stamina: 3 as Rating,
    control: 3 as Rating,
    shot: 3 as Rating,
    speed: 3 as Rating,
    dribble: 3 as Rating,
    defense: 3 as Rating,
  });

  useEffect(() => {
    fetch(`/api/invite/${code}`)
      .then((r) => {
        if (!r.ok) throw new Error("Invitación inválida o expirada");
        return r.json();
      })
      .then((data) => {
        setGroupName(data.groupName);
        setStep("sign-in");
      })
      .catch((err) => {
        setError(err.message);
        setStep("error");
      });
  }, [code]);

  useEffect(() => {
    if (step !== "sign-in") return;
    if (sessionStatus === "authenticated" && session?.user) {
      setPlayerName(session.user.name ?? "");
      setStep("create-player");
    }
  }, [sessionStatus, session, step]);

  const handleJoin = async (skipPlayer: boolean) => {
    setStep("joining");
    try {
      const body: Record<string, unknown> = {};
      if (!skipPlayer && playerName.trim()) {
        body.player = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: playerName.trim(),
          age: playerAge || undefined,
          isGoalie: playerIsGoalie,
          preferredPosition: playerPosition,
          fanOf: playerFanOf.trim() || undefined,
          ratings,
        };
      }

      const res = await fetch(`/api/invite/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.ok) {
        setAlreadyMember(data.alreadyMember);
        localStorage.setItem("futbol-current-group-id", data.groupId);
        setStep("done");
        setTimeout(() => { window.location.href = "/"; }, 2000);
      } else {
        setError(data.error ?? "Error al unirse");
        setStep("error");
      }
    } catch {
      setError("Error al unirse al grupo");
      setStep("error");
    }
  };

  const updateRating = (key: keyof Player["ratings"], value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value as Rating }));
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#0b0d14",
        px: 2,
        py: 4,
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 5 },
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          bgcolor: "#13151e",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 3,
        }}
      >
        {step === "loading" && <CircularProgress />}

        {step === "error" && (
          <Stack spacing={2} alignItems="center">
            <ErrorIcon sx={{ fontSize: 56, color: "error.main" }} />
            <Typography variant="h6">{error}</Typography>
            <Button variant="outlined" onClick={() => { window.location.href = "/"; }}>
              Ir al inicio
            </Button>
          </Stack>
        )}

        {step === "done" && (
          <Stack spacing={2} alignItems="center">
            <CheckCircleIcon sx={{ fontSize: 56, color: "success.main" }} />
            <Typography variant="h6">
              {alreadyMember ? "Ya sos miembro de" : "¡Te uniste a"}
            </Typography>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              {groupName}
            </Typography>
            {!alreadyMember && (
              <Typography variant="body2" color="text.secondary">
                Fuiste agregado como Viewer.
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Redirigiendo...
            </Typography>
          </Stack>
        )}

        {step === "sign-in" && (
          <Stack spacing={3} alignItems="center">
            <SportsSoccerIcon sx={{ fontSize: 56, color: "primary.main" }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Te invitaron a unirte a
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                {groupName}
              </Typography>
            </Box>
            {sessionStatus === "loading" ? (
              <CircularProgress size={32} />
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  Iniciá sesión con Google para unirte al grupo.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<GoogleIcon />}
                  onClick={() => signIn("google", { callbackUrl: `/invite/${code}` })}
                  sx={{ textTransform: "none", fontWeight: 600, py: 1.5 }}
                >
                  Iniciar sesión con Google
                </Button>
              </>
            )}
          </Stack>
        )}

        {step === "create-player" && (
          <Stack spacing={3} alignItems="stretch" textAlign="left">
            <Box textAlign="center">
              <SportsSoccerIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>
                Creá tu jugador
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completá tus datos para unirte a <strong>{groupName}</strong>.
              </Typography>
            </Box>

            <TextField
              label="Nombre"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              fullWidth
              required
              autoFocus
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Edad"
                type="number"
                value={playerAge}
                onChange={(e) => setPlayerAge(e.target.value ? Number(e.target.value) : "")}
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { min: 10, max: 70 } }}
              />
              <TextField
                select
                label="Posición"
                value={playerPosition ?? ""}
                onChange={(e) => setPlayerPosition((e.target.value || null) as PreferredPosition)}
                fullWidth
              >
                {POSITION_OPTIONS.map((opt) => (
                  <MenuItem key={opt.label} value={opt.value ?? ""}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Hincha de"
              value={playerFanOf}
              onChange={(e) => setPlayerFanOf(e.target.value)}
              fullWidth
              placeholder="Ej: River Plate, Racing, etc."
            />

            <Stack spacing={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Habilidades (1-5)
              </Typography>
              {RATING_FIELDS.map((field) => (
                <Stack key={field.key} direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ width: 90, flexShrink: 0 }}>
                    {field.label}
                  </Typography>
                  <Slider
                    value={ratings[field.key]}
                    onChange={(_, v) => updateRating(field.key, v as number)}
                    min={1}
                    max={5}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                    size="small"
                  />
                  <Typography variant="body2" fontWeight={600} sx={{ width: 20, textAlign: "center" }}>
                    {ratings[field.key]}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Stack spacing={1}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => handleJoin(false)}
                disabled={!playerName.trim()}
                sx={{ fontWeight: 600, py: 1.5 }}
              >
                Crear jugador y unirme
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => handleJoin(true)}
                sx={{ textTransform: "none" }}
              >
                Omitir y unirme sin crear jugador
              </Button>
            </Stack>
          </Stack>
        )}

        {step === "joining" && (
          <Stack spacing={2} alignItems="center">
            <CircularProgress size={40} />
            <Typography color="text.secondary">Uniéndose al grupo...</Typography>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
