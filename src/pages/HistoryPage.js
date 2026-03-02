import React, { useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, LinearProgress,
  Grid,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, TrendingFlat,
} from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { fromMonthKey } from '../firebase/services';

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

function TrendIcon({ current, prev }) {
  if (!prev) return null;
  const diff = current - prev;
  if (Math.abs(diff) < 50) return <TrendingFlat sx={{ fontSize: 16, color: '#90caf9' }} />;
  if (diff > 0) return <TrendingUp sx={{ fontSize: 16, color: '#ff5252' }} />;
  return <TrendingDown sx={{ fontSize: 16, color: '#69f0ae' }} />;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper sx={{ p: 1.5, border: '1px solid rgba(79,195,247,0.3)', bgcolor: '#0f2040' }}>
      <Typography variant="caption" sx={{ fontFamily: 'Syne', fontWeight: 700, display: 'block', mb: 0.5 }}>{label}</Typography>
      {payload.map((p) => (
        <Typography key={p.dataKey} variant="caption" sx={{ display: 'block', color: p.color, fontFamily: 'DM Mono' }}>
          {p.name}: {fmt(p.value)}
        </Typography>
      ))}
    </Paper>
  );
};

export default function HistoryPage() {
  const { history } = useFinance();
  const { user } = useAuth();

  // Datos para gráfico (orden cronológico)
  const chartData = useMemo(() =>
    [...history]
      .reverse()
      .map((h) => ({
        mes: fromMonthKey(h.monthKey).label.replace(' 20', " '"),
        Ingresos: h.income,
        Gastos: h.totalExpenses,
        Ahorro: Math.max(0, h.savings),
      })),
    [history]
  );

  // Stats acumuladas
  const totalAhorro = history.reduce((a, h) => a + Math.max(0, h.savings), 0);
  const avgSavingsRate = history.length
    ? (history.reduce((a, h) => a + h.savingsRate, 0) / history.length).toFixed(1)
    : 0;
  const bestMonth = history.reduce((best, h) => (!best || h.savings > best.savings ? h : best), null);

  if (history.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" sx={{ color: 'text.secondary', fontFamily: 'Syne' }}>
          Sin historial todavía
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.disabled', mt: 1 }}>
          Los meses se guardan automáticamente al navegar entre ellos
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontFamily: 'Syne', fontWeight: 800, mb: 0.5, letterSpacing: '-1px' }}>
        Historial financiero
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {history.length} {history.length === 1 ? 'mes registrado' : 'meses registrados'}
      </Typography>

      {/* Stats rápidas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Ahorro acumulado', value: fmt(totalAhorro), color: '#69f0ae' },
          { label: 'Tasa promedio de ahorro', value: `${avgSavingsRate}%`, color: '#4fc3f7' },
          { label: 'Mejor mes', value: bestMonth?.monthLabel || '—', color: '#ffca28' },
        ].map((s) => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1, fontFamily: 'Syne' }}>
                {s.label}
              </Typography>
              <Typography variant="h6" sx={{ fontFamily: 'DM Mono', color: s.color, mt: 0.5 }}>
                {s.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Gráfico de tendencia */}
      {chartData.length >= 2 && (
        <Paper sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: '0.9rem' }}>
            Tendencia mensual
          </Typography>
          <Box sx={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4fc3f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4fc3f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff5252" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff5252" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAhorro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#69f0ae" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#69f0ae" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,195,247,0.06)" />
                <XAxis dataKey="mes" tick={{ fill: '#90caf9', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#90caf9', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <RTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.75rem', fontFamily: 'DM Mono', color: '#90caf9' }} />
                <Area type="monotone" dataKey="Ingresos" stroke="#4fc3f7" strokeWidth={2} fill="url(#colorIngresos)" dot={false} />
                <Area type="monotone" dataKey="Gastos" stroke="#ff5252" strokeWidth={2} fill="url(#colorGastos)" dot={false} />
                <Area type="monotone" dataKey="Ahorro" stroke="#69f0ae" strokeWidth={2} fill="url(#colorAhorro)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {/* Tabla de historial */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontFamily: 'Syne', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', bgcolor: 'rgba(79,195,247,0.04)' } }}>
                <TableCell>Mes</TableCell>
                <TableCell align="right">Ingreso</TableCell>
                <TableCell align="right">Gastos</TableCell>
                <TableCell align="right">Ahorro</TableCell>
                <TableCell align="right">Tasa ahorro</TableCell>
                <TableCell align="right">Tendencia</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((h, idx) => {
                const prev = history[idx + 1];
                const isPositive = h.savings >= 0;
                return (
                  <TableRow key={h.monthKey} sx={{ '&:last-child td': { border: 0 }, '&:hover td': { bgcolor: 'rgba(79,195,247,0.03)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '0.82rem' }}>
                          {h.monthLabel}
                        </Typography>
                        {idx === 0 && (
                          <Chip label="último" size="small" sx={{ height: 16, fontSize: '0.58rem', bgcolor: 'rgba(79,195,247,0.15)', color: 'primary.main' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'DM Mono', fontSize: '0.8rem' }}>{fmt(h.income)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'DM Mono', fontSize: '0.8rem', color: '#ff5252' }}>{fmt(h.totalExpenses)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'DM Mono', fontSize: '0.8rem', color: isPositive ? '#69f0ae' : '#ff5252', fontWeight: 600 }}>
                        {fmt(h.savings)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Box sx={{ width: 60 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, Math.max(0, h.savingsRate))}
                            sx={{
                              height: 4, borderRadius: 2,
                              bgcolor: 'rgba(255,255,255,0.08)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: h.savingsRate >= 20 ? '#69f0ae' : h.savingsRate >= 10 ? '#ffca28' : '#ff5252',
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ fontFamily: 'DM Mono', color: 'text.secondary', width: 36, textAlign: 'right' }}>
                          {h.savingsRate}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <TrendIcon current={h.totalExpenses} prev={prev?.totalExpenses} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
