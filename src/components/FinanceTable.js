import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Box, Typography, InputAdornment, Tooltip, Chip, Button,
} from '@mui/material';
import { Edit, Lock, Add } from '@mui/icons-material';
import { useFinance } from '../context/FinanceContext';
import { useNavigate } from 'react-router-dom';

const SEMANAS = ['s1', 's2', 's3', 's4'];
const SEMANAS_LABEL = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

function EditableCell({ value, rowId, semana, editable }) {
  const { updateCell } = useFinance();
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value);

  const handleBlur = () => { setEditing(false); updateCell(rowId, semana, localVal); };

  if (!editable) {
    return (
      <TableCell align="right" sx={{ fontFamily: 'DM Mono', color: 'text.secondary', fontSize: '0.82rem' }}>
        {fmt(value)}
      </TableCell>
    );
  }

  return (
    <TableCell align="right" onClick={() => { setEditing(true); setLocalVal(value); }}
      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(79,195,247,0.05)' }, transition: 'background 0.15s' }}>
      {editing ? (
        <TextField autoFocus size="small" value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') setEditing(false); }}
          inputProps={{ style: { textAlign: 'right', fontFamily: 'DM Mono', fontSize: '0.82rem', padding: '4px 6px' } }}
          sx={{ width: 90 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Typography variant="caption" sx={{ color: 'text.secondary' }}>$</Typography></InputAdornment> }}
        />
      ) : (
        <Tooltip title="Clic para editar" placement="top" arrow>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontFamily: 'DM Mono', fontSize: '0.82rem' }}>{fmt(value)}</Typography>
            <Edit sx={{ fontSize: 12, color: 'rgba(79,195,247,0.4)' }} />
          </Box>
        </Tooltip>
      )}
    </TableCell>
  );
}

