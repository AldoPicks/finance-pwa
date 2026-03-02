import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material';

const ThemeContext = createContext(null);

function buildTheme(mode) {
  const dark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary:    { main: '#4fc3f7', contrastText: dark ? '#0d1b2a' : '#fff' },
      secondary:  { main: '#00e5ff' },
      success:    { main: '#43a047' },
      warning:    { main: '#f9a825' },
      error:      { main: '#e53935' },
      background: {
        default: dark ? '#0a1628' : '#f0f4f8',
        paper:   dark ? '#0f2040' : '#ffffff',
      },
      text: {
        primary:   dark ? '#e8f4fd' : '#0d1b2a',
        secondary: dark ? '#90caf9' : '#4a6fa5',
      },
      divider: dark ? 'rgba(79,195,247,0.1)' : 'rgba(0,0,0,0.1)',
    },
    typography: {
      fontFamily: '"Syne", sans-serif',
      h1: { fontWeight: 800 },
      h2: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      body1:   { fontFamily: '"DM Mono", monospace', fontSize: '0.9rem' },
      body2:   { fontFamily: '"DM Mono", monospace', fontSize: '0.8rem' },
      caption: { fontFamily: '"DM Mono", monospace' },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: dark ? '1px solid rgba(79,195,247,0.1)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: dark ? 'none' : '0 1px 4px rgba(0,0,0,0.07)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, textTransform: 'none', fontWeight: 700, fontFamily: '"Syne", sans-serif' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: dark ? 'rgba(79,195,247,0.1)' : 'rgba(0,0,0,0.08)',
            fontFamily: '"DM Mono", monospace',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: dark ? 'rgba(11,28,56,0.97)' : 'rgba(255,255,255,0.97)',
            borderBottom: dark ? '1px solid rgba(79,195,247,0.08)' : '1px solid rgba(0,0,0,0.08)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: dark ? '#0b1c38' : '#1a3a6b',
          },
        },
      },
    },
  });
}

export function ThemeContextProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('fp_theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('fp_theme', mode);
  }, [mode]);

  const toggleTheme = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, isDark: mode === 'dark' }}>
      {children(theme)}
    </ThemeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeContext);
