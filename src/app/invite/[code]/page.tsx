"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import GoogleIcon from "@mui/icons-material/Google";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [groupName, setGroupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${code}`)
      .then((r) => {
        if (!r.ok) throw new Error("Invitación inválida o expirada");
        return r.json();
      })
      .then((data) => setGroupName(data.groupName))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user || !groupName || joined || joining) return;

    setJoining(true);
    fetch(`/api/invite/${code}`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setJoined(true);
          setAlreadyMember(data.alreadyMember);
          localStorage.setItem("futbol-current-group-id", data.groupId);
          setTimeout(() => router.push("/"), 2000);
        } else {
          setError(data.error ?? "Error al unirse");
        }
      })
      .catch(() => setError("Error al unirse al grupo"))
      .finally(() => setJoining(false));
  }, [sessionStatus, session, groupName, code, joined, joining, router]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#0b0d14",
        px: 2,
      }}
    >
      <Paper
        sx={{
          p: 5,
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
          bgcolor: "#13151e",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 3,
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Stack spacing={2} alignItems="center">
            <ErrorIcon sx={{ fontSize: 56, color: "error.main" }} />
            <Typography variant="h6">{error}</Typography>
            <Button variant="outlined" onClick={() => router.push("/")}>
              Ir al inicio
            </Button>
          </Stack>
        ) : joined ? (
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
                Fuiste agregado como visor.
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Redirigiendo...
            </Typography>
          </Stack>
        ) : (
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

            {sessionStatus === "loading" || joining ? (
              <CircularProgress size={32} />
            ) : sessionStatus === "unauthenticated" ? (
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
            ) : (
              <CircularProgress size={32} />
            )}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
