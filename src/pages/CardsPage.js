import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Tooltip, Divider, LinearProgress,
  MenuItem, Select, FormControl, InputLabel, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Tabs, Tab, Switch, FormControlLabel,
} from '@mui/material';
import {
  Add, Edit, Delete, CreditCard, NotificationsActive,
  NotificationsOff, Payment, TrendingDown, CheckCircle,
  Warning, CalendarToday, Percent, AccountBalance,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { CardDB, CARD_COLORS, CARD_NETWORKS } from '../db/schema';
import { useNotifications } from '../hooks/useNotifications';

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);

const NETWORK_LOGOS = { visa: '💳', mastercard: '🔴', amex: '🟦', carnet: '🇲🇽' };

// ── Chip de días restantes ────────────────────────────────────
function DaysChip({ days }) {
  if (days === 0) return <Chip label="¡Hoy!" size="small" sx={{ bgcolor: '#b71c1c', color: '#fff', fontFamily: 'DM Mono', fontWeight: 700, animation: 'pulse 1.5s infinite' }} />;
  if (days === 1) return <Chip label="¡Mañana!" size="small" sx={{ bgcolor: '#e53935', color: '#fff', fontFamily: 'DM Mono', fontWeight: 700 }} />;
  if (days <= 5)  return <Chip icon={<Warning sx={{ fontSize: 13 }} />} label={`${days} días`} size="small" sx={{ bgcolor: 'rgba(249,168,37,0.2)', color: '#f9a825', border: '1px solid #f9a82560', fontFamily: 'DM Mono' }} />;
  return <Chip label={`${days} días`} size="small" sx={{ bgcolor: 'rgba(79,195,247,0.1)', color: '#4fc3f7', fontFamily: 'DM Mono' }} />;
}

