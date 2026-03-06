import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Tooltip, LinearProgress,
  MenuItem, Select, FormControl, InputLabel, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Tabs, Tab,
} from '@mui/material';
import {
  Add, Edit, Delete, CreditCard, Payment, TrendingDown,
  ShoppingCart, Warning, Percent, Timeline, Receipt,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { AuditService, CardService as CardDB, CARD_COLORS, CARD_NETWORKS } from '../firebase/services';
import { useNotifications } from '../hooks/useNotifications';

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);

const NETWORK_LOGOS = { visa: '💳', mastercard: '🔴', amex: '🟦', carnet: '🇲🇽' };
const MESES_OPTIONS = [1, 3, 6, 9, 12, 18, 24];

// ─── Helpers ──────────────────────────────────────────────────

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthKeyToLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('es-MX', { month: 'long', year: 'numeric' });
}

function addMonthsToKey(key, n) {
  const [y, m] = key.split('-').map(Number);
  return getMonthKey(new Date(y, m - 1 + n, 1));
}

function primerMesCobro(compra, diaCorte, diaPago) {
  const fechaCompra = new Date(compra.fecha + 'T12:00:00');
  const diaCompra   = fechaCompra.getDate();
  const mesCompra   = fechaCompra.getMonth();
  const anioCompra  = fechaCompra.getFullYear();

  const mesCierre = diaCompra <= diaCorte ? mesCompra : mesCompra + 1;
  // ✅ Si diaPago < diaCorte → pago cae el mes SIGUIENTE al cierre (ej: corte 25, pago 5)
  //    Si diaPago >= diaCorte → pago cae el MISMO mes del cierre (ej: corte 3, pago 23)
  const mesCobro = (Number(diaPago) || 1) < (Number(diaCorte) || 25) ? mesCierre + 1 : mesCierre;
  return getMonthKey(new Date(anioCompra, mesCobro, 1));
}

function parcialidadEnMes(compra, targetKey, diaCorte, diaPago) {
  const meses = Number(compra.meses) || 1;
  const inicioKey = primerMesCobro(compra, diaCorte, diaPago);
  const [iy, im] = inicioKey.split('-').map(Number);
  const [ty, tm] = targetKey.split('-').map(Number);
  const startIdx = iy * 12 + (im - 1);
  const targetIdx = ty * 12 + (tm - 1);

  if (targetIdx >= startIdx && targetIdx < startIdx + meses) return compra.monto / meses;
  return 0;
}

function calcularProyecciones(card, n = 5) {
  const hoy      = getMonthKey();
  const diaCorte = Number(card.diaCorte) || 25;
  const diaPago  = Number(card.diaPago)  || 1;

  return Array.from({ length: n }, (_, i) => {
    const key = addMonthsToKey(hoy, i);
    const cargo = (card.compras || []).reduce((acc, c) => acc + parcialidadEnMes(c, key, diaCorte, diaPago), 0);
    const pagadoEnMes = (card.pagos || [])
      .filter((p) => (p.fecha || '').substring(0, 7) === key)
      .reduce((acc, p) => acc + Number(p.monto), 0);
    return {
      key,
      label: monthKeyToLabel(key),
      cargo: Math.round(cargo * 100) / 100,
      pagado: pagadoEnMes,
      pendiente: Math.max(0, cargo - pagadoEnMes),
      esMesActual: i === 0,
    };
  });
}

function calcularCorte(card) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const diaCorte = Number(card.diaCorte) || 25;

  let corteFin = new Date(hoy.getFullYear(), hoy.getMonth(), diaCorte);
  let corteInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, diaCorte + 1);

  if (hoy > corteFin) {
    corteInicio = new Date(hoy.getFullYear(), hoy.getMonth(), diaCorte + 1);
    corteFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaCorte);
  }

  const comprasEnCorte = (card.compras || []).filter((c) => {
    const d = new Date(c.fecha + 'T12:00:00');
    return d >= corteInicio && d <= corteFin;
  });

  const cargosCorte = comprasEnCorte.reduce((a, c) => a + c.monto / (Number(c.meses) || 1), 0);
  const pagadoCorte = (card.pagos || [])
    .filter((p) => { const d = new Date(p.fecha + 'T12:00:00'); return d >= corteInicio && d <= hoy; })
    .reduce((a, p) => a + Number(p.monto), 0);
  const diasRestantes = Math.max(0, Math.ceil((corteFin - hoy) / 86400000));
  const fmtDate = (d) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

  return {
    inicio: fmtDate(corteInicio),
    fin: fmtDate(corteFin),
    cargosCorte: Math.round(cargosCorte * 100) / 100,
    pagadoCorte,
    pendienteCorte: Math.max(0, cargosCorte - pagadoCorte),
    diasRestantes,
    pctPagado: cargosCorte > 0 ? Math.min(100, (pagadoCorte / cargosCorte) * 100) : 0,
  };
}

