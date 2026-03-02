import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, TextField, MenuItem, Select, FormControl,
  InputLabel, Button, IconButton, Tooltip, Grid, Collapse, Alert,
  InputAdornment, ToggleButton, ToggleButtonGroup, Divider, LinearProgress,
} from '@mui/material';
import {
  Search, FileDownload, Delete, ExpandMore, ExpandLess,
  FilterList, Refresh, Info, BarChart,
} from '@mui/icons-material';
import { AuditService, AUDIT_ACTIONS } from '../firebase/services';
import { useAuth } from '../context/AuthContext';

const LOG_ACTIONS = AUDIT_ACTIONS;

// ─── Colores de severidad ─────────────────────────────────────
const SEVERITY_COLORS = {
  info:    { bg: 'rgba(79,195,247,0.12)',  color: '#4fc3f7',  border: 'rgba(79,195,247,0.3)'  },
  success: { bg: 'rgba(67,160,71,0.12)',   color: '#43a047',  border: 'rgba(67,160,71,0.3)'   },
  warning: { bg: 'rgba(249,168,37,0.12)',  color: '#f9a825',  border: 'rgba(249,168,37,0.3)'  },
  error:   { bg: 'rgba(229,57,53,0.12)',   color: '#e53935',  border: 'rgba(229,57,53,0.3)'   },
};

// ─── Módulos únicos ───────────────────────────────────────────
const MODULES = [...new Set(Object.values(LOG_ACTIONS).map((a) => a.module))].sort();

