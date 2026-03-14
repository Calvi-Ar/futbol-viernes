"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
  IconButton,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import BarChartIcon from "@mui/icons-material/BarChart";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";

const DRAWER_WIDTH = 260;

const navItems = [
  { label: "Inicio", href: "/", icon: <HomeIcon /> },
  { label: "Jugadores", href: "/jugadores", icon: <PersonIcon /> },
  { label: "Equipos", href: "/equipos", icon: <GroupsIcon /> },
  { label: "Partidos", href: "/partidos", icon: <EmojiEventsIcon /> },
  { label: "Estadísticas", href: "/estadisticas", icon: <BarChartIcon /> },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <Box
      sx={{
        width: DRAWER_WIDTH,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#13151e",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2.5, py: 3 }}
      >
        <SportsSoccerIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h6" sx={{ fontSize: "1rem", lineHeight: 1.2 }}>
          Fútbol del
          <br />
          Viernes
        </Typography>
        {onClose && (
          <IconButton onClick={onClose} sx={{ ml: "auto" }} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Stack>

      <List sx={{ px: 1.5, flex: 1 }} disablePadding>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={onClose}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                "&.Mui-selected": {
                  bgcolor: "rgba(76,175,80,0.12)",
                  "&:hover": { bgcolor: "rgba(76,175,80,0.18)" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? "primary.main" : "text.secondary" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: active ? 700 : 500,
                  fontSize: "0.9rem",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 2.5, pb: 2, opacity: 0.5 }}
      >
        v2.0 — BigQuery
      </Typography>
    </Box>
  );
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {isDesktop ? (
        <Box component="nav" sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}>
          <SidebarContent />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: theme.zIndex.appBar,
              bgcolor: "#13151e",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              px: 2,
              py: 1,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <IconButton onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <SportsSoccerIcon sx={{ color: "primary.main" }} />
            <Typography fontWeight={700} fontSize="0.95rem">
              Fútbol del Viernes
            </Typography>
          </Box>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            PaperProps={{ sx: { bgcolor: "transparent", boxShadow: "none" } }}
          >
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </Drawer>
        </>
      )}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          pt: { xs: 8, md: 0 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