// ─── DaysChip ─────────────────────────────────────────────────
function DaysChip({ days }) {
  if (days === 0) return <Chip label="¡Hoy!" size="small" sx={{ bgcolor: '#b71c1c', color: '#fff', fontFamily: 'DM Mono', fontWeight: 700 }} />;
  if (days === 1) return <Chip label="¡Mañana!" size="small" sx={{ bgcolor: '#e53935', color: '#fff', fontFamily: 'DM Mono', fontWeight: 700 }} />;
  if (days <= 5) return <Chip icon={<Warning sx={{ fontSize: 13 }} />} label={`${days} días`} size="small" sx={{ bgcolor: 'rgba(249,168,37,0.2)', color: '#f9a825', fontFamily: 'DM Mono' }} />;
  return <Chip label={`${days} días`} size="small" sx={{ bgcolor: 'rgba(79,195,247,0.1)', color: '#4fc3f7', fontFamily: 'DM Mono' }} />;
}

// ─── CardVisual ───────────────────────────────────────────────
function CardVisual({ card }) {
  const uso = card.limiteTotal > 0 ? (card.saldoActual / card.limiteTotal) * 100 : 0;
  const libre = Math.max(0, card.limiteTotal - card.saldoActual);
  const days = CardDB.daysUntilPayment(card);
  const alertColor = uso >= 90 ? '#e53935' : uso >= 70 ? '#f9a825' : '#43a047';

  return (
    <Paper sx={{
      overflow: 'hidden', position: 'relative', border: `1px solid ${card.color}40`,
      transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 32px ${card.color}30` }
    }}>
      <Box sx={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}bb)`, p: 2.5, pb: 3, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{card.nombre}</Typography>
            <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', mt: 0.3 }}>
              {card.banco}{card.ultimos4 && ` •••• ${card.ultimos4}`}
            </Typography>
          </Box>
          <Box sx={{ fontSize: '1.5rem' }}>{NETWORK_LOGOS[card.red] || '💳'}</Box>
        </Box>
        <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 500, fontSize: '1.3rem', color: '#fff', mt: 1.5 }}>{fmt(card.saldoActual)}</Typography>
        <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>saldo actual de {fmt(card.limiteTotal)}</Typography>
      </Box>

      <LinearProgress variant="determinate" value={Math.min(100, uso)}
        sx={{ height: 5, bgcolor: 'rgba(0,0,0,0.2)', '& .MuiLinearProgress-bar': { bgcolor: alertColor } }} />

      <Box sx={{ p: 2 }}>
        <Grid container spacing={1.5} sx={{ mb: 1 }}>
          {[
            { label: 'Disponible', value: fmt(libre), color: alertColor },
            { label: 'Pago mínimo', value: fmt(card.minimoMes) },
            { label: 'Vence día', value: <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>Día {card.diaPago} <DaysChip days={days} /></Box> },
            { label: 'Uso crédito', value: `${uso.toFixed(1)}%`, color: alertColor },
          ].map(({ label, value, color }) => (
            <Grid item xs={6} key={label}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 1, display: 'block' }}>{label}</Typography>
              <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: '0.88rem', color: color || 'text.primary' }}>{value}</Typography>
            </Grid>
          ))}
        </Grid>
        {card.tasa && Number(card.tasa) > 0 && (
          <Chip label={`CAT ${card.tasa}% anual`} size="small" sx={{ fontFamily: 'DM Mono', fontSize: '0.65rem', bgcolor: 'rgba(229,57,53,0.1)', color: '#e53935' }} />
        )}
      </Box>
    </Paper>
  );
}

