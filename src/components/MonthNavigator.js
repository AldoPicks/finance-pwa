import React, { useState } from 'react';
import {
  Box, IconButton, Typography, Chip, Tooltip,
  Popover, Paper, Grid, Button,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, CalendarToday, KeyboardReturn,
} from '@mui/icons-material';
import { useFinance } from '../context/FinanceContext';
import { MONTH_NAMES, fromMonthKey, toMonthKey } from '../db/schema';

export default function MonthNavigator() {
  const {
    activeMonthKey, activeMonthLabel, isCurrentMonth,
    goToPrevMonth, goToNextMonth, goToCurrentMonth, goToMonth,
    history,
  } = useFinance();

  const [anchorEl, setAnchorEl] = useState(null);
  const { year } = fromMonthKey(activeMonthKey);

  // Meses con datos guardados
  const monthsWithData = new Set(history.map((h) => h.monthKey));

  const handleMonthSelect = (monthIdx) => {
    const key = toMonthKey(new Date(year, monthIdx, 1));
    goToMonth(key);
    setAnchorEl(null);
  };

  const handleYearChange = (delta) => {
    const newKey = toMonthKey(new Date(year + delta, fromMonthKey(activeMonthKey).month - 1, 1));
    goToMonth(newKey);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Botón mes anterior */}
      <Tooltip title="Mes anterior">
        <IconButton
          onClick={goToPrevMonth}
          size="small"
          sx={{
            color: 'text.secondary',
            border: '1px solid rgba(79,195,247,0.15)',
            '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'rgba(79,195,247,0.08)' },
          }}
        >
          <ChevronLeft fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Mes activo — clic abre selector */}
      <Tooltip title="Seleccionar mes">
        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 2, py: 0.8, borderRadius: 2, cursor: 'pointer',
            border: '1px solid rgba(79,195,247,0.2)',
            bgcolor: 'rgba(79,195,247,0.06)',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'rgba(79,195,247,0.12)', borderColor: 'primary.main' },
          }}
        >
          <CalendarToday sx={{ fontSize: 15, color: 'primary.main' }} />
          <Typography
            variant="body2"
            sx={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '-0.3px' }}
          >
            {activeMonthLabel}
          </Typography>
          {!isCurrentMonth && (
            <Chip
              label="histórico"
              size="small"
              sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(255,202,40,0.15)', color: '#ffca28', fontFamily: 'DM Mono' }}
            />
          )}
        </Box>
      </Tooltip>

      {/* Botón mes siguiente */}
      <Tooltip title="Mes siguiente">
        <IconButton
          onClick={goToNextMonth}
          size="small"
          sx={{
            color: 'text.secondary',
            border: '1px solid rgba(79,195,247,0.15)',
            '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'rgba(79,195,247,0.08)' },
          }}
        >
          <ChevronRight fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Volver al mes actual */}
      {!isCurrentMonth && (
        <Tooltip title="Volver al mes actual">
          <IconButton
            onClick={goToCurrentMonth}
            size="small"
            sx={{
              color: '#ffca28',
              border: '1px solid rgba(255,202,40,0.3)',
              '&:hover': { bgcolor: 'rgba(255,202,40,0.1)' },
            }}
          >
            <KeyboardReturn fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Popover: selector de mes y año */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { mt: 1, borderRadius: 3, border: '1px solid rgba(79,195,247,0.2)', bgcolor: '#0f2040', p: 2, width: 280 } }}
      >
        {/* Selector de año */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <IconButton size="small" onClick={() => handleYearChange(-1)} sx={{ color: 'text.secondary' }}>
            <ChevronLeft fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ fontFamily: 'Syne', fontWeight: 700 }}>{year}</Typography>
          <IconButton size="small" onClick={() => handleYearChange(+1)} sx={{ color: 'text.secondary' }}>
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>

        {/* Grid de meses */}
        <Grid container spacing={0.8}>
          {MONTH_NAMES.map((name, idx) => {
            const key = toMonthKey(new Date(year, idx, 1));
            const isActive = key === activeMonthKey;
            const hasData = monthsWithData.has(key);
            const isCurrent = key === toMonthKey(new Date());

            return (
              <Grid item xs={4} key={name}>
                <Box
                  onClick={() => handleMonthSelect(idx)}
                  sx={{
                    p: '6px 4px', borderRadius: 1.5, textAlign: 'center', cursor: 'pointer',
                    position: 'relative',
                    bgcolor: isActive ? 'rgba(79,195,247,0.2)' : 'transparent',
                    border: isActive ? '1px solid rgba(79,195,247,0.5)' : isCurrent ? '1px solid rgba(79,195,247,0.2)' : '1px solid transparent',
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: 'rgba(79,195,247,0.1)' },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'DM Mono', fontSize: '0.7rem',
                      color: isActive ? 'primary.main' : isCurrent ? '#90caf9' : 'text.secondary',
                      fontWeight: isActive ? 700 : 400,
                    }}
                  >
                    {name.slice(0, 3)}
                  </Typography>
                  {/* Punto indicador de datos */}
                  {hasData && !isActive && (
                    <Box sx={{
                      position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%', bgcolor: '#69f0ae',
                    }} />
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>

        <Button
          fullWidth size="small"
          onClick={() => { goToCurrentMonth(); setAnchorEl(null); }}
          sx={{ mt: 2, fontFamily: 'Syne', fontSize: '0.75rem', color: 'primary.main' }}
        >
          Ir al mes actual
        </Button>
      </Popover>
    </Box>
  );
}
