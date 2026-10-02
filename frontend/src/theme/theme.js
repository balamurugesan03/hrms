import { createTheme } from '@mui/material/styles';

const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#7c3aed',
        light: '#a78bfa',
        dark: '#5b21b6',
        contrastText: '#ffffff',
      },
      success: { main: '#10b981', light: '#34d399', dark: '#059669' },
      warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
      error: { main: '#ef4444', light: '#f87171', dark: '#dc2626' },
      info: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
      background: {
        default: mode === 'light' ? '#f0f2f5' : '#0f172a',
        paper: mode === 'light' ? '#ffffff' : '#1e293b',
      },
      text: {
        primary: mode === 'light' ? '#1e293b' : '#f1f5f9',
        secondary: mode === 'light' ? '#64748b' : '#94a3b8',
      },
      divider: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: { borderRadius: 10 },
    shadows: [
      'none',
      '0 1px 3px rgba(0,0,0,0.08)',
      '0 2px 6px rgba(0,0,0,0.1)',
      '0 4px 12px rgba(0,0,0,0.1)',
      '0 6px 16px rgba(0,0,0,0.12)',
      '0 8px 20px rgba(0,0,0,0.12)',
      ...Array(19).fill('none'),
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, padding: '8px 20px', fontWeight: 500 },
          contained: { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
        },
        defaultProps: { disableElevation: true },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: mode === 'light' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : 'none',
          },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small', variant: 'outlined' },
      },
      MuiSelect: {
        defaultProps: { size: 'small' },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              backgroundColor: mode === 'light' ? '#f8fafc' : '#0f172a',
              color: mode === 'light' ? '#64748b' : '#94a3b8',
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: mode === 'light' ? 'rgba(25, 118, 210, 0.03)' : 'rgba(255,255,255,0.03)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500 } },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });

export default getTheme;
