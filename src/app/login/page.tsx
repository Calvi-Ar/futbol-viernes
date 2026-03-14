"use client";

import { signIn } from "next-auth/react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import GoogleIcon from "@mui/icons-material/Google";

export default function LoginPage() {
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
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          bgcolor: "#13151e",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 3,
        }}
      >
        <Stack spacing={3} alignItems="center">
          <SportsSoccerIcon sx={{ fontSize: 56, color: "primary.main" }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Fútbol del Viernes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Iniciá sesión para acceder al armador de equipos.
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={() => signIn("google", { callbackUrl: "/" })}
            sx={{ textTransform: "none", fontWeight: 600, py: 1.5 }}
          >
            Iniciar sesión con Google
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
