import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Tooltip, Divider,
} from '@mui/material';
import {
  Add, Edit, Delete, RestoreFromTrash, Category as CategoryIcon,
} from '@mui/icons-material';
import { useFinance } from '../context/FinanceContext';
import { COLOR_OPTIONS, ICON_OPTIONS } from '../firebase/services';

// ── Diálogo crear/editar categoría ───────────────────────────
function CategoryDialog({ open, onClose, initial }) {
  const { addCategory, updateCategory } = useFinance();
  const isEdit = Boolean(initial);

  const [form, setForm]   = useState({ nombre: initial?.nombre || '', color: initial?.color || COLOR_OPTIONS[0], icono: initial?.icono || '📦' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset cuando cambia el initial (abrir nuevo vs editar)
  React.useEffect(() => {
    setForm({ nombre: initial?.nombre || '', color: initial?.color || COLOR_OPTIONS[0], icono: initial?.icono || '📦' });
    setError('');
  }, [initial, open]);

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      if (isEdit) updateCategory(initial.id, form);
      else        addCategory(form);
      onClose(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: '#0f2040', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 3 } }}>
      <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800, pb: 0 }}>
        {isEdit ? 'Editar categoría' : 'Nueva categoría'}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Nombre */}
        <TextField
          autoFocus fullWidth label="Nombre" value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          placeholder="ej: Transporte, Salud, Entretenimiento..."
          sx={{ mb: 2.5 }}
        />

        {/* Selector de ícono */}
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1, display: 'block', mb: 1 }}>
          Ícono
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 2.5 }}>
          {ICON_OPTIONS.map((ic) => (
            <Box key={ic} onClick={() => setForm((f) => ({ ...f, icono: ic }))}
              sx={{
                width: 36, height: 36, borderRadius: 1.5, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', transition: 'all 0.12s',
                border: form.icono === ic ? '2px solid #4fc3f7' : '2px solid rgba(255,255,255,0.06)',
                bgcolor: form.icono === ic ? 'rgba(79,195,247,0.15)' : 'rgba(255,255,255,0.03)',
                '&:hover': { bgcolor: 'rgba(79,195,247,0.1)' },
              }}
            >{ic}</Box>
          ))}
        </Box>

        {/* Selector de color */}
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1, display: 'block', mb: 1 }}>
          Color
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
          {COLOR_OPTIONS.map((c) => (
            <Box key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
              sx={{
                width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                border: form.color === c ? '3px solid #fff' : '3px solid transparent',
                boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                transition: 'all 0.12s',
                '&:hover': { transform: 'scale(1.15)' },
              }}
            />
          ))}
        </Box>

        {/* Preview */}
        <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(79,195,247,0.04)', border: '1px solid rgba(79,195,247,0.1)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: form.color + '25', border: `1px solid ${form.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            {form.icono}
          </Box>
          <Box sx={{ width: 3, height: 20, borderRadius: 2, bgcolor: form.color }} />
          <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.9rem', color: form.nombre ? 'text.primary' : 'text.disabled' }}>
            {form.nombre || 'Nombre de categoría'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={() => onClose(false)} sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving} variant="contained"
          sx={{ background: 'linear-gradient(90deg,#4fc3f7,#00e5ff)', color: '#0a1628', fontFamily: 'Syne', fontWeight: 800 }}>
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Tarjeta de categoría ──────────────────────────────────────
function CategoryCard({ cat, expenses, onEdit, onDelete, onReactivate }) {
  const totalGastos = expenses
    .filter((e) => e.categoryId === cat.id)
    .reduce((a, e) => a + e.monto, 0);

  const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

  return (
    <Paper sx={{
      p: 2, position: 'relative', overflow: 'hidden',
      opacity: cat.activa ? 1 : 0.55,
      border: `1px solid ${cat.activa ? cat.color + '30' : 'rgba(255,255,255,0.06)'}`,
      transition: 'all 0.2s',
      '&:hover': cat.activa ? { borderColor: cat.color + '60', transform: 'translateY(-2px)' } : {},
    }}>
      {/* Acento superior */}
      {cat.activa && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${cat.color}, transparent)` }} />
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {/* Ícono + info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: cat.color + '20', border: `1px solid ${cat.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
            {cat.icono}
          </Box>
          <Box>
            <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 1 }}>
              {cat.nombre}
              {!cat.activa && <Chip label="inactiva" size="small" sx={{ height: 16, fontSize: '0.58rem', bgcolor: 'rgba(255,82,82,0.12)', color: '#ff5252' }} />}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'DM Mono', color: 'text.secondary' }}>
              {expenses.filter((e) => e.categoryId === cat.id).length} gastos · {fmt(totalGastos)}
            </Typography>
          </Box>
        </Box>

        {/* Acciones */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {cat.activa ? (
            <>
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => onEdit(cat)} sx={{ color: 'text.secondary', '&:hover': { color: '#4fc3f7' } }}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Eliminar">
                <IconButton size="small" onClick={() => onDelete(cat)} sx={{ color: 'text.secondary', '&:hover': { color: '#ff5252' } }}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Reactivar">
              <IconButton size="small" onClick={() => onReactivate(cat.id)} sx={{ color: '#69f0ae' }}>
                <RestoreFromTrash fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Barra de color */}
      {cat.activa && totalGastos > 0 && (
        <Box sx={{ mt: 1.5, height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${Math.min(100, (totalGastos / 3000) * 100)}%`, bgcolor: cat.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
        </Box>
      )}
    </Paper>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function CategoriesPage() {
  const { categories, expenses, deleteCategory, reactivateCategory } = useFinance();

  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [editingCat,    setEditingCat]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast,         setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleEdit = (cat) => { setEditingCat(cat); setDialogOpen(true); };
  const handleNew  = ()    => { setEditingCat(null); setDialogOpen(true); };

  const handleDialogClose = (saved) => {
    setDialogOpen(false);
    if (saved) showToast(editingCat ? '✅ Categoría actualizada' : '✅ Categoría creada');
    setEditingCat(null);
  };

  const handleDelete = (cat) => setConfirmDelete(cat);

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    const result = deleteCategory(confirmDelete.id);
    setConfirmDelete(null);
    showToast(result?.type === 'soft'
      ? '⚠️ Categoría desactivada (tiene gastos asociados)'
      : '🗑️ Categoría eliminada');
  };

  const activeCategories   = categories.filter((c) => c.activa);
  const inactiveCategories = categories.filter((c) => !c.activa);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Syne', fontWeight: 800, letterSpacing: '-1px' }}>
            Categorías
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {activeCategories.length} activas · {inactiveCategories.length} inactivas
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleNew}
          sx={{ background: 'linear-gradient(90deg,#4fc3f7,#00e5ff)', color: '#0a1628', fontFamily: 'Syne', fontWeight: 800 }}>
          Nueva categoría
        </Button>
      </Box>

      {/* Toast */}
      {toast && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setToast('')}>{toast}</Alert>
      )}

      {/* Grid de categorías activas */}
      {activeCategories.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <CategoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>No hay categorías activas. Crea una nueva.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {activeCategories.map((cat) => (
            <Grid item xs={12} sm={6} md={4} key={cat.id}>
              <CategoryCard cat={cat} expenses={expenses} onEdit={handleEdit} onDelete={handleDelete} onReactivate={reactivateCategory} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Categorías inactivas */}
      {inactiveCategories.length > 0 && (
        <>
          <Divider sx={{ borderColor: 'rgba(79,195,247,0.08)', my: 3 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1, mb: 1.5, display: 'block' }}>
            Inactivas
          </Typography>
          <Grid container spacing={2}>
            {inactiveCategories.map((cat) => (
              <Grid item xs={12} sm={6} md={4} key={cat.id}>
                <CategoryCard cat={cat} expenses={expenses} onEdit={handleEdit} onDelete={handleDelete} onReactivate={reactivateCategory} />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Diálogo crear/editar */}
      <CategoryDialog open={dialogOpen} onClose={handleDialogClose} initial={editingCat} />

      {/* Diálogo confirmar eliminación */}
      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#0f2040', border: '1px solid rgba(255,82,82,0.2)', borderRadius: 3 } }}>
        <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 800 }}>¿Eliminar categoría?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Vas a eliminar <strong style={{ color: '#e8f4fd' }}>"{confirmDelete?.nombre}"</strong>.
            Si tiene gastos asociados, se desactivará en lugar de eliminarse.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmDelete(null)} sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ fontFamily: 'Syne', fontWeight: 800 }}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
