import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { useFinance } from '../context/FinanceContext';
import { useThemeMode } from '../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fmtMXN = (v) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

export default function BarChart() {
  const { rows, cardsCargos, hayCargosTarjetas, cards } = useFinance();
  const { isDark } = useThemeMode();

  const textColor   = isDark ? '#ffffff' : '#1a1a2e';
  const gridColor   = isDark ? 'rgba(79,195,247,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipBg   = isDark ? 'rgba(15,32,64,0.97)'   : 'rgba(255,255,255,0.97)';
  const tooltipText = isDark ? '#e8f4fd'                : '#0d1b2a';

  const editables = rows.filter((r) => r.editable);

  // Datasets de categorías normales
  const catDatasets = editables.map((row) => ({
    label:           row.categoria,
    data:            ['s1', 's2', 's3', 's4'].map((s) => Number(row[s]) || 0),
    backgroundColor: `${row.color}99`,
    borderColor:     row.color,
    borderWidth:     1.5,
    borderRadius:    4,
    borderSkipped:   false,
  }));

  // ✅ Dataset de tarjetas de crédito
  const cardDataset = hayCargosTarjetas ? [{
    label:           cards.length === 1 ? 'Tarjetas' : `Tarjetas (${cards.length})`,
    data:            ['s1', 's2', 's3', 's4'].map((s) => cardsCargos[s] || 0),
    backgroundColor: 'rgba(239,83,80,0.6)',
    borderColor:     '#ef5350',
    borderWidth:     1.5,
    borderRadius:    4,
    borderSkipped:   false,
  }] : [];

  const data = {
    labels:   ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
    datasets: [...catDatasets, ...cardDataset],
  };

  const options = {
    responsive:          true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color:    textColor,
          font:     { family: 'DM Mono', size: 10 },
          boxWidth: 10,
          padding:  8,
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor:     'rgba(79,195,247,0.3)',
        borderWidth:     1,
        titleColor:      tooltipText,
        bodyColor:       tooltipText,
        titleFont:       { family: 'Syne', weight: 'bold' },
        bodyFont:        { family: 'DM Mono', size: 12 },
        padding:         12,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${fmtMXN(ctx.raw)}`,
          // ✅ Footer con total de la semana
          footer: (items) => {
            const total = items.reduce((a, i) => a + i.raw, 0);
            return `Total: ${fmtMXN(total)}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks:  { color: textColor, font: { family: 'DM Mono', size: 11 } },
        grid:   { color: gridColor },
        border: { color: gridColor },
      },
      y: {
        stacked: true,
        ticks: {
          color:    textColor,
          font:     { family: 'DM Mono', size: 11 },
          callback: (v) => `$${v.toLocaleString('es-MX')}`,
        },
        grid:   { color: gridColor },
        border: { color: gridColor },
      },
    },
  };

  return <Bar data={data} options={options} />;
}