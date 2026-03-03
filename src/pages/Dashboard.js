import React, { useState } from 'react';
import {
  Box, Typography, IconButton,
  Grid, Paper, Snackbar, Alert, Tooltip, Chip, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Divider, Button, AppBar, Toolbar, Switch,
} from '@mui/material';
import {
  AccountBalance, Logout, TrendingUp, TrendingDown, Savings, Warning,
  SwapHoriz, Dashboard as DashboardIcon, History, Person, Menu as MenuIcon,
  SaveAlt, CheckCircle, ReceiptLong, Category as CategoryIcon,
  CreditCard, DarkMode, LightMode, ManageSearch,
} from '@mui/icons-material';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useThemeMode } from '../context/ThemeContext';
import { useExchangeRate } from '../hooks/useExchangeRate';
import FinanceTable from '../components/FinanceTable';
//import PieChart from '../components/PieChart';
import RadarChart from '../components/RadarChart';
import SummaryCard from '../components/SummaryCard';
import BarChart from '../components/BarChart';
import MonthNavigator from '../components/MonthNavigator';
import HistoryPage from './HistoryPage';
import UserProfile from './UserProfile';
import CategoriesPage from './CategoriesPage';
import ExpensesPage from './ExpensesPage';
import CardsPage from './CardsPage';
import LogsPage from './LogsPage';
import { FULL_VERSION } from '../version';
import IncomesPage from './IncomesPage';

const DRAWER_W = 240;

const NAV_ITEMS = [
  { label: 'Dashboard',  icon: <DashboardIcon fontSize="small" />, path: '/' },
  { label: 'Gastos',     icon: <ReceiptLong fontSize="small" />,   path: '/expenses' },
  { label: 'Ingresos',   icon: <Savings fontSize="small" />,       path: '/incomes' },
  { label: 'Tarjetas',   icon: <CreditCard fontSize="small" />,    path: '/cards' },
  { label: 'Categorías', icon: <CategoryIcon fontSize="small" />,  path: '/categories' },
  { label: 'Historial',  icon: <History fontSize="small" />,       path: '/history' },
  { label: 'Auditoría',  icon: <ManageSearch fontSize="small" />,  path: '/logs' },
];

