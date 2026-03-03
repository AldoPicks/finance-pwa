import React from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useThemeMode } from '../context/ThemeContext';
import { Box, Typography } from '@mui/material';

// Colores por semana
const WEEK_COLORS = ['#4fc3f7', '#69f0ae', '#ffca28', '#ff7043'];
const WEEK_LABELS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

// Tooltip personalizado
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: 'rgba(10,22,40,0.97)', border: '1px solid rgba(79,195,247,0.3)',
      borderRadius: 2, p: 1.5, minWidth: 160,
    }}>
      <Typography sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.8rem', color: '#e8f4fd', mb: 0.8 }}>
        {label}
      </Typography>
      {payload.map((p) => (
        <Box key={p.name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.3 }}>
          <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: p.color }}>
            {p.name}
          </Typography>
          <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: '#e8f4fd' }}>
            {fmt(p.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function RadarChartComponent() {
  const { rows } = useFinance();
  const { isDark } = useThemeMode();

  const editables = rows.filter((r) => r.editable);

  if (editables.length === 0 || editables.every((r) => !r.s1 && !r.s2 && !r.s3 && !r.s4)) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Sin datos</Typography>
      </Box>
    );
  }

  // Construir data: un punto por categoría con valor de cada semana
  const data = editables.map((row) => ({
    categoria: row.categoria.length > 14
      ? row.categoria.substring(0, 12) + '…'
      : row.categoria,
    'Sem 1': Number(row.s1) || 0,
    'Sem 2': Number(row.s2) || 0,
    'Sem 3': Number(row.s3) || 0,
    'Sem 4': Number(row.s4) || 0,
    color:   row.color,
  }));

  const textColor  = isDark ? '#90caf9' : '#4a6fa5';
  const gridColor  = isDark ? 'rgba(79,195,247,0.12)' : 'rgba(0,0,0,0.1)';
  const tickColor  = isDark ? '#90caf9' : '#555';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke={gridColor} />

        <PolarAngleAxis
          dataKey="categoria"
          tick={{
            fontFamily: 'DM Mono',
            fontSize: 11,
            fill: tickColor,
            fontWeight: 500,
          }}
        />

        <PolarRadiusAxis
          angle={90}
          tick={{
            fontFamily: 'DM Mono',
            fontSize: 9,
            fill: isDark ? 'rgba(144,202,249,0.5)' : 'rgba(0,0,0,0.35)',
          }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          stroke={gridColor}
        />

        {WEEK_LABELS.map((week, i) => (
          <Radar
            key={week}
            name={week}
            dataKey={week}
            stroke={WEEK_COLORS[i]}
            fill={WEEK_COLORS[i]}
            fillOpacity={0.12}
            strokeWidth={2}
            dot={{ fill: WEEK_COLORS[i], r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        ))}

        <Tooltip content={<CustomTooltip />} />

        <Legend
          wrapperStyle={{
            fontFamily: 'DM Mono',
            fontSize: '11px',
            color: isDark ? '#ffffff' : '#1a1a2e',
            paddingTop: '8px',
          }}
          formatter={(value) => (
            <span style={{ color: isDark ? '#ffffff' : '#1a1a2e', fontFamily: 'DM Mono', fontSize: 11 }}>
              {value}
            </span>
          )}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
