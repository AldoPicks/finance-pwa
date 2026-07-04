import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, TextField, Button, Typography,
  InputAdornment, CircularProgress, Alert,
} from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function PasswordRecovery() {
  const { requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Ingresa tu correo electrónico.');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(trimmedEmail);
      setMessage(`✅ Correo enviado a ${trimmedEmail}. Sigue las instrucciones para recuperar tu contraseña.`);
      setEmail('');
    } catch (err) {
      setError(err.message || 'Error al solicitar recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #0f2040 50%, #0d3060 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 440, mx: 2, background: 'rgba(15,32,64,0.95)', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontFamily: 'Syne', fontWeight: 800, mb: 2 }}>Recuperar contraseña</Typography>
        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.7 }}>
          Ingresa tu correo electrónico para que te enviemos las instrucciones de recuperación.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{message}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ py: 1.5, mb: 2, background: 'linear-gradient(90deg, #4fc3f7, #00e5ff)', color: '#0a1628', fontWeight: 800, fontSize: '1rem' }}>
            {loading ? <CircularProgress size={22} sx={{ color: '#0a1628' }} /> : 'Enviar instrucciones'}
          </Button>
        </Box>

        <Button fullWidth variant="text" onClick={() => navigate('/login')} sx={{ color: '#4fc3f7', fontFamily: 'Syne', fontSize: '0.9rem' }} startIcon={<ArrowBack />}>
          Volver al inicio de sesión
        </Button>
      </Paper>
    </Box>
  );
}
