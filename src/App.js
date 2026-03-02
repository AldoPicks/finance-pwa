import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ThemeContextProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeContextProvider>
      {(theme) => (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <AuthProvider>
              <FinanceProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/*"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                </Routes>
              </FinanceProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      )}
    </ThemeContextProvider>
  );
}
