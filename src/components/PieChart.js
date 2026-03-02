import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useFinance } from '../context/FinanceContext';
import { useThemeMode } from '../context/ThemeContext';
import { Box, Typography } from '@mui/material';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart() {
  const { rows } = useFinance();
  const { isDark } = useThemeMode();

  const editables = rows.filter((r) => r.editable);
  const labels    = editables.map((r) => r.categoria);
  const values    = editables.map((r) =>
    ['s1','s2','s3','s4'].reduce((acc, s) => acc + (Number(r[s]) || 0), 0)
  );
  const colors = editables.map((r) => r.color);
  const total  = values.reduce((a, b) => a + b, 0);

  const legendColor  = isDark ? '#ffffff' : '#1a1a2e';
  const tooltipBg    = isDark ? 'rgba(15,32,64,0.97)' : 'rgba(255,255,255,0.97)';
  const tooltipText  = isDark ? '#e8f4fd' : '#0d1b2a';
  const tooltipBorder = isDark ? 'rgba(79,195,247,0.4)' : 'rgba(79,195,247,0.5)';

  if (total === 0) {
    return (
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
        <Typography variant="body2" sx={{ color:'text.secondary' }}>Sin datos</Typography>
      </Box>
    );
  }

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors.map((c) => `${c}cc`),
      borderColor: colors,
      borderWidth: 1.5,
      hoverOffset: 8,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: legendColor,          // ← blanco en dark, oscuro en light
          font: { family: 'DM Mono', size: 11 },
          boxWidth: 12,
          padding: 10,
          generateLabels: (chart) =>
            chart.data.labels.map((label, i) => ({
              text: `${label}: ${((values[i] / total) * 100).toFixed(1)}%`,
              fillStyle: colors[i] + 'cc',
              strokeStyle: colors[i],
              lineWidth: 1,
              hidden: false,
              index: i,
            })),
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleColor: tooltipText,
        bodyColor: tooltipText,
        titleFont: { family: 'Syne', weight: 'bold', size: 13 },
        bodyFont:  { family: 'DM Mono', size: 12 },
        padding: 12,
        callbacks: {
          label: (ctx) => {
            const pct = ((ctx.raw / total) * 100).toFixed(1);
            const amt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(ctx.raw);
            return `  ${amt}  (${pct}%)`;
          },
        },
      },
    },
    cutout: '42%',
  };

  return <Pie data={data} options={options} />;
}
