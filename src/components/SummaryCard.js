import React from 'react';
import { Paper, Box, Typography } from '@mui/material';

export default function SummaryCard({ title, value, sub, icon, color }) {
  return (
    <Paper
      sx={{
        p: 2.5,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, border-color 0.2s',
        '&:hover': { transform: 'translateY(-2px)', borderColor: `${color}40` },
      }}
    >
      {/* Accent line */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }} />
      {/* Glow */}
      <Box sx={{
        position: 'absolute', top: -40, right: -40, width: 120, height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.65rem' }}>
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontFamily: 'DM Mono', fontWeight: 500, mt: 0.5, color: 'text.primary', letterSpacing: '-0.5px' }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
            {sub}
          </Typography>
        </Box>
        <Box sx={{
          width: 40, height: 40, borderRadius: 2,
          background: `${color}1a`,
          border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color,
        }}>
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}
