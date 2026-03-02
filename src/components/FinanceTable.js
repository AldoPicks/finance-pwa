import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Box, Typography, InputAdornment, Tooltip, Chip,
} from '@mui/material';
import { Edit, Lock } from '@mui/icons-material';
import { useFinance } from '../context/FinanceContext';

const SEMANAS = ['s1', 's2', 's3', 's4'];
const SEMANAS_LABEL = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

function EditableCell({ value, rowId, semana, editable }) {
  const { updateCell } = useFinance();
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value);

  const handleBlur = () => {
    setEditing(false);
    updateCell(rowId, semana, localVal);
  };

  if (!editable) {
    return (
      <TableCell align="right" sx={{ fontFamily: 'DM Mono', color: 'text.secondary', fontSize: '0.82rem' }}>
        {fmt(value)}
      </TableCell>
    );
  }

  return (
    <TableCell
      align="right"
      onClick={() => { setEditing(true); setLocalVal(value); }}
      sx={{
        cursor: 'pointer', position: 'relative',
        '&:hover': { bgcolor: 'rgba(79,195,247,0.05)' },
        transition: 'background 0.15s',
      }}
    >
      {editing ? (
        <TextField
          autoFocus
          size="small"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') setEditing(false); }}
          inputProps={{ style: { textAlign: 'right', fontFamily: 'DM Mono', fontSize: '0.82rem', padding: '4px 6px' } }}
          sx={{ width: 90 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Typography variant="caption" sx={{ color: 'text.secondary' }}>$</Typography></InputAdornment>,
          }}
        />
      ) : (
        <Tooltip title="Clic para editar" placement="top" arrow>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontFamily: 'DM Mono', fontSize: '0.82rem' }}>
              {fmt(value)}
            </Typography>
            <Edit sx={{ fontSize: 12, color: 'rgba(79,195,247,0.4)', opacity: 0 }} className="edit-icon" />
          </Box>
        </Tooltip>
      )}
    </TableCell>
  );
}

export default function FinanceTable() {
  const { rows, ingreso, updateIngreso } = useFinance();
  const [editingIngreso, setEditingIngreso] = useState(false);
  const [localIngreso, setLocalIngreso] = useState(ingreso);

  const getRowStyle = (row) => {
    if (row.id === 'total') return { bgcolor: 'rgba(79,195,247,0.06)', fontWeight: 700 };
    if (row.id === 'ahorro') return { bgcolor: 'rgba(105,240,174,0.06)', fontWeight: 700 };
    return {};
  };

  const totalPorSemana = (semana) =>
    rows.filter((r) => r.editable).reduce((acc, r) => acc + (Number(r[semana]) || 0), 0);

  return (
    <Box>
      {/* Ingreso editable */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Ingreso mensual:</Typography>
        {editingIngreso ? (
          <TextField
            autoFocus size="small"
            value={localIngreso}
            onChange={(e) => setLocalIngreso(e.target.value)}
            onBlur={() => { updateIngreso(localIngreso); setEditingIngreso(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { updateIngreso(localIngreso); setEditingIngreso(false); } }}
            inputProps={{ style: { fontFamily: 'DM Mono', width: 120 } }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />
        ) : (
          <Chip
            label={`$${Number(ingreso).toLocaleString('es-MX')} MXN`}
            onClick={() => { setEditingIngreso(true); setLocalIngreso(ingreso); }}
            icon={<Edit sx={{ fontSize: 14 }} />}
            sx={{
              fontFamily: 'DM Mono', fontWeight: 500, cursor: 'pointer',
              bgcolor: 'rgba(79,195,247,0.1)', color: '#4fc3f7',
              border: '1px solid rgba(79,195,247,0.3)',
              '&:hover': { bgcolor: 'rgba(79,195,247,0.2)' },
            }}
          />
        )}
      </Box>

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 600 }}>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: 'rgba(79,195,247,0.05)', fontFamily: 'Syne', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.5px', textTransform: 'uppercase' } }}>
              <TableCell sx={{ width: 180 }}>Categoría</TableCell>
              {SEMANAS_LABEL.map((s) => (
                <TableCell key={s} align="right">{s}</TableCell>
              ))}
              <TableCell align="right">Total Mes</TableCell>
              <TableCell align="right">% Ingreso</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const totalRow = SEMANAS.reduce((acc, s) => acc + (Number(row[s]) || 0), 0);
              const pct = ingreso > 0 ? ((totalRow / ingreso) * 100).toFixed(1) : '0.0';
              const isSpecial = row.id === 'total' || row.id === 'ahorro';

              return (
                <TableRow
                  key={row.id}
                  sx={{
                    ...getRowStyle(row),
                    '&:hover td': !isSpecial ? { bgcolor: 'rgba(255,255,255,0.02)' } : {},
                    '&:last-child td': { border: 0 },
                  }}
                >
                  {/* Categoría */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: row.color, flexShrink: 0 }} />
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: isSpecial ? 'Syne' : 'DM Mono',
                          fontWeight: isSpecial ? 700 : 400,
                          fontSize: '0.82rem',
                          color: isSpecial ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {row.categoria}
                      </Typography>
                      {!row.editable && <Lock sx={{ fontSize: 11, color: 'text.disabled' }} />}
                    </Box>
                  </TableCell>

                  {/* Celdas de semanas */}
                  {SEMANAS.map((s) => (
                    <EditableCell
                      key={s}
                      rowId={row.id}
                      semana={s}
                      value={row[s]}
                      editable={row.editable}
                    />
                  ))}

                  {/* Total row */}
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'DM Mono', fontSize: '0.82rem',
                        fontWeight: isSpecial ? 700 : 400,
                        color: row.id === 'ahorro' ? '#69f0ae' : row.id === 'total' ? '#4fc3f7' : 'text.primary',
                      }}
                    >
                      {fmt(totalRow)}
                    </Typography>
                  </TableCell>

                  {/* % ingreso */}
                  <TableCell align="right">
                    {row.editable && (
                      <Chip
                        label={`${pct}%`}
                        size="small"
                        sx={{
                          fontFamily: 'DM Mono', fontSize: '0.68rem', height: 20,
                          bgcolor: Number(pct) > 30 ? 'rgba(255,82,82,0.15)' : 'rgba(79,195,247,0.1)',
                          color: Number(pct) > 30 ? '#ff5252' : '#4fc3f7',
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