export default function FinanceTable() {
  const { rows, ingreso, incomes, ingresosBySemana, updateIngreso } = useFinance();
  const navigate = useNavigate();
  const [editingIngreso, setEditingIngreso] = useState(false);
  const [localIngreso,   setLocalIngreso]   = useState(ingreso);

  const hasIncomes = incomes && incomes.length > 0;

  const getRowStyle = (row) => {
    if (row.id === 'total')  return { bgcolor: 'rgba(79,195,247,0.06)',  fontWeight: 700 };
    if (row.id === 'ahorro') return { bgcolor: 'rgba(105,240,174,0.06)', fontWeight: 700 };
    return {};
  };

  // Ingresos por semana: real si hay registros, o ingreso/4 si es fijo
  const ingresoSemanal = ingreso / 4;
  const ingresoSem = hasIncomes
    ? [ingresosBySemana.s1, ingresosBySemana.s2, ingresosBySemana.s3, ingresosBySemana.s4]
    : [ingresoSemanal, ingresoSemanal, ingresoSemanal, ingresoSemanal];

  const gastoSem    = SEMANAS.map((s) => rows.filter((r) => r.editable).reduce((acc, r) => acc + (Number(r[s]) || 0), 0));
  const ahorroSem   = ingresoSem.map((ing, i) => ing - gastoSem[i]);
  const pctGastoSem = ingresoSem.map((ing, i) => ing > 0 ? ((gastoSem[i] / ing) * 100).toFixed(1) : '0.0');

  const totalGastoMes  = gastoSem.reduce((a, b) => a + b, 0);
  const totalAhorroMes = ahorroSem.reduce((a, b) => a + b, 0);
  const pctGastoTotal  = ingreso > 0 ? ((totalGastoMes  / ingreso) * 100).toFixed(1) : '0.0';
  const pctAhorroTotal = ingreso > 0 ? ((totalAhorroMes / ingreso) * 100).toFixed(1) : '0.0';

  const ahorroColor = (val) => val >= 0 ? '#69f0ae' : '#ff5252';
  const pctColor    = (pct) => Number(pct) > 80 ? '#ff5252' : Number(pct) > 60 ? '#ffca28' : '#69f0ae';

  return (
    <Box>
      {/* Encabezado ingreso */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Ingreso mensual:</Typography>

        {hasIncomes ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={`${fmt(ingreso)} MXN`}
              sx={{ fontFamily: 'DM Mono', fontWeight: 600, bgcolor: 'rgba(105,240,174,0.1)', color: '#69f0ae', border: '1px solid rgba(105,240,174,0.3)' }} />
            <Chip label={`${incomes.length} pago${incomes.length !== 1 ? 's' : ''}`} size="small"
              onClick={() => navigate('/incomes')}
              sx={{ fontFamily: 'DM Mono', fontSize: '0.7rem', cursor: 'pointer', bgcolor: 'rgba(79,195,247,0.08)', color: '#4fc3f7', '&:hover': { bgcolor: 'rgba(79,195,247,0.15)' } }} />
          </Box>
        ) : (
          editingIngreso ? (
            <TextField autoFocus size="small" value={localIngreso}
              onChange={(e) => setLocalIngreso(e.target.value)}
              onBlur={() => { updateIngreso(localIngreso); setEditingIngreso(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { updateIngreso(localIngreso); setEditingIngreso(false); } }}
              inputProps={{ style: { fontFamily: 'DM Mono', width: 120 } }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            />
          ) : (
            <Chip label={`${fmt(ingreso)} MXN`}
              onClick={() => { setEditingIngreso(true); setLocalIngreso(ingreso); }}
              icon={<Edit sx={{ fontSize: 14 }} />}
              sx={{ fontFamily: 'DM Mono', fontWeight: 500, cursor: 'pointer', bgcolor: 'rgba(79,195,247,0.1)', color: '#4fc3f7', border: '1px solid rgba(79,195,247,0.3)', '&:hover': { bgcolor: 'rgba(79,195,247,0.2)' } }}
            />
          )
        )}

        <Button size="small" startIcon={<Add />} onClick={() => navigate('/incomes')}
          sx={{ fontFamily: 'Syne', fontSize: '0.72rem', fontWeight: 700, color: '#69f0ae', border: '1px solid rgba(105,240,174,0.3)', borderRadius: 2, '&:hover': { bgcolor: 'rgba(105,240,174,0.08)' } }}>
          {hasIncomes ? 'Ver ingresos' : 'Registrar ingresos'}
        </Button>
      </Box>

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 600 }}>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: 'rgba(79,195,247,0.05)', fontFamily: 'Syne', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.5px', textTransform: 'uppercase' } }}>
              <TableCell sx={{ width: 180 }}>Categoría</TableCell>
              {SEMANAS_LABEL.map((s) => <TableCell key={s} align="right">{s}</TableCell>)}
              <TableCell align="right">Total Mes</TableCell>
              <TableCell align="right">% Ingreso</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>

            {/* Fila ingresos por semana (solo si hay ingresos variables) */}
            {hasIncomes && (
              <TableRow sx={{ bgcolor: 'rgba(105,240,174,0.04)', '& td': { borderBottom: '1px solid rgba(105,240,174,0.1)' } }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: '#69f0ae', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.82rem', color: '#69f0ae' }}>
                      💵 Ingresos
                    </Typography>
                  </Box>
                </TableCell>
                {ingresoSem.map((ing, i) => (
                  <TableCell key={i} align="right">
                    <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.82rem', fontWeight: 600, color: ing > 0 ? '#69f0ae' : 'text.disabled' }}>
                      {fmt(ing)}
                    </Typography>
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.82rem', fontWeight: 700, color: '#69f0ae' }}>{fmt(ingreso)}</Typography>
                </TableCell>
                <TableCell />
              </TableRow>
            )}

            {/* Filas de categorías (sin ahorro) */}
            {rows.filter((row) => row.id !== 'ahorro').map((row) => {
              const totalRow = SEMANAS.reduce((acc, s) => acc + (Number(row[s]) || 0), 0);
              const pct = ingreso > 0 ? ((totalRow / ingreso) * 100).toFixed(1) : '0.0';
              const isSpecial = row.id === 'total';

              return (
                <TableRow key={row.id}
                  sx={{ ...getRowStyle(row), '&:hover td': !isSpecial ? { bgcolor: 'rgba(255,255,255,0.02)' } : {}, '&:last-child td': { border: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: row.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontFamily: isSpecial ? 'Syne' : 'DM Mono', fontWeight: isSpecial ? 700 : 400, fontSize: '0.82rem', color: isSpecial ? 'text.primary' : 'text.secondary' }}>
                        {row.categoria}
                      </Typography>
                      {!row.editable && <Lock sx={{ fontSize: 11, color: 'text.disabled' }} />}
                    </Box>
                  </TableCell>
                  {SEMANAS.map((s) => <EditableCell key={s} rowId={row.id} semana={s} value={row[s]} editable={row.editable} />)}
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: 'DM Mono', fontSize: '0.82rem', fontWeight: isSpecial ? 700 : 400, color: row.id === 'total' ? '#4fc3f7' : 'text.primary' }}>
                      {fmt(totalRow)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {row.editable && (
                      <Chip label={`${pct}%`} size="small" sx={{ fontFamily: 'DM Mono', fontSize: '0.68rem', height: 20, bgcolor: Number(pct) > 30 ? 'rgba(255,82,82,0.15)' : 'rgba(79,195,247,0.1)', color: Number(pct) > 30 ? '#ff5252' : '#4fc3f7' }} />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Divisor */}
            <TableRow><TableCell colSpan={7} sx={{ py: 0.3, borderBottom: '1px solid rgba(79,195,247,0.15)' }} /></TableRow>

            {/* Ahorro semanal */}
            <TableRow sx={{ bgcolor: 'rgba(105,240,174,0.04)' }}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: '#69f0ae', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.82rem' }}>Ahorro semanal</Typography>
                  {!hasIncomes && (
                    <Tooltip title={`Ingreso semanal estimado: ${fmt(ingresoSemanal)}`} arrow>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'DM Mono', fontSize: '0.65rem', cursor: 'help' }}>
                        ({fmt(ingresoSemanal)}/sem)
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
              {ahorroSem.map((ahorro, i) => (
                <TableCell key={i} align="right">
                  <Typography variant="body2" sx={{ fontFamily: 'DM Mono', fontSize: '0.82rem', fontWeight: 600, color: ahorroColor(ahorro) }}>
                    {fmt(ahorro)}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontFamily: 'DM Mono', fontSize: '0.82rem', fontWeight: 700, color: ahorroColor(totalAhorroMes) }}>
                  {fmt(totalAhorroMes)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Chip label={`${pctAhorroTotal}%`} size="small" sx={{ fontFamily: 'DM Mono', fontSize: '0.68rem', height: 20, bgcolor: Number(pctAhorroTotal) >= 20 ? 'rgba(105,240,174,0.15)' : Number(pctAhorroTotal) >= 0 ? 'rgba(255,202,40,0.15)' : 'rgba(255,82,82,0.15)', color: Number(pctAhorroTotal) >= 20 ? '#69f0ae' : Number(pctAhorroTotal) >= 0 ? '#ffca28' : '#ff5252' }} />
              </TableCell>
            </TableRow>

            {/* % gasto por semana */}
            <TableRow sx={{ bgcolor: 'rgba(79,195,247,0.02)', '& td': { border: 0 } }}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: '#4fc3f7', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.82rem' }}>% gasto / ingreso semanal</Typography>
                </Box>
              </TableCell>
              {pctGastoSem.map((pct, i) => (
                <TableCell key={i} align="right">
                  <Chip label={`${pct}%`} size="small" sx={{ fontFamily: 'DM Mono', fontSize: '0.68rem', height: 20, bgcolor: Number(pct) > 80 ? 'rgba(255,82,82,0.15)' : Number(pct) > 60 ? 'rgba(255,202,40,0.15)' : 'rgba(105,240,174,0.15)', color: pctColor(pct) }} />
                </TableCell>
              ))}
              <TableCell align="right">
                <Chip label={`${pctGastoTotal}%`} size="small" sx={{ fontFamily: 'DM Mono', fontSize: '0.68rem', height: 20, fontWeight: 700, bgcolor: Number(pctGastoTotal) > 80 ? 'rgba(255,82,82,0.2)' : Number(pctGastoTotal) > 60 ? 'rgba(255,202,40,0.2)' : 'rgba(105,240,174,0.2)', color: pctColor(pctGastoTotal) }} />
              </TableCell>
              <TableCell />
            </TableRow>

          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
