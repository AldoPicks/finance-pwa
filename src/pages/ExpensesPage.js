import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Chip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  InputAdornment, MenuItem, Select, FormControl, InputLabel,
  ToggleButton, ToggleButtonGroup, Tooltip, Divider, Grid,
} from '@mui/material';
import {
  Add, Edit, Delete, FilterList, AttachMoney, CalendarToday,
  Notes, Category as CategoryIcon, TrendingDown, Search,
} from '@mui/icons-material';
import { useFinance } from '../context/FinanceContext';
import MonthNavigator from '../components/MonthNavigator';

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const TODAY = new Date().toISOString().split('T')[0];

// ── Diálogo agregar/editar gasto ─────────────────────────────
function ExpenseDialog({ open, onClose, initial, categories }) {
  const { addExpense, editExpense, activeMonthKey } = useFinance();

  const [form, setForm] = useState({
    categoryId:  '',
    monto:       '',
    descripcion: '',
    fecha:       TODAY,
  });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initial);

  React.useEffect(() => {
    if (open) {
      setForm({
        categoryId:  initial?.categoryId  || '',
        monto:       initial?.monto       || '',
        descripcion: initial?.descripcion || '',
        fecha:       initial?.fecha       || TODAY,
      });
      setError('');
    }
  }, [open, initial]);

  // Solo categorías activas al crear; al editar también la actual aunque esté inactiva
  const availableCats = categories.filter((c) =>
    c.activa || c.id === initial?.categoryId
  );

  const selectedCat = availableCats.find((c) => c.id === form.categoryId);

  const handleSave = async () => {
    if (!form.categoryId)       { setError('Selecciona una categoría');      return; }
    if (!form.monto || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (!form.fecha)             { setError('La fecha es obligatoria');       return; }

    // Validar que la fecha pertenece al mes activo
    const [y, m] = form.fecha.split('-');
    if (`${y}-${m}` !== activeMonthKey) {
      setError(`La fecha debe estar dentro de ${activeMonthKey} (el mes activo)`);
      return;
    }

    setSaving(true);
    try {
      if (isEdit) editExpense(initial.id, form);
      else        addExpense(form);
      onClose(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#0f2040', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 3 } }}>
      <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800, pb: 1 }}>
        {isEdit ? 'Editar gasto' : '➕ Registrar nuevo gasto'}
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>}

        {/* CATEGORÍA */}
        <FormControl fullWidth>
          <InputLabel>Categoría</InputLabel>
          <Select
            value={form.categoryId}
            label="Categoría"
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            renderValue={(val) => {
              const cat = availableCats.find((c) => c.id === val);
              if (!cat) return '';
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{cat.icono}</span>
                  <Box sx={{ width: 3, height: 14, borderRadius: 2, bgcolor: cat.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Syne', fontWeight: 600 }}>{cat.nombre}</span>
                </Box>
              );
            }}
          >
            {availableCats.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: cat.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    {cat.icono}
                  </Box>
                  <Box sx={{ width: 3, height: 20, borderRadius: 2, bgcolor: cat.color, flexShrink: 0 }} />
                  <Typography sx={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '0.9rem' }}>{cat.nombre}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* MONTO */}
        <TextField
          fullWidth label="Monto" type="number" placeholder="200"
          value={form.monto}
          onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachMoney sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'DM Mono' }}>MXN</Typography>
                </Box>
              </InputAdornment>
            ),
          }}
        />

        {/* DESCRIPCIÓN */}
        <TextField
          fullWidth label="Descripción (opcional)"
          placeholder="ej: Papas fritas en la tienda de la esquina"
          value={form.descripcion}
          onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Notes sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
          }}
        />

        {/* FECHA */}
        <TextField
          fullWidth label="Fecha del gasto" type="date"
          value={form.fecha}
          onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
          InputProps={{
            startAdornment: <InputAdornment position="start"><CalendarToday sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
          }}
          InputLabelProps={{ shrink: true }}
          helperText={form.fecha ? `→ Semana ${getWeekFromDate(form.fecha)} del mes` : ''}
        />

        {/* Preview del gasto */}
        {form.categoryId && form.monto > 0 && selectedCat && (
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: selectedCat.color + '10', border: `1px solid ${selectedCat.color}30`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <span style={{ fontSize: '1.3rem' }}>{selectedCat.icono}</span>
            <Box>
              <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.85rem', color: selectedCat.color }}>
                {fmt(Number(form.monto))} en {selectedCat.nombre}
              </Typography>
              {form.descripcion && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'DM Mono' }}>
                  "{form.descripcion}"
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={() => onClose(false)} sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving} variant="contained"
          sx={{ background: 'linear-gradient(90deg,#4fc3f7,#00e5ff)', color: '#0a1628', fontFamily: 'Syne', fontWeight: 800, px: 3 }}>
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar gasto'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function getWeekFromDate(dateStr) {
  if (!dateStr) return '?';
  const day = new Date(dateStr + 'T12:00:00').getDate();
  if (day <= 7)  return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