// ─── Fila expandible de log ───────────────────────────────────
function LogRow({ entry }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY_COLORS[entry.severity] || SEVERITY_COLORS.info;
  const time = new Date(entry.timestamp);

  const hasDiff = entry.before || entry.after;

  return (
    <>
      <TableRow
        onClick={() => setOpen(!open)}
        sx={{
          cursor: hasDiff ? 'pointer' : 'default',
          '&:hover td': { bgcolor: 'rgba(79,195,247,0.03)' },
          '& td': { borderBottom: open ? 'none' : undefined },
        }}
      >
        {/* Timestamp */}
        <TableCell sx={{ whiteSpace: 'nowrap', py: 1 }}>
          <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'text.primary' }}>
            {time.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
          </Typography>
          <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.65rem', color: 'text.secondary' }}>
            {time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Typography>
        </TableCell>

        {/* Módulo */}
        <TableCell sx={{ py: 1 }}>
          <Chip label={entry.module} size="small" sx={{ fontFamily: 'DM Mono', fontSize: '0.65rem', height: 20, bgcolor: 'rgba(79,195,247,0.08)', color: '#4fc3f7' }} />
        </TableCell>

        {/* Acción */}
        <TableCell sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <span style={{ fontSize: '0.95rem' }}>{entry.icon}</span>
            <Box>
              <Typography sx={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '0.8rem' }}>
                {entry.label}
              </Typography>
              {entry.detail && (
                <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'text.secondary', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.detail}
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>

        {/* Usuario */}
        <TableCell sx={{ py: 1 }}>
          <Typography sx={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '0.78rem' }}>{entry.userName || '—'}</Typography>
          <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.62rem', color: 'text.secondary' }}>{entry.email}</Typography>
        </TableCell>

        {/* Severidad */}
        <TableCell sx={{ py: 1 }} align="center">
          <Chip
            label={entry.severity}
            size="small"
            sx={{ fontFamily: 'DM Mono', fontSize: '0.62rem', height: 18, bgcolor: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}
          />
        </TableCell>

        {/* Contexto */}
        <TableCell sx={{ py: 1 }}>
          <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.62rem', color: 'text.disabled' }}>
            {entry.device} · {entry.browser}
          </Typography>
        </TableCell>

        {/* Expandir */}
        <TableCell sx={{ py: 1 }} align="right">
          {hasDiff && (
            <IconButton size="small" sx={{ color: 'text.secondary' }}>
              {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
      </TableRow>

      {/* Fila expandida: before/after diff */}
      {hasDiff && (
        <TableRow>
          <TableCell colSpan={7} sx={{ py: 0, px: 2 }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1.5 }}>
                <Grid container spacing={2}>
                  {entry.before && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 1, color: '#f9a825', display: 'block', mb: 0.5 }}>
                        Antes
                      </Typography>
                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(249,168,37,0.05)', border: '1px solid rgba(249,168,37,0.15)', fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 150, overflow: 'auto' }}>
                        {JSON.stringify(JSON.parse(entry.before), null, 2)}
                      </Box>
                    </Grid>
                  )}
                  {entry.after && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 1, color: '#43a047', display: 'block', mb: 0.5 }}>
                        Después
                      </Typography>
                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(67,160,71,0.05)', border: '1px solid rgba(67,160,71,0.15)', fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 150, overflow: 'auto' }}>
                        {JSON.stringify(JSON.parse(entry.after), null, 2)}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────
export default function LogsPage() {
  const { user } = useAuth();
  const [logs,          setLogs]          = useState([]);
  const [search,        setSearch]        = useState('');
  const [filterModule,  setFilterModule]  = useState('all');
  const [filterSeverity,setFilterSeverity]= useState('all');
  const [showStats,     setShowStats]     = useState(false);
  const [confirmClear,  setConfirmClear]  = useState(false);
  const [page,          setPage]          = useState(0);
  const [fetching,      setFetching]      = useState(false);
  const PAGE_SIZE = 50;

  const loadLogs = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const data = await AuditService.getAll(user.uid, 1000);
      setLogs(data);
    } catch (e) {
      console.error('Error cargando logs:', e);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const byModule = {}, bySeverity = {}, byDay = {};
    let todayCount = 0;
    logs.forEach((l) => {
      byModule[l.module]     = (byModule[l.module]     || 0) + 1;
      bySeverity[l.severity] = (bySeverity[l.severity] || 0) + 1;
      const day = (l.timestamp || '').split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
      if (day === today) todayCount++;
    });
    return {
      total: logs.length, todayCount, byModule, bySeverity, byDay,
      oldest: logs[logs.length-1]?.timestamp || null,
      newest: logs[0]?.timestamp || null,
    };
  }, [logs]);

  // Filtros aplicados
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchMod = filterModule   === 'all' || l.module   === filterModule;
      const matchSev = filterSeverity === 'all' || l.severity === filterSeverity;
      const matchSrc = !search || [l.label,l.detail,l.email,l.userName,l.module].some(
        (v) => (v||'').toLowerCase().includes(search.toLowerCase())
      );
      return matchMod && matchSev && matchSrc;
    });
  }, [logs, search, filterModule, filterSeverity]);

  const paged = filtered.slice(0, (page + 1) * PAGE_SIZE);

  const handleClear = () => {
    // Con Firebase no borramos la BD — solo ocultamos localmente
    setLogs([]);
    setConfirmClear(false);
  };

  // Barras de módulos para estadísticas
  const maxModuleCount = Math.max(...Object.values(stats.byModule || {}), 1);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Syne', fontWeight: 800, letterSpacing: '-1px' }}>
            Auditoría y logs
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {stats.total} registros · {stats.todayCount} hoy
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Ver estadísticas">
            <Button size="small" variant="outlined" startIcon={<BarChart />} onClick={() => setShowStats(!showStats)}
              sx={{ borderColor: 'rgba(79,195,247,0.3)', color: 'primary.main', fontFamily: 'Syne', fontSize: '0.75rem' }}>
              Stats
            </Button>
          </Tooltip>
          <Tooltip title="Actualizar">
            <Button size="small" variant="outlined" startIcon={<Refresh />} onClick={loadLogs}
              sx={{ borderColor: 'rgba(79,195,247,0.3)', color: 'primary.main', fontFamily: 'Syne', fontSize: '0.75rem' }}>
              Actualizar
            </Button>
          </Tooltip>
          <Tooltip title="Exportar CSV (compatible con Excel)">
            <Button size="small" variant="outlined" startIcon={<FileDownload />} onClick={() => AuditService.exportCSV(filtered)}
              sx={{ borderColor: 'rgba(67,160,71,0.3)', color: '#43a047', fontFamily: 'Syne', fontSize: '0.75rem' }}>
              CSV
            </Button>
          </Tooltip>
          <Tooltip title="Exportar JSON">
            <Button size="small" variant="outlined" startIcon={<FileDownload />} onClick={() => AuditService.exportJSON(filtered)}
              sx={{ borderColor: 'rgba(79,195,247,0.3)', color: 'primary.main', fontFamily: 'Syne', fontSize: '0.75rem' }}>
              JSON
            </Button>
          </Tooltip>
          <Tooltip title="Limpiar todos los logs">
            <Button size="small" variant="outlined" startIcon={<Delete />} onClick={() => setConfirmClear(true)}
              sx={{ borderColor: 'rgba(229,57,53,0.3)', color: '#e53935', fontFamily: 'Syne', fontSize: '0.75rem' }}>
              Limpiar
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Estadísticas colapsables */}
      <Collapse in={showStats}>
        <Paper sx={{ p: 2.5, mb: 2.5 }}>
          <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.88rem', mb: 2 }}>Resumen de actividad</Typography>
          <Grid container spacing={3}>
            {/* Por módulo */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 1, color: 'text.secondary', display: 'block', mb: 1.5 }}>Por módulo</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Object.entries(stats.byModule || {}).sort((a,b) => b[1]-a[1]).map(([mod, count]) => (
                  <Box key={mod}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.75rem' }}>{mod}</Typography>
                      <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.75rem', color: 'text.secondary' }}>{count}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={(count / maxModuleCount) * 100}
                      sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: '#4fc3f7', borderRadius: 2 } }} />
                  </Box>
                ))}
              </Box>
            </Grid>
            {/* Por severidad */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 1, color: 'text.secondary', display: 'block', mb: 1.5 }}>Por severidad</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(stats.bySeverity || {}).map(([sev, count]) => {
                  const s = SEVERITY_COLORS[sev] || SEVERITY_COLORS.info;
                  return (
                    <Paper key={sev} sx={{ px: 2, py: 1, bgcolor: s.bg, border: `1px solid ${s.border}`, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: '1.2rem', color: s.color }}>{count}</Typography>
                      <Typography sx={{ fontFamily: 'Syne', fontSize: '0.75rem', color: s.color }}>{sev}</Typography>
                    </Paper>
                  );
                })}
              </Box>
              {stats.oldest && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ fontFamily: 'DM Mono', color: 'text.secondary', display: 'block' }}>
                    Primer registro: {new Date(stats.oldest).toLocaleDateString('es-MX')}
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'DM Mono', color: 'text.secondary' }}>
                    Último registro: {new Date(stats.newest).toLocaleDateString('es-MX')}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Buscar acción, usuario, detalle..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flex: 1, minWidth: 220 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Módulo</InputLabel>
            <Select value={filterModule} label="Módulo" onChange={(e) => { setFilterModule(e.target.value); setPage(0); }}>
              <MenuItem value="all">Todos</MenuItem>
              {MODULES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <ToggleButtonGroup value={filterSeverity} exclusive onChange={(_, v) => { if (v) { setFilterSeverity(v); setPage(0); }}} size="small">
            {['all','info','success','warning','error'].map((s) => {
              const col = SEVERITY_COLORS[s];
              return (
                <ToggleButton key={s} value={s} sx={{
                  fontFamily: 'DM Mono', fontSize: '0.7rem', px: 1.5,
                  '&.Mui-selected': { bgcolor: col ? col.bg : 'rgba(79,195,247,0.15)', color: col ? col.color : '#4fc3f7', borderColor: col ? col.border : 'rgba(79,195,247,0.3)' },
                }}>
                  {s === 'all' ? 'Todos' : s}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Box>
        <Typography variant="caption" sx={{ fontFamily: 'DM Mono', color: 'text.secondary', mt: 1, display: 'block' }}>
          Mostrando {Math.min(paged.length, filtered.length)} de {filtered.length} registros
          {filtered.length !== logs.length && ` (filtrado de ${logs.length} total)`}
        </Typography>
      </Paper>

      {/* Confirmar limpiar */}
      {confirmClear && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" color="error" variant="contained" onClick={handleClear} sx={{ fontFamily: 'Syne', fontWeight: 700 }}>Confirmar</Button>
              <Button size="small" onClick={() => setConfirmClear(false)} sx={{ fontFamily: 'Syne', color: 'text.secondary' }}>Cancelar</Button>
            </Box>
          }
        >
          ⚠️ ¿Eliminar <strong>todos los logs</strong>? Esta acción no se puede deshacer.
        </Alert>
      )}

      {/* Tabla */}
      {filtered.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <Info sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {logs.length === 0 ? 'Aún no hay registros de auditoría. Realiza alguna acción para generarlos.' : 'No hay registros que coincidan con los filtros.'}
          </Typography>
        </Paper>
      ) : (
        <>
          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontFamily: 'Syne', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', bgcolor: 'rgba(79,195,247,0.03)', py: 1.2, whiteSpace: 'nowrap' } }}>
                    <TableCell>Fecha / Hora</TableCell>
                    <TableCell>Módulo</TableCell>
                    <TableCell>Acción</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell align="center">Severidad</TableCell>
                    <TableCell>Dispositivo</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.map((entry) => (
                    <LogRow key={entry.id} entry={entry} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Cargar más */}
          {paged.length < filtered.length && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button variant="outlined" onClick={() => setPage((p) => p + 1)}
                sx={{ fontFamily: 'Syne', borderColor: 'rgba(79,195,247,0.3)', color: 'primary.main' }}>
                Cargar más ({filtered.length - paged.length} restantes)
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
