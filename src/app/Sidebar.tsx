"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Slider,
  Stack,
  TextField,
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
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useGroup } from "./GroupContext";
import type { Player, PreferredPosition, Rating } from "@/lib/types";

const DRAWER_WIDTH = 260;

const navItems: { label: string; href: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
  { label: "Inicio", href: "/", icon: <HomeIcon /> },
  { label: "Jugadores", href: "/jugadores", icon: <PersonIcon /> },
  { label: "Equipos", href: "/equipos", icon: <GroupsIcon /> },
  { label: "Partidos", href: "/partidos", icon: <EmojiEventsIcon /> },
  { label: "Estadísticas", href: "/estadisticas", icon: <BarChartIcon /> },
  { label: "Grupo", href: "/grupo", icon: <SettingsIcon />, ownerOnly: true },
];

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  viewer: "Viewer",
};

const POSITION_OPTIONS: { value: PreferredPosition; label: string }[] = [
  { value: null, label: "Sin definir" },
  { value: "goalkeeper", label: "Arquero" },
  { value: "defense", label: "Defensa" },
  { value: "midfielder", label: "Mediocampista" },
  { value: "attacker", label: "Atacante" },
  { value: "winger", label: "Extremo" },
];

const SKILL_FIELDS: { key: keyof Player["ratings"]; label: string }[] = [
  { key: "stamina", label: "Resistencia" },
  { key: "control", label: "Control" },
  { key: "shot", label: "Disparo" },
  { key: "dribble", label: "Regate" },
  { key: "defense", label: "Defensa" },
];

function GroupSelector() {
  const { groups, currentGroup, setCurrentGroupId, refetchGroups } = useGroup();
  const { data: session } = useSession();
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [playerAge, setPlayerAge] = useState<number | "">("");
  const [playerPosition, setPlayerPosition] = useState<PreferredPosition>(null);
  const [ratings, setRatings] = useState<Player["ratings"]>({
    stamina: 3 as Rating, control: 3 as Rating, shot: 3 as Rating,
    dribble: 3 as Rating, defense: 3 as Rating,
  });

  const resetForm = () => {
    setNewGroupName("");
    setPlayerName(session?.user?.name ?? "");
    setPlayerAge("");
    setPlayerPosition(null);
    setRatings({ stamina: 3 as Rating, control: 3 as Rating, shot: 3 as Rating, dribble: 3 as Rating, defense: 3 as Rating });
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !playerName.trim()) return;
    setCreating(true);
    try {
      const player: Player = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: playerName.trim(),
        age: playerAge || undefined,
        isGoalie: playerPosition === "goalkeeper",
        preferredPosition: playerPosition,
        ratings,
      };
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim(), migrateExisting: false, player }),
      });
      if (res.ok) {
        setShowCreate(false);
        await refetchGroups();
        window.location.reload();
      }
    } finally {
      setCreating(false);
    }
  };

  const createDialog = (
    <Dialog open={showCreate} onClose={() => setShowCreate(false)} fullWidth maxWidth="sm">
      <DialogTitle>Crear grupo</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            label="Nombre del grupo"
            placeholder="Ej: Amigos fútbol viernes"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            fullWidth
            autoFocus
          />
          <Typography variant="subtitle1" fontWeight={600} sx={{ pt: 1 }}>
            Tu jugador
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
            Completá tus datos como jugador del grupo.
          </Typography>
          <TextField
            label="Nombre del jugador"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            fullWidth
            required
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
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Habilidades (1-5)
            </Typography>
            {SKILL_FIELDS.map((field) => (
              <Stack key={field.key} direction="row" alignItems="center" spacing={2}>
                <Typography variant="body2" sx={{ width: 90, flexShrink: 0 }}>
                  {field.label}
                </Typography>
                <Slider
                  value={ratings[field.key]}
                  onChange={(_, v) => setRatings((prev) => ({ ...prev, [field.key]: v as Rating }))}
                  min={1} max={5} step={1} marks
                  valueLabelDisplay="auto" size="small"
                />
                <Typography variant="body2" fontWeight={600} sx={{ width: 20, textAlign: "center" }}>
                  {ratings[field.key]}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setShowCreate(false)} color="secondary">Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleCreateGroup}
          disabled={!newGroupName.trim() || !playerName.trim() || creating}
        >
          {creating ? "Creando..." : "Crear grupo"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (groups.length <= 1) {
    if (!currentGroup) return null;
    return (
      <Box sx={{ px: 2, pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
            {currentGroup.groupName}
          </Typography>
          <Chip
            label={roleLabels[currentGroup.role] ?? currentGroup.role}
            size="small"
            variant="outlined"
            color={currentGroup.role === "owner" ? "primary" : currentGroup.role === "admin" ? "secondary" : "default"}
          />
        </Stack>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ mt: 0.5, textTransform: "none", fontSize: "0.75rem" }}
        >
          Crear grupo
        </Button>
        {createDialog}
      </Box>
    );
  }

  return (
    <Box sx={{ px: 2, pb: 1 }}>
      <TextField
        select
        fullWidth
        size="small"
        value={currentGroup?.groupId ?? ""}
        onChange={(e) => {
          setCurrentGroupId(e.target.value);
          window.location.reload();
        }}
        label="Grupo"
      >
        {groups.map((g) => (
          <MenuItem key={g.groupId} value={g.groupId}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%" }}>
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                {g.groupName}
              </Typography>
              <Chip
                label={roleLabels[g.role] ?? g.role}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: "0.65rem" }}
              />
            </Stack>
          </MenuItem>
        ))}
      </TextField>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={handleOpenCreate}
        sx={{ mt: 0.5, textTransform: "none", fontSize: "0.75rem" }}
      >
        Crear grupo
      </Button>
      {createDialog}
    </Box>
  );
}

function UserSection() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <Box sx={{ px: 2, pb: 2 }}>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<LoginIcon />}
          onClick={() => signIn("google")}
          size="small"
        >
          Iniciar sesión
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <Avatar
          src={session.user?.image ?? undefined}
          alt={session.user?.name ?? ""}
          sx={{ width: 32, height: 32 }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {session.user?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
            {session.user?.email}
          </Typography>
        </Box>
      </Stack>
      <Button
        variant="text"
        fullWidth
        startIcon={<LogoutIcon />}
        onClick={() => signOut()}
        size="small"
        color="secondary"
        sx={{ justifyContent: "flex-start" }}
      >
        Cerrar sesión
      </Button>
    </Box>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { currentGroup } = useGroup();

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

      <GroupSelector />

      <List sx={{ px: 1.5, flex: 1 }} disablePadding>
        {navItems
          .filter((item) => !item.ownerOnly || currentGroup?.role === "owner")
          .map((item) => {
          const active = pathname === item.href;
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={onClose}
              selected={active}
              disabled={!currentGroup}
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

      <UserSection />
    </Box>
  );
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/invite")) {
    return <>{children}</>;
  }

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