// ── Fila de gasto en la tabla ─────────────────────────────────
function ExpenseRow({ expense, category, onEdit, onDelete }) {
  return (
    <TableRow sx={{ '&:hover td': { bgcolor: 'rgba(79,195,247,0.03)' }, '&:last-child td': { border: 0 } }}>
      {/* Categoría */}
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: (category?.color || '#666') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
            {category?.icono || '📦'}
          </Box>
          <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: category?.color || '#666', flexShrink: 0 }} />
          <Typography sx={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '0.82rem' }}>
            {category?.nombre || expense.categoryId}
          </Typography>
        </Box>
      </TableCell>

      {/* Descripción */}
      <TableCell>
        <Typography variant="body2" sx={{ fontFamily: 'DM Mono', fontSize: '0.78rem', color: expense.descripcion ? 'text.primary' : 'text.disabled', fontStyle: expense.descripcion ? 'normal' : 'italic' }}>
          {expense.descripcion || '—'}
        </Typography>
      </TableCell>

      {/* Monto */}
      <TableCell align="right">
        <Typography sx={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: '0.88rem', color: '#ff8a80' }}>
          {fmt(expense.monto)}
        </Typography>
      </TableCell>

      {/* Fecha */}
      <TableCell align="center">
        <Typography variant="caption" sx={{ fontFamily: 'DM Mono', color: 'text.secondary' }}>
          {new Date(expense.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
        </Typography>
      </TableCell>

      {/* Semana */}
      <TableCell align="center">
        <Chip label={`Sem ${expense.semana}`} size="small"
          sx={{ height: 20, fontSize: '0.65rem', fontFamily: 'DM Mono', bgcolor: 'rgba(79,195,247,0.1)', color: '#4fc3f7' }} />
      </TableCell>

      {/* Acciones */}
      <TableCell align="right">
        <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'flex-end' }}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => onEdit(expense)} sx={{ color: 'text.secondary', '&:hover': { color: '#4fc3f7' } }}>
              <Edit sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" onClick={() => onDelete(expense)} sx={{ color: 'text.secondary', '&:hover': { color: '#ff5252' } }}>
              <Delete sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function ExpensesPage() {
  const { expenses, categories, deleteExpense, totalMes, activeMonthLabel, ingreso } = useFinance();

  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [editingExp,    setEditingExp]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search,        setSearch]        = useState('');
  const [filterCat,     setFilterCat]     = useState('all');
  const [filterWeek,    setFilterWeek]    = useState('all');
  const [toast,         setToast]         = useState({ open: false, msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => {
    setToast({ open: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000);
  };

  const handleNew    = ()    => { setEditingExp(null);   setDialogOpen(true); };
  const handleEdit   = (exp) => { setEditingExp(exp);    setDialogOpen(true); };
  const handleDelete = (exp) => setConfirmDelete(exp);

  const handleDialogClose = (saved) => {
    setDialogOpen(false);
    if (saved) showToast(editingExp ? '✅ Gasto actualizado' : '✅ Gasto registrado');
    setEditingExp(null);
  };

  const confirmDeleteExpense = () => {
    deleteExpense(confirmDelete.id);
    setConfirmDelete(null);
    showToast('🗑️ Gasto eliminado');
  };

  // Filtros
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const cat   = categories.find((c) => c.id === e.categoryId);
      const matchSearch = !search || e.descripcion.toLowerCase().includes(search.toLowerCase()) || cat?.nombre.toLowerCase().includes(search.toLowerCase());
      const matchCat  = filterCat  === 'all' || e.categoryId === filterCat;
      const matchWeek = filterWeek === 'all' || String(e.semana) === filterWeek;
      return matchSearch && matchCat && matchWeek;
    });
  }, [expenses, search, filterCat, filterWeek, categories]);

  // Totales por semana
  const weekTotals = useMemo(() => {
    const t = { 1: 0, 2: 0, 3: 0, 4: 0 };
    expenses.forEach((e) => { t[e.semana] = (t[e.semana] || 0) + e.monto; });
    return t;
  }, [expenses]);

  const totalFiltered = filtered.reduce((a, e) => a + e.monto, 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Syne', fontWeight: 800, letterSpacing: '-1px' }}>
            Registro de gastos
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {expenses.length} gastos en {activeMonthLabel}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <MonthNavigator />
          <Button variant="contained" startIcon={<Add />} onClick={handleNew}
            sx={{ background: 'linear-gradient(90deg,#4fc3f7,#00e5ff)', color: '#0a1628', fontFamily: 'Syne', fontWeight: 800 }}>
            Agregar gasto
          </Button>
        </Box>
      </Box>

      {/* Toast */}
      {toast.open && (
        <Alert severity={toast.type} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.msg}
        </Alert>
      )}

      {/* Mini resumen por semana */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((s) => (
          <Grid item xs={6} sm={3} key={s}>
            <Paper sx={{ p: 1.5, textAlign: 'center', border: filterWeek === String(s) ? '1px solid rgba(79,195,247,0.4)' : undefined, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { borderColor: 'rgba(79,195,247,0.3)' } }}
              onClick={() => setFilterWeek(filterWeek === String(s) ? 'all' : String(s))}>
              <Typography variant="caption" sx={{ fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 1, color: 'text.secondary', display: 'block' }}>
                Semana {s}
              </Typography>
              <Typography sx={{ fontFamily: 'DM Mono', fontSize: '1rem', fontWeight: 500, color: '#ff8a80', mt: 0.3 }}>
                {fmt(weekTotals[s] || 0)}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Búsqueda */}
          <TextField
            size="small" placeholder="Buscar gasto o categoría..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> }}
          />

          {/* Filtro categoría */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Categoría</InputLabel>
            <Select value={filterCat} label="Categoría" onChange={(e) => setFilterCat(e.target.value)}>
              <MenuItem value="all">Todas</MenuItem>
              {categories.filter((c) => c.activa).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{c.icono}</span> {c.nombre}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Filtro semana */}
          <ToggleButtonGroup value={filterWeek} exclusive onChange={(_, v) => v && setFilterWeek(v)} size="small">
            {['all','1','2','3','4'].map((v) => (
              <ToggleButton key={v} value={v}
                sx={{ fontFamily: 'DM Mono', fontSize: '0.72rem', px: 1.5,
                  '&.Mui-selected': { bgcolor: 'rgba(79,195,247,0.15)', color: '#4fc3f7', borderColor: 'rgba(79,195,247,0.3)' } }}>
                {v === 'all' ? 'Todos' : `S${v}`}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Resumen filtrado */}
        <Box sx={{ mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontFamily: 'DM Mono', color: 'text.secondary' }}>
            Mostrando <strong style={{ color: '#e8f4fd' }}>{filtered.length}</strong> gastos
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'DM Mono', color: 'text.secondary' }}>
            Total filtrado: <strong style={{ color: '#ff8a80' }}>{fmt(totalFiltered)}</strong>
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'DM Mono', color: 'text.secondary' }}>
            Total mes: <strong style={{ color: '#ff8a80' }}>{fmt(totalMes)}</strong>
          </Typography>
        </Box>
      </Paper>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <TrendingDown sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {expenses.length === 0 ? 'Aún no hay gastos registrados este mes. ¡Agrega uno!' : 'No hay gastos que coincidan con los filtros.'}
          </Typography>
          {expenses.length === 0 && (
            <Button variant="outlined" startIcon={<Add />} onClick={handleNew} sx={{ mt: 2, fontFamily: 'Syne', borderColor: 'rgba(79,195,247,0.3)', color: 'primary.main' }}>
              Registrar primer gasto
            </Button>
          )}
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontFamily: 'Syne', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', bgcolor: 'rgba(79,195,247,0.04)', py: 1.2 } }}>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell align="center">Fecha</TableCell>
                  <TableCell align="center">Semana</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((exp) => (
                  <ExpenseRow
                    key={exp.id}
                    expense={exp}
                    category={categories.find((c) => c.id === exp.categoryId)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dialogs */}
      <ExpenseDialog open={dialogOpen} onClose={handleDialogClose} initial={editingExp} categories={categories} />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#0f2040', border: '1px solid rgba(255,82,82,0.2)', borderRadius: 3 } }}>
        <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800 }}>¿Eliminar gasto?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Se eliminará el gasto de <strong style={{ color: '#ff8a80' }}>{fmt(confirmDelete?.monto || 0)}</strong>
            {confirmDelete?.descripcion ? ` — "${confirmDelete.descripcion}"` : ''}.
            Esto actualizará los totales de la tabla automáticamente.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmDelete(null)} sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>Cancelar</Button>
          <Button onClick={confirmDeleteExpense} variant="contained" color="error" sx={{ fontFamily: 'Syne', fontWeight: 800 }}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
