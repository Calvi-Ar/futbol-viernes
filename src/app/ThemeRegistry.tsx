"use client";

import { PropsWithChildren, useMemo } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

export default function ThemeRegistry({ children }: PropsWithChildren) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "dark",
          primary: { main: "#4caf50" },
          secondary: { main: "#90caf9" },
          background: {
            default: "#0f1117",
            paper: "#1a1d27",
          },
          text: {
            primary: "#e8eaed",
            secondary: "#9aa0a6",
          },
          divider: "rgba(255,255,255,0.08)",
        },
        shape: { borderRadius: 14 },
        typography: {
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          h4: { fontWeight: 800, letterSpacing: "-0.02em" },
          h6: { fontWeight: 700 },
          subtitle2: { fontWeight: 600, fontSize: "0.8rem", letterSpacing: "0.04em", textTransform: "uppercase" as const },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
                border: "1px solid rgba(255,255,255,0.06)",
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none" as const,
                fontWeight: 600,
                borderRadius: 10,
                padding: "10px 24px",
              },
              contained: {
                boxShadow: "0 2px 12px rgba(76,175,80,0.3)",
                "&:hover": {
                  boxShadow: "0 4px 20px rgba(76,175,80,0.45)",
                },
              },
            },
          },
          MuiSlider: {
            styleOverrides: {
              root: {
                height: 6,
              },
              thumb: {
                width: 18,
                height: 18,
              },
              markLabel: {
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.5)",
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                fontWeight: 600,
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              },
              head: {
                fontWeight: 700,
                fontSize: "0.75rem",
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.5)",
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundImage: "none",
              },
            },
          },
        },
      }),
    []
  );

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