// ── Tarjeta visual ────────────────────────────────────────────
function CardVisual({ card }) {
  const uso    = card.limiteTotal > 0 ? (card.saldoActual / card.limiteTotal) * 100 : 0;
  const libre  = Math.max(0, card.limiteTotal - card.saldoActual);
  const days   = CardDB.daysUntilPayment(card);

  const alertColor = uso >= 90 ? '#e53935' : uso >= 70 ? '#f9a825' : '#43a047';

  return (
    <Paper sx={{
      overflow: 'hidden', position: 'relative',
      border: `1px solid ${card.color}40`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 32px ${card.color}30` },
    }}>
      {/* Header con color de tarjeta */}
      <Box sx={{
        background: `linear-gradient(135deg, ${card.color}, ${card.color}bb)`,
        p: 2.5, pb: 3, position: 'relative', overflow: 'hidden',
      }}>
        {/* Círculos decorativos tipo tarjeta real */}
        <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
        <Box sx={{ position: 'absolute', top: 10, right: 20, width: 60, height: 60, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
              {card.nombre}
            </Typography>
            <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', mt: 0.3 }}>
              {card.banco} {card.ultimos4 && `•••• ${card.ultimos4}`}
            </Typography>
          </Box>
          <Box sx={{ fontSize: '1.5rem' }}>{NETWORK_LOGOS[card.red] || '💳'}</Box>
        </Box>

        <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 500, fontSize: '1.3rem', color: '#fff', mt: 1.5, letterSpacing: '0.5px' }}>
          {fmt(card.saldoActual)}
        </Typography>
        <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>
          saldo actual de {fmt(card.limiteTotal)}
        </Typography>
      </Box>

      {/* Barra de uso */}
      <LinearProgress
        variant="determinate" value={Math.min(100, uso)}
        sx={{ height: 5, bgcolor: 'rgba(0,0,0,0.2)', '& .MuiLinearProgress-bar': { bgcolor: alertColor } }}
      />

      {/* Stats */}
      <Box sx={{ p: 2 }}>
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 1, display: 'block' }}>Disponible</Typography>
            <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: '0.9rem', color: alertColor }}>{fmt(libre)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 1, display: 'block' }}>Pago mínimo</Typography>
            <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: '0.9rem' }}>{fmt(card.minimoMes)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 1, display: 'block' }}>Pago vence</Typography>
            <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: '0.78rem' }}>Día {card.diaPago} <DaysChip days={days} /></Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 1, display: 'block' }}>Uso del crédito</Typography>
            <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: '0.9rem', color: alertColor }}>{uso.toFixed(1)}%</Typography>
          </Grid>
        </Grid>

        {card.tasa && Number(card.tasa) > 0 && (
          <Chip label={`CAT ${card.tasa}% anual`} size="small" sx={{ fontFamily: 'DM Mono', fontSize: '0.65rem', bgcolor: 'rgba(229,57,53,0.1)', color: '#e53935', border: '1px solid rgba(229,57,53,0.2)' }} />
        )}
      </Box>
    </Paper>
  );
}

// ── Formulario tarjeta ────────────────────────────────────────
function CardDialog({ open, onClose, initial }) {
  const { user } = useAuth();
  const isEdit = Boolean(initial);

  const empty = { nombre:'', banco:'', ultimos4:'', color: CARD_COLORS[0], red:'visa', limiteTotal:'', saldoActual:'', minimoMes:'', diaPago:'', diaCorte:'', tasa:'', notas:'' };
  const [form, setForm]   = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial } : empty);
      setError(''); setTab(0);
    }
  }, [open, initial]); // eslint-disable-line

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre.trim())       { setError('El nombre es obligatorio'); return; }
    if (!form.limiteTotal || Number(form.limiteTotal) <= 0) { setError('El límite de crédito es obligatorio'); return; }
    if (!form.diaPago || Number(form.diaPago) < 1 || Number(form.diaPago) > 31) { setError('El día de pago debe ser entre 1 y 31'); return; }
    setSaving(true);
    try {
      if (isEdit) CardDB.update(user.uid, initial.id, form);
      else        CardDB.create(user.uid, form);
      onClose(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 3 } }}>
      <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800, pb: 0 }}>
        {isEdit ? '✏️ Editar tarjeta' : '💳 Nueva tarjeta de crédito'}
      </DialogTitle>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, '& .MuiTab-root': { fontFamily: 'Syne', textTransform: 'none', fontWeight: 600 }, '& .MuiTabs-indicator': { bgcolor: 'primary.main' } }}>
        <Tab label="Datos principales" />
        <Tab label="Fechas y tasas" />
        <Tab label="Apariencia" />
      </Tabs>

      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        {/* Tab 0: Datos principales */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField fullWidth label="Nombre de la tarjeta" placeholder="Visa Oro, Azul, etc." value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel>Red</InputLabel>
                  <Select value={form.red} label="Red" onChange={(e) => set('red', e.target.value)}>
                    {CARD_NETWORKS.map((n) => (
                      <MenuItem key={n} value={n}>{NETWORK_LOGOS[n]} {n.charAt(0).toUpperCase() + n.slice(1)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={7}>
                <TextField fullWidth label="Banco emisor" placeholder="BBVA, Citibanamex, HSBC..." value={form.banco} onChange={(e) => set('banco', e.target.value)} />
              </Grid>
              <Grid item xs={5}>
                <TextField fullWidth label="Últimos 4 dígitos" placeholder="1234" inputProps={{ maxLength: 4 }} value={form.ultimos4} onChange={(e) => set('ultimos4', e.target.value.replace(/\D/,''))} />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Límite de crédito" type="number" value={form.limiteTotal} onChange={(e) => set('limiteTotal', e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Saldo actual (deuda)" type="number" value={form.saldoActual} onChange={(e) => set('saldoActual', e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
              </Grid>
            </Grid>
            <TextField fullWidth label="Pago mínimo del mes" type="number" value={form.minimoMes} onChange={(e) => set('minimoMes', e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              helperText="El monto mínimo a pagar para no generar mora" />
            <TextField fullWidth multiline rows={2} label="Notas (opcional)" placeholder="Beneficios, observaciones..." value={form.notas} onChange={(e) => set('notas', e.target.value)} />
          </Box>
        )}

        {/* Tab 1: Fechas y tasas */}
        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Las notificaciones se enviarán automáticamente 5 días y 1 día antes del día de pago.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Día de pago" type="number" inputProps={{ min: 1, max: 31 }} value={form.diaPago} onChange={(e) => set('diaPago', e.target.value)}
                  helperText="Día del mes en que vence el pago"
                  InputProps={{ startAdornment: <InputAdornment position="start"><CalendarToday sx={{ fontSize: 18 }} /></InputAdornment> }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Día de corte" type="number" inputProps={{ min: 1, max: 31 }} value={form.diaCorte} onChange={(e) => set('diaCorte', e.target.value)}
                  helperText="Día de cierre del estado de cuenta"
                  InputProps={{ startAdornment: <InputAdornment position="start"><CalendarToday sx={{ fontSize: 18 }} /></InputAdornment> }} />
              </Grid>
            </Grid>
            <TextField fullWidth label="Tasa de interés anual (CAT %)" type="number" value={form.tasa} onChange={(e) => set('tasa', e.target.value)}
              placeholder="32.5"
              InputProps={{
                startAdornment: <InputAdornment position="start"><Percent sx={{ fontSize: 18 }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: 'text.secondary' }}>% anual</Typography></InputAdornment>,
              }}
              helperText="Costo Anual Total (CAT). Úsalo para comparar entre tarjetas." />

            {form.tasa && Number(form.tasa) > 0 && form.saldoActual > 0 && (
              <Paper sx={{ p: 2, bgcolor: 'rgba(229,57,53,0.05)', border: '1px solid rgba(229,57,53,0.2)' }}>
                <Typography variant="caption" sx={{ fontFamily: 'Syne', fontWeight: 700, color: '#e53935', display: 'block', mb: 0.5 }}>
                  Estimado de intereses mensuales
                </Typography>
                <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: '1.1rem', color: '#e53935' }}>
                  {fmt((Number(form.saldoActual) * Number(form.tasa) / 100) / 12)}
                  <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>/ mes aprox.</Typography>
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {/* Tab 2: Apariencia */}
        {tab === 2 && (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1, display: 'block', mb: 1.5 }}>
              Color de la tarjeta
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {CARD_COLORS.map((c) => (
                <Box key={c} onClick={() => set('color', c)} sx={{
                  width: 36, height: 36, borderRadius: 1.5, bgcolor: c, cursor: 'pointer',
                  border: form.color === c ? '3px solid #fff' : '3px solid transparent',
                  boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                  transition: 'all 0.15s', '&:hover': { transform: 'scale(1.1)' },
                }} />
              ))}
            </Box>

            {/* Preview */}
            <Box sx={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}bb)`, borderRadius: 2, p: 2.5, position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: -15, right: -15, width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)' }} />
              <Typography sx={{ fontFamily: 'Syne', fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{form.nombre || 'Nombre tarjeta'}</Typography>
              <Typography sx={{ fontFamily: 'DM Mono', color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem' }}>{form.banco || 'Banco'} {form.ultimos4 && `•••• ${form.ultimos4}`}</Typography>
              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 500, color: '#fff', fontSize: '1.2rem' }}>
                  {fmt(form.saldoActual || 0)}
                </Typography>
                <Typography sx={{ fontSize: '1.3rem' }}>{NETWORK_LOGOS[form.red] || '💳'}</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={() => onClose(false)} sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving} variant="contained"
          sx={{ background: 'linear-gradient(90deg,#4fc3f7,#00e5ff)', color: '#0a1628', fontFamily: 'Syne', fontWeight: 800 }}>
          {saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Agregar tarjeta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Diálogo registrar pago ────────────────────────────────────
function PaymentDialog({ open, onClose, card }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ monto: '', tipo: 'parcial', nota: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && card) setForm({ monto: card.minimoMes || '', tipo: 'minimo', nota: '' });
    setError('');
  }, [open, card]);

  const handleSave = () => {
    if (!form.monto || Number(form.monto) <= 0) { setError('El monto es obligatorio'); return; }
    try {
      CardDB.addPayment(user.uid, card.id, form);
      onClose(true);
    } catch (e) { setError(e.message); }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 3 } }}>
      <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800 }}>💰 Registrar pago</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>}
        {card && (
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${card.color}15`, border: `1px solid ${card.color}30`, display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.85rem' }}>{card.nombre}</Typography>
            <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 600, color: '#e53935' }}>Saldo: {fmt(card.saldoActual)}</Typography>
          </Box>
        )}
        <FormControl fullWidth>
          <InputLabel>Tipo de pago</InputLabel>
          <Select value={form.tipo} label="Tipo de pago" onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value, monto: e.target.value === 'minimo' ? (card?.minimoMes || '') : e.target.value === 'total' ? (card?.saldoActual || '') : f.monto }))}>
            <MenuItem value="minimo">Pago mínimo ({fmt(card?.minimoMes)})</MenuItem>
            <MenuItem value="total">Pago total ({fmt(card?.saldoActual)})</MenuItem>
            <MenuItem value="parcial">Pago parcial</MenuItem>
          </Select>
        </FormControl>
        <TextField fullWidth label="Monto" type="number" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <TextField fullWidth label="Nota (opcional)" value={form.nota} onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={() => onClose(false)} sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" sx={{ background: 'linear-gradient(90deg,#43a047,#66bb6a)', color: '#fff', fontFamily: 'Syne', fontWeight: 800 }}>
          Registrar pago
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function CardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editCard, setEditCard]         = useState(null);
  const [payCard, setPayCard]           = useState(null);
  const [detailCard, setDetailCard]     = useState(null);
  const [confirmDel, setConfirmDel]     = useState(null);
  const [toast, setToast] = useState('');

  const { permission, requestPermission, checkCardPayments } = useNotifications(cards);

  const loadCards = () => {
    if (user) setCards(CardDB.getAll(user.uid));
  };

  useEffect(() => { loadCards(); }, [user]); // eslint-disable-line

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleDialogClose = (saved) => {
    setDialogOpen(false); setEditCard(null);
    if (saved) { loadCards(); showToast('✅ Tarjeta guardada'); }
  };
  const handlePayClose = (saved) => {
    setPayCard(null);
    if (saved) { loadCards(); showToast('✅ Pago registrado'); checkCardPayments(); }
  };
  const handleDelete = () => {
    CardDB.delete(user.uid, confirmDel.id);
    setConfirmDel(null); loadCards(); showToast('🗑️ Tarjeta eliminada');
  };

  // Totales globales
  const totalDeuda     = cards.reduce((a, c) => a + c.saldoActual, 0);
  const totalLimite    = cards.reduce((a, c) => a + c.limiteTotal, 0);
  const totalDisponible = Math.max(0, totalLimite - totalDeuda);
  const usoGlobal      = totalLimite > 0 ? ((totalDeuda / totalLimite) * 100).toFixed(1) : '0.0';
  const pagosProximos  = cards.filter((c) => CardDB.daysUntilPayment(c) <= 5);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Syne', fontWeight: 800, letterSpacing: '-1px' }}>
            Tarjetas de crédito
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {cards.length} tarjetas · {pagosProximos.length > 0 && <span style={{ color: '#f9a825' }}>{pagosProximos.length} pago(s) próximo(s)</span>}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Botón notificaciones */}
          <Tooltip title={permission === 'granted' ? 'Notificaciones activas' : 'Activar notificaciones de pago'}>
            <Button
              variant="outlined" size="small"
              startIcon={permission === 'granted' ? <NotificationsActive /> : <NotificationsOff />}
              onClick={permission !== 'granted' ? requestPermission : checkCardPayments}
              sx={{
                borderColor: permission === 'granted' ? 'rgba(67,160,71,0.4)' : 'rgba(79,195,247,0.3)',
                color: permission === 'granted' ? '#43a047' : 'primary.main',
                fontFamily: 'Syne', fontSize: '0.75rem',
              }}
            >
              {permission === 'granted' ? 'Notificaciones ON' : 'Activar notificaciones'}
            </Button>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}
            sx={{ background: 'linear-gradient(90deg,#4fc3f7,#00e5ff)', color: '#0a1628', fontFamily: 'Syne', fontWeight: 800 }}>
            Agregar tarjeta
          </Button>
        </Box>
      </Box>

      {toast && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setToast('')}>{toast}</Alert>}

      {/* Alerta pagos próximos */}
      {pagosProximos.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}
          icon={<Warning />}
          action={<Button size="small" sx={{ fontFamily: 'Syne', color: '#f9a825' }} onClick={checkCardPayments}>Verificar ahora</Button>}
        >
          <strong>Pagos próximos:</strong>{' '}
          {pagosProximos.map((c) => `${c.nombre} (${CardDB.daysUntilPayment(c)} días)`).join(' · ')}
        </Alert>
      )}

      {/* Resumen global */}
      {cards.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Deuda total', value: fmt(totalDeuda), color: '#e53935', sub: `${usoGlobal}% del límite total` },
            { label: 'Crédito disponible', value: fmt(totalDisponible), color: '#43a047', sub: `de ${fmt(totalLimite)} límite total` },
            { label: 'Tarjetas activas', value: cards.length, color: '#4fc3f7', sub: `${pagosProximos.length} con pago próximo` },
          ].map((s) => (
            <Grid item xs={12} sm={4} key={s.label}>
              <Paper sx={{ p: 2, borderLeft: `3px solid ${s.color}` }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 1, fontFamily: 'Syne', display: 'block' }}>{s.label}</Typography>
                <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: '1.2rem', color: s.color, mt: 0.5 }}>{s.value}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'DM Mono' }}>{s.sub}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Grid de tarjetas */}
      {cards.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CreditCard sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontFamily: 'Syne', color: 'text.secondary', mb: 1 }}>Sin tarjetas registradas</Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3 }}>Agrega tus tarjetas para gestionar límites, fechas de pago y recibir recordatorios.</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}
            sx={{ background: 'linear-gradient(90deg,#4fc3f7,#00e5ff)', color: '#0a1628', fontFamily: 'Syne', fontWeight: 800 }}>
            Agregar primera tarjeta
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {cards.map((card) => (
            <Grid item xs={12} sm={6} lg={4} key={card.id}>
              <Box sx={{ position: 'relative' }}>
                <CardVisual card={card} />
                {/* Acciones superpuestas */}
                <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Registrar pago">
                    <IconButton size="small" onClick={() => setPayCard(card)} sx={{ bgcolor: 'rgba(67,160,71,0.85)', color: '#fff', '&:hover': { bgcolor: '#43a047' } }}>
                      <Payment sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => { setEditCard(card); setDialogOpen(true); }} sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(79,195,247,0.8)' } }}>
                      <Edit sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ver historial">
                    <IconButton size="small" onClick={() => setDetailCard(detailCard?.id === card.id ? null : card)} sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                      <TrendingDown sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" onClick={() => setConfirmDel(card)} sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(229,57,53,0.8)' } }}>
                      <Delete sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Historial de pagos expandido */}
                {detailCard?.id === card.id && (
                  <Paper sx={{ mt: 1, border: `1px solid ${card.color}30`, bgcolor: 'background.paper' }}>
                    <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(79,195,247,0.08)' }}>
                      <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.82rem' }}>Historial de pagos</Typography>
                    </Box>
                    {(!card.pagos || card.pagos.length === 0) ? (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sin pagos registrados</Typography>
                      </Box>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {['Fecha','Tipo','Monto','Nota'].map((h) => (
                                <TableCell key={h} sx={{ fontSize: '0.65rem', color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {card.pagos.slice(0, 6).map((p) => (
                              <TableRow key={p.id} sx={{ '&:last-child td': { border: 0 } }}>
                                <TableCell sx={{ fontFamily: 'DM Mono', fontSize: '0.72rem' }}>
                                  {new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                </TableCell>
                                <TableCell>
                                  <Chip label={p.tipo} size="small" sx={{ height: 16, fontSize: '0.6rem', fontFamily: 'DM Mono',
                                    bgcolor: p.tipo === 'total' ? 'rgba(67,160,71,0.15)' : p.tipo === 'minimo' ? 'rgba(249,168,37,0.15)' : 'rgba(79,195,247,0.1)',
                                    color: p.tipo === 'total' ? '#43a047' : p.tipo === 'minimo' ? '#f9a825' : '#4fc3f7',
                                  }} />
                                </TableCell>
                                <TableCell sx={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: '0.78rem', color: '#43a047' }}>{fmt(p.monto)}</TableCell>
                                <TableCell sx={{ fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'text.secondary' }}>{p.nota || '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Paper>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <CardDialog open={dialogOpen} onClose={handleDialogClose} initial={editCard} />
      <PaymentDialog open={Boolean(payCard)} onClose={handlePayClose} card={payCard} />

      <Dialog open={Boolean(confirmDel)} onClose={() => setConfirmDel(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(229,57,53,0.3)', borderRadius: 3 } }}>
        <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800 }}>¿Eliminar tarjeta?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Se eliminará <strong style={{ color: '#e8f4fd' }}>"{confirmDel?.nombre}"</strong> y su historial de pagos.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmDel(null)} sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>Cancelar</Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ fontFamily: 'Syne', fontWeight: 800 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