// ─── Dialog: Crear / Editar tarjeta ──────────────────────────
function CardDialog({ open, onClose, initial }) {
  const { user } = useAuth();
  const isEdit = Boolean(initial);
  const empty = { nombre: '', banco: '', ultimos4: '', color: CARD_COLORS[0], red: 'visa', limiteTotal: '', saldoActual: 0, minimoMes: '', diaPago: '', diaCorte: '', tasa: '', notas: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => { if (open) { setForm(initial ? { ...initial } : empty); setError(''); setTab(0); } }, [open, initial]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.limiteTotal || Number(form.limiteTotal) <= 0) { setError('El límite de crédito es obligatorio'); return; }
    if (!form.diaPago || Number(form.diaPago) < 1 || Number(form.diaPago) > 31) { setError('El día de pago debe estar entre 1 y 31'); return; }
    setSaving(true);
    try {
      if (isEdit) { await CardDB.update(user.uid, initial.id, form); AuditService.log(user.uid, 'CARD_EDIT', { detail: `Tarjeta "${form.nombre}" editada` }); }
      else { await CardDB.create(user.uid, form); AuditService.log(user.uid, 'CARD_CREATE', { detail: `Tarjeta "${form.nombre}" creada` }); }
      onClose(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, border: '1px solid rgba(79,195,247,0.2)' } }}>
      <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800 }}>{isEdit ? '✏️ Editar tarjeta' : '💳 Nueva tarjeta'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { fontFamily: 'Syne', textTransform: 'none' } }}>
          <Tab label="Datos" /><Tab label="Fechas y tasa" /><Tab label="Apariencia" />
        </Tabs>

        {tab === 0 && (<>
          {[
            ['nombre', 'Nombre / alias', 'text', null],
            ['banco', 'Banco', 'text', null],
          ].map(([k, label]) => <TextField key={k} fullWidth label={label} value={form[k]} onChange={(e) => set(k, e.target.value)} sx={{ mb: 2 }} />)}
          <TextField fullWidth label="Últimos 4 dígitos" value={form.ultimos4} onChange={(e) => set('ultimos4', e.target.value.slice(0, 4))} sx={{ mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start">••••</InputAdornment> }} />
          {[['limiteTotal', 'Límite de crédito'], ['saldoActual', 'Saldo actual'], ['minimoMes', 'Pago mínimo mensual']].map(([k, label]) => (
            <TextField key={k} fullWidth label={label} type="number" value={form[k]} onChange={(e) => set(k, e.target.value)} sx={{ mb: 2 }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          ))}
        </>)}

        {tab === 1 && (<>
          <TextField fullWidth label="Día de pago" type="number" value={form.diaPago} onChange={(e) => set('diaPago', e.target.value)} sx={{ mb: 2 }} helperText="Día del mes en que vence tu pago (ej. 15)" />
          <TextField fullWidth label="Día de corte" type="number" value={form.diaCorte} onChange={(e) => set('diaCorte', e.target.value)} sx={{ mb: 2 }} helperText="Día en que cierra tu estado de cuenta (ej. 25)" />
          <TextField fullWidth label="CAT / Tasa anual %" value={form.tasa} onChange={(e) => set('tasa', e.target.value)} sx={{ mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Percent sx={{ fontSize: 16 }} /></InputAdornment> }} />
          <TextField fullWidth multiline rows={2} label="Notas" value={form.notas} onChange={(e) => set('notas', e.target.value)} />
        </>)}

        {tab === 2 && (<>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontFamily: 'Syne', fontWeight: 600 }}>Color</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {CARD_COLORS.map((c) => (
              <Box key={c} onClick={() => set('color', c)} sx={{
                width: 30, height: 30, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                border: form.color === c ? '3px solid #fff' : '3px solid transparent', boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none', transition: 'all 0.15s'
              }} />
            ))}
          </Box>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontFamily: 'Syne', fontWeight: 600 }}>Red de pago</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {CARD_NETWORKS.map((n) => (
              <Chip key={n} label={`${NETWORK_LOGOS[n] || '💳'} ${n}`} onClick={() => set('red', n)} clickable
                variant={form.red === n ? 'filled' : 'outlined'}
                sx={{ fontFamily: 'DM Mono', textTransform: 'capitalize', ...(form.red === n ? { bgcolor: 'primary.main', color: '#0a1628' } : {}) }} />
            ))}
          </Box>
        </>)}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => onClose(false)} sx={{ fontFamily: 'Syne', color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ fontFamily: 'Syne', fontWeight: 700, background: 'linear-gradient(90deg,#4fc3f7,#00e5ff)', color: '#0a1628' }}>
          {saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog: Registrar pago ───────────────────────────────────
function PaymentDialog({ open, onClose, card }) {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ monto: '', tipo: 'minimo', fecha: today, nota: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && card) { setForm({ monto: String(card.minimoMes || ''), tipo: 'minimo', fecha: today, nota: '' }); setError(''); }
  }, [open, card]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.monto || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (!form.fecha) { setError('La fecha es obligatoria'); return; }
    setSaving(true);
    try {
      await CardDB.addPayment(user.uid, card.id, { ...form, monto: Number(form.monto) });
      AuditService.log(user.uid, 'CARD_PAYMENT', { detail: `Pago ${fmt(form.monto)} (${form.tipo}) — ${card.nombre}` });
      onClose(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, border: '1px solid rgba(67,160,71,0.3)' } }}>
      <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800 }}>💸 Registrar pago</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {card && (
          <Alert severity="info" sx={{ mb: 2, fontFamily: 'DM Mono', fontSize: '0.78rem' }}>
            Saldo: <strong>{fmt(card.saldoActual)}</strong> · Mínimo: <strong>{fmt(card.minimoMes)}</strong>
          </Alert>
        )}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Tipo de pago</InputLabel>
          <Select value={form.tipo} label="Tipo de pago" onChange={(e) => set('tipo', e.target.value)}>
            {[['minimo', 'Pago mínimo'], ['parcial', 'Pago parcial'], ['total', 'Pago total'], ['extra', 'Abono extra']].map(([id, label]) => (
              <MenuItem key={id} value={id}><Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.85rem' }}>{label}</Typography></MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth label="Monto" type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)} sx={{ mb: 2 }}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <TextField fullWidth label="Fecha de pago" type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} sx={{ mb: 2 }}
          InputLabelProps={{ shrink: true }} />
        <TextField fullWidth label="Nota (opcional)" value={form.nota} onChange={(e) => set('nota', e.target.value)} placeholder="Ej: transferencia SPEI" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => onClose(false)} sx={{ fontFamily: 'Syne', color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ fontFamily: 'Syne', fontWeight: 700, bgcolor: '#43a047', '&:hover': { bgcolor: '#388e3c' } }}>
          {saving ? 'Guardando...' : 'Registrar pago'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog: Editar pago ──────────────────────────────────────
function EditPaymentDialog({ open, onClose, card, payment }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ monto: '', tipo: 'minimo', fecha: '', nota: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && payment) {
      setForm({ monto: payment.monto || '', tipo: payment.tipo || 'minimo', fecha: payment.fecha || '', nota: payment.nota || '' });
      setError('');
    }
  }, [open, payment]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.monto || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (!form.fecha) { setError('La fecha es obligatoria'); return; }
    setSaving(true);
    try {
      await CardDB.updatePayment(user.uid, card.id, payment.id, { ...form, monto: Number(form.monto) });
      AuditService.log(user.uid, 'CARD_EDIT', { detail: `Pago editado: ${fmt(form.monto)} — ${card.nombre}` });
      onClose(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, border: '1px solid rgba(67,160,71,0.3)' } }}>
      <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800 }}>✏️ Editar pago</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
          <InputLabel>Tipo de pago</InputLabel>
          <Select value={form.tipo} label="Tipo de pago" onChange={(e) => set('tipo', e.target.value)}>
            {[['minimo', 'Pago mínimo'], ['parcial', 'Pago parcial'], ['total', 'Pago total'], ['extra', 'Abono extra']].map(([id, label]) => (
              <MenuItem key={id} value={id}><Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.85rem' }}>{label}</Typography></MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth label="Monto" type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)} sx={{ mb: 2 }}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <TextField fullWidth label="Fecha de pago" type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} sx={{ mb: 2 }}
          InputLabelProps={{ shrink: true }} />
        <TextField fullWidth label="Nota (opcional)" value={form.nota} onChange={(e) => set('nota', e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => onClose(false)} sx={{ fontFamily: 'Syne', color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ fontFamily: 'Syne', fontWeight: 700, bgcolor: '#43a047', '&:hover': { bgcolor: '#388e3c' } }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog: Registrar compra ─────────────────────────────────
function PurchaseDialog({ open, onClose, card }) {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ monto: '', fecha: today, descripcion: '', meses: 1, nota: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm({ monto: '', fecha: today, descripcion: '', meses: 1, nota: '' }); setError(''); } }, [open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mensualidad = form.monto && Number(form.meses) > 1 ? Number(form.monto) / Number(form.meses) : null;

  const handleSave = async () => {
    if (!form.monto || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (!form.fecha) { setError('La fecha es obligatoria'); return; }
    setSaving(true);
    try {
      await CardDB.addPurchase(user.uid, card.id, { ...form, monto: Number(form.monto), meses: Number(form.meses) });
      AuditService.log(user.uid, 'CARD_PAYMENT', { detail: `Compra ${fmt(form.monto)}${form.meses > 1 ? ` a ${form.meses} MSI` : ''} — ${card.nombre}` });
      onClose(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, border: '1px solid rgba(249,168,37,0.3)' } }}>
      <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800 }}>🛒 Registrar compra</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Monto total" type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Fecha de compra" type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Descripción" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Ej: iPhone, Televisión, Despensa..." />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ mb: 1.2, fontFamily: 'Syne', fontWeight: 700, color: 'text.secondary' }}>Plan de pago</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {MESES_OPTIONS.map((m) => (
                <Chip key={m} label={m === 1 ? 'Una exhibición' : `${m} MSI`} onClick={() => set('meses', m)} clickable
                  variant={form.meses === m ? 'filled' : 'outlined'} color={form.meses === m ? 'primary' : 'default'}
                  sx={{ fontFamily: 'DM Mono', fontSize: '0.75rem' }} />
              ))}
            </Box>
          </Grid>
          {mensualidad && (
            <Grid item xs={12}>
              <Alert severity="info" icon={<Receipt />} sx={{ fontFamily: 'DM Mono', fontSize: '0.8rem' }}>
                Pagarás <strong>{fmt(mensualidad)}</strong>/mes durante <strong>{form.meses} meses</strong> · Total: <strong>{fmt(Number(form.monto))}</strong>
              </Alert>
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField fullWidth label="Nota (opcional)" value={form.nota} onChange={(e) => set('nota', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => onClose(false)} sx={{ fontFamily: 'Syne', color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ fontFamily: 'Syne', fontWeight: 700, bgcolor: '#f9a825', color: '#1a1a2e', '&:hover': { bgcolor: '#f57f17' } }}>
          {saving ? 'Guardando...' : 'Registrar compra'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog: Editar compra ────────────────────────────────────
function EditPurchaseDialog({ open, onClose, card, purchase }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ monto: '', fecha: '', descripcion: '', meses: 1, nota: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && purchase) {
      setForm({
        monto: purchase.monto || '',
        fecha: purchase.fecha || '',
        descripcion: purchase.descripcion || '',
        meses: Number(purchase.meses) || 1,
        nota: purchase.nota || '',
      });
      setError('');
    }
  }, [open, purchase]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mensualidad = form.monto && Number(form.meses) > 1
    ? Number(form.monto) / Number(form.meses)
    : null;

  const handleSave = async () => {
    if (!form.monto || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (!form.fecha) { setError('La fecha es obligatoria'); return; }
    setSaving(true);
    try {
      await CardDB.updatePurchase(user.uid, card.id, purchase.id, {
        ...form,
        monto: Number(form.monto),
        meses: Number(form.meses),
      });
      AuditService.log(user.uid, 'CARD_EDIT', {
        detail: `Compra editada: ${fmt(form.monto)}${form.meses > 1 ? ` a ${form.meses} MSI` : ''} — ${card.nombre}`,
      });
      onClose(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, border: '1px solid rgba(79,195,247,0.25)' } }}>
      <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800 }}>✏️ Editar compra</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Monto total" type="number" value={form.monto}
              onChange={(e) => set('monto', e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Fecha de compra" type="date" value={form.fecha}
              onChange={(e) => set('fecha', e.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Descripción" value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Ej: iPhone, Televisión, Despensa..." />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ mb: 1.2, fontFamily: 'Syne', fontWeight: 700, color: 'text.secondary' }}>Plan de pago</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {MESES_OPTIONS.map((m) => (
                <Chip key={m} label={m === 1 ? 'Una exhibición' : `${m} MSI`}
                  onClick={() => set('meses', m)} clickable
                  variant={form.meses === m ? 'filled' : 'outlined'}
                  color={form.meses === m ? 'primary' : 'default'}
                  sx={{ fontFamily: 'DM Mono', fontSize: '0.75rem' }} />
              ))}
            </Box>
          </Grid>
          {mensualidad && (
            <Grid item xs={12}>
              <Alert severity="info" icon={<Receipt />} sx={{ fontFamily: 'DM Mono', fontSize: '0.8rem' }}>
                Pagarás <strong>{fmt(mensualidad)}</strong>/mes durante <strong>{form.meses} meses</strong>
              </Alert>
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField fullWidth label="Nota (opcional)" value={form.nota}
              onChange={(e) => set('nota', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => onClose(false)} sx={{ fontFamily: 'Syne', color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ fontFamily: 'Syne', fontWeight: 700, background: 'linear-gradient(90deg,#4fc3f7,#00e5ff)', color: '#0a1628' }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Panel de detalle expandible ─────────────────────────────
function CardDetail({ card, onEditPurchase, onDeletePurchase, onEditPayment, onDeletePayment }) {
  const [tab, setTab] = useState(0);
  const color = card.color;
  const proyecciones = useMemo(() => calcularProyecciones(card, 5), [card]);
  const corte = useMemo(() => calcularCorte(card), [card]);
  const totalPagado = (card.pagos || []).reduce((a, p) => a + Number(p.monto), 0);

  return (
    <Paper sx={{ mt: 1.5, border: `1px solid ${color}30`, borderRadius: 2, overflow: 'hidden' }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontFamily: 'Syne', textTransform: 'none', fontSize: '0.78rem', minHeight: 44 }, '& .MuiTabs-indicator': { bgcolor: color } }}>
        <Tab icon={<Timeline sx={{ fontSize: 15 }} />} iconPosition="start" label="Proyecciones" />
        <Tab icon={<ShoppingCart sx={{ fontSize: 15 }} />} iconPosition="start" label={`Compras (${(card.compras || []).length})`} />
        <Tab icon={<Payment sx={{ fontSize: 15 }} />} iconPosition="start" label={`Pagos (${(card.pagos || []).length})`} />
      </Tabs>

      <Box sx={{ p: 2 }}>

        {/* ── Tab 0: Proyecciones ── */}
        {tab === 0 && (<>
          <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, borderColor: `${color}40` }}>
            <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
              Corte vigente · {corte.inicio} – {corte.fin}
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              {[
                { label: 'Cargos del corte', value: fmt(corte.cargosCorte), color: '#ff7043' },
                { label: 'Ya pagado', value: fmt(corte.pagadoCorte), color: '#43a047' },
                { label: 'Por cubrir', value: fmt(corte.pendienteCorte), color: corte.pendienteCorte > 0 ? '#f9a825' : '#43a047' },
                { label: 'Días al corte', value: `${corte.diasRestantes} días`, color: corte.diasRestantes <= 5 ? '#e53935' : '#4fc3f7' },
              ].map(({ label, value, color: c }) => (
                <Grid item xs={6} key={label}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>{label}</Typography>
                  <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: '0.95rem', color: c }}>{value}</Typography>
                </Grid>
              ))}
            </Grid>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontFamily: 'DM Mono', fontSize: '0.63rem', color: 'text.secondary' }}>Avance de pago del corte</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'DM Mono', fontSize: '0.63rem', color: '#43a047', fontWeight: 700 }}>{corte.pctPagado.toFixed(0)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={corte.pctPagado}
                sx={{
                  height: 7, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.07)',
                  '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: corte.pctPagado >= 100 ? '#43a047' : corte.pctPagado >= 60 ? '#f9a825' : '#e53935' }
                }} />
            </Box>
          </Paper>

          <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
            Próximos 5 meses — cargos MSI
          </Typography>
          {proyecciones.every((p) => p.cargo === 0) ? (
            <Alert severity="info" sx={{ fontSize: '0.78rem' }}>Registra una compra a meses para ver las proyecciones aquí.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontFamily: 'Syne', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', py: 0.8 } }}>
                    <TableCell>Mes</TableCell>
                    <TableCell align="right">Cargo MSI</TableCell>
                    <TableCell align="right">Pagado</TableCell>
                    <TableCell align="right">Pendiente</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proyecciones.map((p) => (
                    <TableRow key={p.key} sx={{ bgcolor: p.esMesActual ? `${color}0d` : 'transparent', '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.75rem', textTransform: 'capitalize' }}>{p.label}</Typography>
                          {p.esMesActual && <Chip label="actual" size="small" sx={{ height: 15, fontSize: '0.58rem', fontFamily: 'DM Mono', bgcolor: `${color}22`, color }} />}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.78rem', color: p.cargo > 0 ? '#ff7043' : 'text.disabled' }}>
                          {p.cargo > 0 ? fmt(p.cargo) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.78rem', color: p.pagado > 0 ? '#43a047' : 'text.disabled' }}>
                          {p.pagado > 0 ? fmt(p.pagado) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.78rem', fontWeight: 700, color: p.pendiente > 0 ? '#f9a825' : '#43a047' }}>
                          {p.pendiente > 0 ? fmt(p.pendiente) : '✓'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>)}

        {/* ── Tab 1: Compras ── */}
        {tab === 1 && (<>
          {(!card.compras || card.compras.length === 0) ? (
            <Alert severity="info">Sin compras registradas. Usa 🛒 para agregar una.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontFamily: 'Syne', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', py: 0.8 } }}>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Plan</TableCell>
                    <TableCell align="right">/mes</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...(card.compras)].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((c) => {
                    const meses = Number(c.meses) || 1;
                    const diaCorteNum = Number(card.diaCorte) || 25;
                    const diaPagoNum  = Number(card.diaPago)  || 1;
                    const inicioKey = primerMesCobro(c, diaCorteNum, diaPagoNum);
                    const finKey = addMonthsToKey(inicioKey, meses - 1);
                    const liquidada = finKey < getMonthKey();
                    return (
                      <TableRow key={c.id} sx={{ opacity: liquidada ? 0.5 : 1, '&:last-child td': { border: 0 } }}>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.73rem' }}>
                            {new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.73rem' }}>{c.descripcion || '—'}</Typography>
                            {liquidada && <Chip label="✓" size="small" sx={{ height: 14, fontSize: '0.58rem', bgcolor: 'rgba(67,160,71,0.15)', color: '#43a047', px: 0.2 }} />}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.78rem', fontWeight: 700 }}>{fmt(c.monto)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={meses === 1 ? 'Único' : `${meses} MSI`} size="small"
                            sx={{
                              fontFamily: 'DM Mono', fontSize: '0.63rem', height: 18,
                              bgcolor: meses > 1 ? 'rgba(249,168,37,0.15)' : 'rgba(79,195,247,0.1)',
                              color: meses > 1 ? '#f9a825' : '#4fc3f7'
                            }} />
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.73rem', color: '#f9a825' }}>
                            {meses > 1 ? fmt(c.monto / meses) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'flex-end' }}>
                            <Tooltip title="Editar compra">
                              <IconButton size="small" onClick={() => onEditPurchase && onEditPurchase(card, c)}
                                sx={{ color: 'text.secondary', '&:hover': { color: '#4fc3f7' } }}>
                                <Edit sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar compra">
                              <IconButton size="small" onClick={() => onDeletePurchase && onDeletePurchase(card, c)}
                                sx={{ color: 'text.secondary', '&:hover': { color: '#ff5252' } }}>
                                <Delete sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>)}

        {/* ── Tab 2: Pagos ── */}
        {tab === 2 && (<>
          {(!card.pagos || card.pagos.length === 0) ? (
            <Alert severity="info">Sin pagos registrados. Usa 💸 para registrar uno.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontFamily: 'Syne', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', py: 0.8 } }}>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell>Nota</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...(card.pagos)].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map((p) => (
                    <TableRow key={p.id} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.73rem' }}>
                          {new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={p.tipo} size="small" sx={{
                          fontFamily: 'DM Mono', fontSize: '0.63rem', height: 18, textTransform: 'capitalize',
                          bgcolor: p.tipo === 'total' ? 'rgba(67,160,71,0.15)' : p.tipo === 'extra' ? 'rgba(105,240,174,0.1)' : 'rgba(79,195,247,0.1)',
                          color: p.tipo === 'total' ? '#43a047' : p.tipo === 'extra' ? '#69f0ae' : '#4fc3f7'
                        }} />
                      </TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.78rem', fontWeight: 700, color: '#43a047' }}>{fmt(p.monto)}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'text.secondary' }}>{p.nota || '—'}</Typography></TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'flex-end' }}>
                          <Tooltip title="Editar pago">
                            <IconButton size="small" onClick={() => onEditPayment && onEditPayment(card, p)}
                              sx={{ color: 'text.secondary', '&:hover': { color: '#4fc3f7' } }}>
                              <Edit sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar pago">
                            <IconButton size="small" onClick={() => onDeletePayment && onDeletePayment(card, p)}
                              sx={{ color: 'text.secondary', '&:hover': { color: '#ff5252' } }}>
                              <Delete sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 1.5, alignItems: 'center' }}>
                <Typography sx={{ fontFamily: 'Syne', fontSize: '0.72rem', color: 'text.secondary' }}>Total pagado historial:</Typography>
                <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 700, color: '#43a047', fontSize: '0.92rem' }}>{fmt(totalPagado)}</Typography>
              </Box>
            </TableContainer>
          )}
        </>)}

      </Box>
    </Paper>
  );
}

// ─── Página principal ─────────────────────────────────────────
export default function CardsPage() {
  const { user } = useAuth();
  // ✅ reload del contexto para que dashboard se actualice al cambiar tarjetas
  const { reload: reloadContext } = useFinance();
  const [cards, setCards] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [payCard, setPayCard] = useState(null);
  const [purchaseCard, setPurchaseCard] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState('');
  const [editPurchase, setEditPurchase] = useState(null);
  const [confirmDelPurchase, setConfirmDelPurchase] = useState(null);
  const [editPayment, setEditPayment] = useState(null);
  const [confirmDelPayment, setConfirmDelPayment] = useState(null);

  const { checkCardPayments } = useNotifications(cards);

  // ✅ loadCards actualiza el estado local Y dispara reload en el contexto (dashboard)
  const loadCards = async () => {
    if (!user) return;
    try {
      const loaded = await CardDB.getAll(user.uid);
      setCards(loaded.map((c) => ({ ...c, compras: c.compras || [], pagos: c.pagos || [] })));
      reloadContext(); // ← esto refresca cardsCargos en el contexto → dashboard actualizado
    } catch (err) { console.error('Error cargando tarjetas:', err); }
  };

  useEffect(() => { loadCards(); }, [user]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const handleDialogClose = (saved) => { setDialogOpen(false); setEditCard(null); if (saved) { loadCards(); showToast('✅ Tarjeta guardada'); } };
  const handlePayClose = (saved) => { setPayCard(null); if (saved) { loadCards(); showToast('✅ Pago registrado'); checkCardPayments(); } };
  const handlePurchaseClose = (saved) => { setPurchaseCard(null); if (saved) { loadCards(); showToast('🛒 Compra registrada'); } };
  const handleDelete = async () => { await CardDB.delete(user.uid, confirmDel.id); setConfirmDel(null); loadCards(); showToast('🗑️ Tarjeta eliminada'); };

  const handleEditPurchaseClose = (saved) => {
    setEditPurchase(null);
    if (saved) { loadCards(); showToast('✅ Compra actualizada'); }
  };

  const handleEditPaymentClose = (saved) => {
    setEditPayment(null);
    if (saved) { loadCards(); showToast('✅ Pago actualizado'); }
  };

  const handleDeletePayment = async () => {
    if (!confirmDelPayment) return;
    await CardDB.deletePayment(user.uid, confirmDelPayment.card.id, confirmDelPayment.payment.id);
    AuditService.log(user.uid, 'CARD_EDIT', {
      detail: `Pago eliminado: ${fmt(confirmDelPayment.payment.monto)} — ${confirmDelPayment.card.nombre}`,
    });
    setConfirmDelPayment(null);
    loadCards();
    showToast('🗑️ Pago eliminado');
  };

  const handleDeletePurchase = async () => {
    if (!confirmDelPurchase) return;
    await CardDB.deletePurchase(user.uid, confirmDelPurchase.card.id, confirmDelPurchase.purchase.id);
    AuditService.log(user.uid, 'CARD_EDIT', {
      detail: `Compra eliminada: ${fmt(confirmDelPurchase.purchase.monto)} — ${confirmDelPurchase.card.nombre}`,
    });
    setConfirmDelPurchase(null);
    loadCards();
    showToast('🗑️ Compra eliminada');
  };

  const totalDeuda = cards.reduce((a, c) => a + (Number(c.saldoActual) || 0), 0);
  const totalLimite = cards.reduce((a, c) => a + (Number(c.limiteTotal) || 0), 0);
  const totalDisponible = Math.max(0, totalLimite - totalDeuda);
  const usoGlobal = totalLimite > 0 ? ((totalDeuda / totalLimite) * 100).toFixed(1) : '0.0';
  const pagosProximos = cards.filter((c) => CardDB.daysUntilPayment(c) <= 5);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Syne', fontWeight: 800, letterSpacing: '-1px' }}>Tarjetas</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{cards.length} tarjeta{cards.length !== 1 ? 's' : ''} activa{cards.length !== 1 ? 's' : ''}</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditCard(null); setDialogOpen(true); }}
          sx={{ fontFamily: 'Syne', fontWeight: 700, background: 'linear-gradient(90deg,#4fc3f7,#00e5ff)', color: '#0a1628', borderRadius: 2 }}>
          Nueva tarjeta
        </Button>
      </Box>

      {/* Alerta pagos próximos */}
      {pagosProximos.length > 0 && (
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 2.5, borderRadius: 2 }}>
          <strong>Pagos próximos:</strong>{' '}
          {pagosProximos.map((c) => `${c.nombre} · día ${c.diaPago} (${CardDB.daysUntilPayment(c)} días)`).join(' — ')}
        </Alert>
      )}

      {/* Resumen global */}
      {cards.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Deuda total', value: fmt(totalDeuda), color: '#ff5252' },
            { label: 'Disponible total', value: fmt(totalDisponible), color: '#69f0ae' },
            { label: 'Uso promedio', value: `${usoGlobal}%`, color: Number(usoGlobal) > 70 ? '#ff5252' : '#4fc3f7' },
          ].map(({ label, value, color }) => (
            <Grid item xs={12} sm={4} key={label}>
              <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${color}20`, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},transparent)` }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 1 }}>{label}</Typography>
                <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: '1.3rem', color, mt: 0.5 }}>{value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Sin tarjetas */}
      {cards.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <CreditCard sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontFamily: 'Syne', fontWeight: 700, mb: 0.5 }}>Sin tarjetas registradas</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>Agrega tus tarjetas para hacer seguimiento de pagos, compras a meses y proyecciones.</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={() => setDialogOpen(true)}
            sx={{ fontFamily: 'Syne', borderColor: 'rgba(79,195,247,0.4)', color: '#4fc3f7' }}>Agregar primera tarjeta</Button>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {cards.map((card) => (
            <Grid item xs={12} sm={6} lg={4} key={card.id}>
              <Box sx={{ position: 'relative' }}>
                {/* Botones flotantes */}
                <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2, display: 'flex', gap: 0.5 }}>
                  {[
                    { title: 'Registrar compra', icon: <ShoppingCart sx={{ fontSize: 14 }} />, onClick: () => setPurchaseCard(card), bg: 'rgba(249,168,37,0.9)' },
                    { title: 'Registrar pago', icon: <Payment sx={{ fontSize: 14 }} />, onClick: () => setPayCard(card), bg: 'rgba(67,160,71,0.9)' },
                    { title: expandedId === card.id ? 'Cerrar' : 'Detalle', icon: <TrendingDown sx={{ fontSize: 14 }} />, onClick: () => setExpandedId(expandedId === card.id ? null : card.id), bg: expandedId === card.id ? `${card.color}cc` : 'rgba(79,195,247,0.3)' },
                    { title: 'Editar', icon: <Edit sx={{ fontSize: 14 }} />, onClick: () => { setEditCard(card); setDialogOpen(true); }, bg: 'rgba(100,100,100,0.8)' },
                    { title: 'Eliminar', icon: <Delete sx={{ fontSize: 14 }} />, onClick: () => setConfirmDel(card), bg: 'rgba(183,28,28,0.8)' },
                  ].map(({ title, icon, onClick, bg }) => (
                    <Tooltip key={title} title={title}>
                      <IconButton size="small" onClick={onClick}
                        sx={{ bgcolor: bg, color: '#fff', width: 28, height: 28, '&:hover': { filter: 'brightness(1.15)' } }}>
                        {icon}
                      </IconButton>
                    </Tooltip>
                  ))}
                </Box>

                <CardVisual card={card} />
                {expandedId === card.id && (
                  <CardDetail
                    card={card}
                    onEditPurchase={(c, p) => setEditPurchase({ card: c, purchase: p })}
                    onDeletePurchase={(c, p) => setConfirmDelPurchase({ card: c, purchase: p })}
                    onEditPayment={(c, p) => setEditPayment({ card: c, payment: p })}
                    onDeletePayment={(c, p) => setConfirmDelPayment({ card: c, payment: p })}
                  />
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Confirmación eliminación tarjeta */}
      {confirmDel && (
        <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" color="error" variant="contained" onClick={handleDelete} sx={{ fontFamily: 'Syne', fontWeight: 700 }}>Eliminar</Button>
              <Button size="small" onClick={() => setConfirmDel(null)} sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>Cancelar</Button>
            </Box>
          }>
          ¿Eliminar <strong>{confirmDel?.nombre}</strong>? Esta acción no se puede deshacer.
        </Alert>
      )}

      {/* Confirmación eliminación compra */}
      {confirmDelPurchase && (
        <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" color="error" variant="contained" onClick={handleDeletePurchase}
                sx={{ fontFamily: 'Syne', fontWeight: 700 }}>Eliminar</Button>
              <Button size="small" onClick={() => setConfirmDelPurchase(null)}
                sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>Cancelar</Button>
            </Box>
          }>
          ¿Eliminar compra de <strong>{fmt(confirmDelPurchase.purchase.monto)}</strong>
          {confirmDelPurchase.purchase.descripcion ? ` — "${confirmDelPurchase.purchase.descripcion}"` : ''}?
        </Alert>
      )}

      {/* Diálogos */}
      <CardDialog open={dialogOpen} onClose={handleDialogClose} initial={editCard} />
      <PaymentDialog open={Boolean(payCard)} onClose={handlePayClose} card={payCard} />
      <PurchaseDialog open={Boolean(purchaseCard)} onClose={handlePurchaseClose} card={purchaseCard} />
      <EditPurchaseDialog
        open={Boolean(editPurchase)}
        onClose={handleEditPurchaseClose}
        card={editPurchase?.card}
        purchase={editPurchase?.purchase}
      />
      <EditPaymentDialog
        open={Boolean(editPayment)}
        onClose={handleEditPaymentClose}
        card={editPayment?.card}
        payment={editPayment?.payment}
      />

      {/* Confirmación eliminación pago */}
      {confirmDelPayment && (
        <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" color="error" variant="contained" onClick={handleDeletePayment}
                sx={{ fontFamily: 'Syne', fontWeight: 700 }}>Eliminar</Button>
              <Button size="small" onClick={() => setConfirmDelPayment(null)}
                sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>Cancelar</Button>
            </Box>
          }>
          ¿Eliminar pago de <strong>{fmt(confirmDelPayment?.payment?.monto)}</strong>
          {confirmDelPayment?.payment?.nota ? ` — "${confirmDelPayment.payment.nota}"` : ''}?
        </Alert>
      )}

      {/* Toast */}
      {toast && (
        <Alert severity="success" sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, borderRadius: 2, boxShadow: 8, minWidth: 230 }}>
          {toast}
        </Alert>
      )}
    </Box>
  );
}