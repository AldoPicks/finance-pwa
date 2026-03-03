import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Tooltip, Alert, InputAdornment, Grid,
} from '@mui/material';
import {
  Add, Edit, Delete, AttachMoney, TrendingUp, CalendarMonth,
} from '@mui/icons-material';
import { useFinance } from '../context/FinanceContext';
import { INCOME_TYPES } from '../firebase/services';

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const EMPTY_FORM = {
  monto:       '',
  descripcion: '',
  tipo:        'salario',
  fecha:       new Date().toISOString().split('T')[0],
};

// ─── Diálogo agregar / editar ingreso ────────────────────────
function IncomeDialog({ open, onClose, initial }) {
  const { addIncome, editIncome } = useFinance();
  const isEdit = Boolean(initial);
  const [form, setForm]     = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.monto || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (!form.fecha) { setError('La fecha es obligatoria'); return; }
    setSaving(true);
    try {
      if (isEdit) await editIncome(initial.id, { ...form, monto: Number(form.monto) });
      else        await addIncome({ ...form, monto: Number(form.monto) });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) { setForm(initial || EMPTY_FORM); setError(''); }
  }, [open, initial]);

  const tipoInfo = INCOME_TYPES.find((t) => t.id === form.tipo) || INCOME_TYPES[0];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, border: '1px solid rgba(79,195,247,0.2)' } }}>
      <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800, pb: 1 }}>
        {isEdit ? '✏️ Editar ingreso' : '💵 Registrar ingreso'}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          {/* Monto */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Monto" type="number"
              value={form.monto}
              onChange={(e) => set('monto', e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 100 }}
            />
          </Grid>

          {/* Fecha */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Fecha" type="date"
              value={form.fecha}
              onChange={(e) => set('fecha', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Tipo */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de ingreso</InputLabel>
              <Select value={form.tipo} label="Tipo de ingreso" onChange={(e) => set('tipo', e.target.value)}>
                {INCOME_TYPES.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{t.icono}</span>
                      <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.85rem' }}>{t.label}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Descripción */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Descripción (opcional)"
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Ej: Quincena, proyecto freelance..."
            />
          </Grid>
        </Grid>

        {/* Preview */}
        {form.monto > 0 && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(105,240,174,0.06)', border: '1px solid rgba(105,240,174,0.2)' }}>
            <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.78rem', color: '#69f0ae' }}>
              {tipoInfo.icono} {tipoInfo.label} · {fmt(Number(form.monto))}
              {form.descripcion && ` — "${form.descripcion}"`}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ fontFamily: 'Syne', color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ fontFamily: 'Syne', fontWeight: 700, background: 'linear-gradient(90deg,#69f0ae,#00e5ff)', color: '#0a1628' }}>
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar ingreso'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────
export default function IncomesPage() {
  const { incomes, deleteIncome, ingreso, totalMes, ahorroMes, activeMonthLabel } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const handleEdit = (income) => { setEditing(income); setDialogOpen(true); };
  const handleNew  = ()       => { setEditing(null);   setDialogOpen(true); };
  const handleClose = ()      => { setDialogOpen(false); setEditing(null); };

  const handleDelete = async () => {
    if (!confirmDel) return;
    await deleteIncome(confirmDel.id);
    setConfirmDel(null);
  };

  // Agrupar por tipo para el resumen
  const porTipo = incomes.reduce((acc, i) => {
    acc[i.tipo] = (acc[i.tipo] || 0) + Number(i.monto);
    return acc;
  }, {});

  const pctAhorro = ingreso > 0 ? ((ahorroMes / ingreso) * 100).toFixed(1) : '0.0';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Syne', fontWeight: 800, letterSpacing: '-1px' }}>
            Ingresos
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {activeMonthLabel} · {incomes.length} registro{incomes.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleNew}
          sx={{ fontFamily: 'Syne', fontWeight: 700, background: 'linear-gradient(90deg,#69f0ae,#00e5ff)', color: '#0a1628', borderRadius: 2 }}>
          Registrar ingreso
        </Button>
      </Box>

      {/* Resumen */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total ingresos',  value: fmt(ingreso),   icon: <TrendingUp />,    color: '#69f0ae' },
          { label: 'Total gastos',    value: fmt(totalMes),  icon: <AttachMoney />,   color: '#ff5252' },
          { label: 'Ahorro del mes',  value: fmt(ahorroMes), icon: <CalendarMonth />, color: ahorroMes >= 0 ? '#4fc3f7' : '#ff5252',
            sub: `${pctAhorro}% del ingreso` },
        ].map((card) => (
          <Grid item xs={12} sm={4} key={card.label}>
            <Paper sx={{ p: 2, borderRadius: 2, position: 'relative', overflow: 'hidden',
              border: `1px solid ${card.color}20` }}>
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${card.color}, transparent)` }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase',
                    fontSize: '0.62rem', letterSpacing: 1 }}>
                    {card.label}
                  </Typography>
                  <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: '1.3rem', color: card.color, mt: 0.3 }}>
                    {card.value}
                  </Typography>
                  {card.sub && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'DM Mono' }}>
                      {card.sub}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ color: card.color, opacity: 0.6 }}>{card.icon}</Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Desglose por tipo */}
      {Object.keys(porTipo).length > 0 && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.85rem', mb: 1.5, color: 'text.secondary',
            textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>
            Por tipo
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(porTipo).map(([tipo, total]) => {
              const info = INCOME_TYPES.find((t) => t.id === tipo) || { icono: '➕', label: tipo, color: '#90caf9' };
              return (
                <Chip key={tipo}
                  label={`${info.icono} ${info.label}: ${fmt(total)}`}
                  size="small"
                  sx={{ fontFamily: 'DM Mono', fontSize: '0.72rem',
                    bgcolor: `${info.color}18`, color: info.color,
                    border: `1px solid ${info.color}30` }}
                />
              );
            })}
          </Box>
        </Paper>
      )}

      {/* Confirmar eliminación */}
      {confirmDel && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" color="warning" variant="contained" onClick={handleDelete}
                sx={{ fontFamily: 'Syne', fontWeight: 700 }}>Eliminar</Button>
              <Button size="small" onClick={() => setConfirmDel(null)}
                sx={{ fontFamily: 'Syne', color: 'text.secondary' }}>Cancelar</Button>
            </Box>
          }>
          ¿Eliminar <strong>{fmt(confirmDel.monto)}</strong>
          {confirmDel.descripcion ? ` — "${confirmDel.descripcion}"` : ''}?
          El ingreso total del mes se recalculará automáticamente.
        </Alert>
      )}

      {/* Tabla de ingresos */}
      {incomes.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>💵</Typography>
          <Typography variant="h6" sx={{ fontFamily: 'Syne', fontWeight: 700, mb: 0.5 }}>
            Sin ingresos registrados
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Registra cada pago que recibes — salario, freelance, ventas, etc.
            El total se usará automáticamente como tu ingreso del mes.
          </Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={handleNew}
            sx={{ fontFamily: 'Syne', borderColor: 'rgba(105,240,174,0.4)', color: '#69f0ae' }}>
            Registrar primer ingreso
          </Button>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontFamily: 'Syne', fontSize: '0.65rem', textTransform: 'uppercase',
                  letterSpacing: '0.5px', color: 'text.secondary', bgcolor: 'rgba(105,240,174,0.04)', py: 1.5 } }}>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Semana</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {incomes.map((income) => {
                  const info = INCOME_TYPES.find((t) => t.id === income.tipo) || { icono:'➕', label: income.tipo, color:'#90caf9' };
                  return (
                    <TableRow key={income.id}
                      sx={{ '&:hover td': { bgcolor: 'rgba(105,240,174,0.02)' }, '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.78rem' }}>
                          {new Date(income.fecha + 'T12:00:00').toLocaleDateString('es-MX',
                            { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={`${info.icono} ${info.label}`} size="small"
                          sx={{ fontFamily: 'DM Mono', fontSize: '0.68rem', height: 22,
                            bgcolor: `${info.color}15`, color: info.color,
                            border: `1px solid ${info.color}30` }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.78rem', color: 'text.secondary' }}>
                          {income.descripcion || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={`Sem ${income.semana}`} size="small"
                          sx={{ fontFamily: 'DM Mono', fontSize: '0.65rem', height: 18,
                            bgcolor: 'rgba(79,195,247,0.08)', color: '#4fc3f7' }} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: '0.88rem', color: '#69f0ae' }}>
                          {fmt(income.monto)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => handleEdit(income)}
                            sx={{ color: '#4fc3f7', '&:hover': { bgcolor: 'rgba(79,195,247,0.1)' } }}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={() => setConfirmDel(income)}
                            sx={{ color: '#ff5252', '&:hover': { bgcolor: 'rgba(255,82,82,0.1)' } }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Total al pie */}
          <Box sx={{ p: 2, borderTop: '1px solid rgba(105,240,174,0.15)',
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontFamily: 'Syne', fontSize: '0.78rem', color: 'text.secondary' }}>
              Total del mes:
            </Typography>
            <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 800, fontSize: '1.1rem', color: '#69f0ae' }}>
              {fmt(ingreso)}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Diálogo */}
      <IncomeDialog open={dialogOpen} onClose={handleClose} initial={editing} />
    </Box>
  );
}