// ─── Sidebar ─────────────────────────────────────────────────
function SidebarContent({ onNav }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();

  const go = (path) => { navigate(path); onNav?.(); };

  const sidebarBg = isDark ? '#0b1c38' : '#1a3a6b';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: sidebarBg }}>
      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, flexShrink: 0, background: 'linear-gradient(135deg, #4fc3f7, #00e5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AccountBalance sx={{ color: '#0a1628', fontSize: 20 }} />
        </Box>
        <Typography sx={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.5px', color: '#fff' }}>
          Finanzas<Box component="span" sx={{ color: '#4fc3f7' }}>Pro</Box>
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Nav items */}
      <List sx={{ flex: 1, px: 1.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
        {NAV_ITEMS.map(({ label, icon, path }) => {
          const active = location.pathname === path;
          return (
            <ListItem key={path} disablePadding>
              <ListItemButton onClick={() => go(path)} sx={{
                borderRadius: 2, px: 1.5, py: 0.9,
                bgcolor: active ? 'rgba(79,195,247,0.18)' : 'transparent',
                border: `1px solid ${active ? 'rgba(79,195,247,0.35)' : 'transparent'}`,
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'rgba(79,195,247,0.1)', borderColor: 'rgba(79,195,247,0.2)' },
              }}>
                <ListItemIcon sx={{ minWidth: 32, color: active ? '#4fc3f7' : 'rgba(255,255,255,0.5)' }}>
                  {icon}
                </ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ fontFamily: 'Syne', fontWeight: active ? 700 : 400, fontSize: '0.875rem', color: active ? '#4fc3f7' : 'rgba(255,255,255,0.85)' }} />
                {active && <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#4fc3f7' }} />}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Toggle tema */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        {isDark ? <DarkMode sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }} /> : <LightMode sx={{ color: '#ffca28', fontSize: 18 }} />}
        <Typography sx={{ fontFamily: 'Syne', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', flex: 1 }}>
          {isDark ? 'Modo oscuro' : 'Modo claro'}
        </Typography>
        <Switch
          size="small"
          checked={!isDark}
          onChange={toggleTheme}
          sx={{
            '& .MuiSwitch-thumb': { bgcolor: isDark ? 'rgba(255,255,255,0.4)' : '#ffca28' },
            '& .MuiSwitch-track': { bgcolor: isDark ? 'rgba(255,255,255,0.15) !important' : 'rgba(255,202,40,0.4) !important' },
          }}
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Perfil + logout */}
      <Box sx={{ p: 2 }}>
        <Box onClick={() => go('/profile')} sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, cursor: 'pointer',
          bgcolor: 'rgba(79,195,247,0.07)', border: '1px solid rgba(79,195,247,0.12)',
          transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(79,195,247,0.13)' },
        }}>
          <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: 'rgba(79,195,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
            {user?.avatar || user?.name?.charAt(0) || 'U'}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.8rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </Typography>
            <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
        <Button fullWidth size="small" startIcon={<Logout sx={{ fontSize: '0.9rem !important' }} />} onClick={logout}
          sx={{ mt: 1, fontFamily: 'Syne', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#ff5252', bgcolor: 'rgba(255,82,82,0.08)' } }}>
          Cerrar sesión
        </Button>
        {/* Versión */}
        <Typography variant="caption" sx={{
          display: 'block', textAlign: 'center',
          color: 'rgba(255,255,255,0.15)', fontFamily: 'DM Mono',
          fontSize: '0.6rem', pb: 0.5,
        }}>
           { FULL_VERSION }
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Dashboard Home ──────────────────────────────────────────
function DashboardHome() {
  const { totalMes, ahorroMes, pctGastos, pctCarro, alertaCarro, ingreso, activeMonthLabel, saveSnapshot } = useFinance();
  const { rate } = useExchangeRate();
  const [alertaDismissed, setAlertaDismissed] = useState(false);
  const [snapshotDone, setSnapshotDone]       = useState(false);

  const fmt    = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
  const fmtUSD = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const handleSnapshot = () => { saveSnapshot(); setSnapshotDone(true); setTimeout(() => setSnapshotDone(false), 2500); };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Syne', fontWeight: 800, letterSpacing: '-1px' }}>Resumen mensual</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Controla tus finanzas y alcanza tus metas de ahorro</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <MonthNavigator />
          <Tooltip title={snapshotDone ? '¡Guardado!' : 'Guardar en historial'}>
            <Button size="small" variant="outlined"
              startIcon={snapshotDone ? <CheckCircle /> : <SaveAlt />}
              onClick={handleSnapshot}
              sx={{ borderColor: snapshotDone ? '#69f0ae' : 'rgba(79,195,247,0.3)', color: snapshotDone ? '#69f0ae' : 'primary.main', fontFamily: 'Syne', fontSize: '0.75rem' }}>
              {snapshotDone ? 'Guardado' : 'Guardar'}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}><SummaryCard title="Ingreso mensual" value={fmt(ingreso)} sub={`${fmtUSD(ingreso * rate)} USD`} icon={<TrendingUp />} color="#4fc3f7" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><SummaryCard title="Total gastos" value={fmt(totalMes)} sub={`${pctGastos}% del ingreso`} icon={<TrendingDown />} color="#ff5252" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><SummaryCard title="Ahorro estimado" value={fmt(ahorroMes)} sub={ahorroMes >= 0 ? 'Excelente 🎯' : 'Déficit ⚠️'} icon={<Savings />} color={ahorroMes >= 0 ? '#69f0ae' : '#ff5252'} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><SummaryCard title="Abono carro" value={`${pctCarro}%`} sub={alertaCarro ? '¡Supera el umbral! ⚠️' : 'Del ingreso mensual'} icon={<Warning />} color={alertaCarro ? '#ffca28' : '#90caf9'} /></Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, height: 340, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: '0.92rem' }}>Gastos por categoría · semanas</Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}><RadarChart /></Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2.5, height: 340, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: '0.92rem' }}>Gastos por semana</Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}><BarChart /></Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: { xs: 1.5, md: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '0.92rem' }}>Tabla de gastos — {activeMonthLabel}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Haz clic en una celda para editar</Typography>
        </Box>
        <FinanceTable />
      </Paper>

      <Snackbar open={alertaCarro && !alertaDismissed} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} onClose={() => setAlertaDismissed(true)} autoHideDuration={8000}>
        <Alert severity="warning" variant="filled" onClose={() => setAlertaDismissed(true)} sx={{ borderRadius: 2 }}>
          ⚠️ El abono al carro supera el umbral ({pctCarro}%). Considera ajustar tu presupuesto.
        </Alert>
      </Snackbar>
    </>
  );
}

// ─── Layout principal ────────────────────────────────────────
export default function Dashboard() {
  const { rate }  = useExchangeRate();
  const { isDark } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  const topbarBg = isDark
    ? 'rgba(11,28,56,0.97)'
    : 'rgba(255,255,255,0.97)';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Sidebar desktop */}
      <Box component="aside" sx={{
        width: DRAWER_W, flexShrink: 0,
        display: { xs: 'none', md: 'flex' }, flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        borderRight: '1px solid rgba(79,195,247,0.08)',
        overflowY: 'auto',
      }}>
        <SidebarContent />
      </Box>

      {/* Drawer móvil */}
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_W } }}>
        <SidebarContent onNav={() => setMobileOpen(false)} />
      </Drawer>

      {/* Main */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: topbarBg, backdropFilter: 'blur(16px)' }}>
          <Toolbar sx={{ gap: 1, minHeight: '52px !important' }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { xs: 'flex', md: 'none' }, color: 'text.primary' }}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1rem', display: { xs: 'block', md: 'none' }, flex: 1 }}>
              Finanzas<Box component="span" sx={{ color: '#4fc3f7' }}>Pro</Box>
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Chip
              icon={<SwapHoriz sx={{ fontSize: '14px !important' }} />}
              label={`1 MXN = ${rate.toFixed(4)} USD`}
              size="small"
              sx={{ fontFamily: 'DM Mono', fontSize: '0.68rem', bgcolor: 'rgba(79,195,247,0.1)', color: '#4fc3f7', border: '1px solid rgba(79,195,247,0.2)', height: 26 }}
            />
          </Toolbar>
        </AppBar>

        {/* Contenido */}
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 } }}>
          <Routes>
            <Route path="/"           element={<DashboardHome />} />
            <Route path="/expenses"   element={<ExpensesPage />} />
            <Route path="/incomes"    element={<IncomesPage />} />
            <Route path="/cards"      element={<CardsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/history"    element={<HistoryPage />} />
            <Route path="/profile"    element={<UserProfile />} />
            <Route path="/logs"       element={<LogsPage />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}
