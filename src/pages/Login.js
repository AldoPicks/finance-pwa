import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, TextField, Button, Typography,
  InputAdornment, IconButton, CircularProgress, Alert, Chip, Tabs, Tab,
} from '@mui/material';
import {
  Email, Lock, Visibility, VisibilityOff,
  AccountBalance, Person, MarkEmailRead, Refresh,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { FULL_VERSION } from '../version';

// ─── Pantalla de "revisa tu correo" ──────────────────────────
function VerifyEmailScreen({ email, password, onBack }) {
  const { resendVerificationEmail } = useAuth();
  const [resending,  setResending]  = useState(false);
  const [resendMsg,  setResendMsg]  = useState('');
  const [resendErr,  setResendErr]  = useState('');

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    setResendErr('');
    try {
      await resendVerificationEmail(email, password);
      setResendMsg('¡Correo reenviado! Revisa tu bandeja de entrada.');
    } catch (err) {
      setResendErr(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      {/* Ícono animado */}
      <Box sx={{
        width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 2.5,
        background: 'linear-gradient(135deg, rgba(79,195,247,0.2), rgba(0,229,255,0.1))',
        border: '2px solid rgba(79,195,247,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MarkEmailRead sx={{ fontSize: 38, color: '#4fc3f7' }} />
      </Box>

      <Typography variant="h6" sx={{ fontFamily: 'Syne', fontWeight: 800, mb: 1 }}>
        Verifica tu correo
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
        Enviamos un enlace de verificación a:
      </Typography>
      <Typography sx={{ fontFamily: 'DM Mono', fontSize: '0.85rem', color: '#4fc3f7', mb: 2.5, wordBreak: 'break-all' }}>
        {email}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.6 }}>
        Haz clic en el enlace del correo para activar tu cuenta. Después podrás iniciar sesión normalmente.
      </Typography>

      {resendMsg && <Alert severity="success" sx={{ mb: 2, borderRadius: 2, textAlign: 'left' }}>{resendMsg}</Alert>}
      {resendErr && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2, textAlign: 'left' }}>{resendErr}</Alert>}

      <Button fullWidth variant="outlined" startIcon={resending ? <CircularProgress size={16} /> : <Refresh />}
        onClick={handleResend} disabled={resending}
        sx={{ mb: 1.5, borderColor: 'rgba(79,195,247,0.4)', color: '#4fc3f7', fontFamily: 'Syne', fontWeight: 700,
          '&:hover': { borderColor: '#4fc3f7', bgcolor: 'rgba(79,195,247,0.06)' } }}>
        {resending ? 'Reenviando...' : 'Reenviar correo'}
      </Button>

      <Button fullWidth variant="text" onClick={onBack}
        sx={{ color: 'text.secondary', fontFamily: 'Syne', fontSize: '0.82rem',
          '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.04)' } }}>
        ← Volver al inicio de sesión
      </Button>
    </Box>
  );
}

// ─── Página principal ─────────────────────────────────────────
export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [tab,      setTab]      = useState(0); // 0=login, 1=registro
  const [form,     setForm]     = useState({ email: '', password: '', name: '', confirmPass: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // ✅ Estado para mostrar la pantalla de verificación
  const [pendingVerify, setPendingVerify] = useState(false);
  const [verifyEmail,   setVerifyEmail]   = useState('');
  const [verifyPass,    setVerifyPass]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (tab === 1) {
      if (form.password !== form.confirmPass) { setError('Las contraseñas no coinciden'); return; }
      if (form.password.length < 6)           { setError('La contraseña debe tener al menos 6 caracteres'); return; }
      if (!form.name.trim())                  { setError('El nombre es obligatorio'); return; }
    }
    setLoading(true);
    try {
      if (tab === 0) {
        await login(form.email, form.password);
        navigate('/');
      } else {
        // ✅ Tras registrar, mostramos la pantalla de verificación
        await register(form.email, form.password, form.name);
        setVerifyEmail(form.email);
        setVerifyPass(form.password);
        setPendingVerify(true);
      }
    } catch (err) {
      // ✅ Si intenta login sin verificar, también mostramos la pantalla
      if (err.code === 'auth/email-not-verified') {
        setVerifyEmail(form.email);
        setVerifyPass(form.password);
        setPendingVerify(true);
      } else {
        setError(friendlyError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setPendingVerify(false);
    setVerifyEmail('');
    setVerifyPass('');
    setTab(0);
    setForm({ email: '', password: '', name: '', confirmPass: '' });
    setError('');
  };

  const fillDemo = () => setForm({ ...form, email: 'demo@finanzaspro.com', password: 'demo123' });

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #0f2040 50%, #0d3060 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <Box sx={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,195,247,0.06) 0%, transparent 70%)', top: -200, right: -200, pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.04) 0%, transparent 70%)', bottom: -150, left: -100, pointerEvents: 'none' }} />

      <Paper elevation={0} sx={{
        p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 440, mx: 2,
        background: 'rgba(15,32,64,0.9)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(79,195,247,0.2)', borderRadius: 3,
      }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #4fc3f7, #00e5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountBalance sx={{ color: '#0a1628', fontSize: 24 }} />
          </Box>
          <Typography variant="h5" sx={{ fontFamily: 'Syne', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Finanzas<Box component="span" sx={{ color: '#4fc3f7' }}>Pro</Box>
          </Typography>
        </Box>

        {/* ✅ Pantalla de verificación o formulario normal */}
        {pendingVerify ? (
          <VerifyEmailScreen email={verifyEmail} password={verifyPass} onBack={handleBack} />
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }}
              sx={{ mb: 3, '& .MuiTab-root': { fontFamily: 'Syne', fontWeight: 700, textTransform: 'none' }, '& .MuiTabs-indicator': { bgcolor: 'primary.main' } }}>
              <Tab label="Iniciar sesión" />
              <Tab label="Crear cuenta" />
            </Tabs>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              {tab === 1 && (
                <TextField fullWidth label="Nombre completo" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required sx={{ mb: 2 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }} />
              )}
              <TextField fullWidth label="Correo electrónico" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required sx={{ mb: 2 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }} />
              <TextField fullWidth label="Contraseña" type={showPass ? 'text' : 'password'} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required sx={{ mb: tab === 1 ? 2 : 3 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end">
                    <IconButton onClick={() => setShowPass(!showPass)} edge="end" size="small">
                      {showPass ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>,
                }} />
              {tab === 1 && (
                <TextField fullWidth label="Confirmar contraseña" type="password" value={form.confirmPass}
                  onChange={(e) => setForm({ ...form, confirmPass: e.target.value })} required sx={{ mb: 3 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }} />
              )}

              <Button type="submit" fullWidth variant="contained" disabled={loading}
                sx={{ py: 1.5, mb: 2, background: 'linear-gradient(90deg, #4fc3f7, #00e5ff)', color: '#0a1628', fontWeight: 800, fontSize: '1rem', '&:hover': { background: 'linear-gradient(90deg, #29b6f6, #00b8d4)' } }}>
                {loading ? <CircularProgress size={22} sx={{ color: '#0a1628' }} /> : tab === 0 ? 'Iniciar sesión' : 'Crear cuenta'}
              </Button>
            </Box>

            {tab === 0 && (
              <Box sx={{ mt: 1, p: 2, background: 'rgba(79,195,247,0.06)', borderRadius: 2, border: '1px dashed rgba(79,195,247,0.2)' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>Credenciales de demo:</Typography>
                <Chip label="demo@finanzaspro.com / demo123" size="small" onClick={fillDemo}
                  sx={{ fontFamily: 'DM Mono', fontSize: '0.7rem', cursor: 'pointer', background: 'rgba(79,195,247,0.15)', color: '#4fc3f7', '&:hover': { background: 'rgba(79,195,247,0.25)' } }} />
              </Box>
            )}
          </>
        )}

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Mono', fontSize: '0.65rem' }}>
          {FULL_VERSION}
        </Typography>
      </Paper>
    </Box>
  );
}

// ─── Mensajes de error amigables ──────────────────────────────
function friendlyError(err) {
  const map = {
    'auth/user-not-found':       'No existe una cuenta con ese correo.',
    'auth/wrong-password':       'Contraseña incorrecta.',
    'auth/invalid-credential':   'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/too-many-requests':    'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed': 'Sin conexión. Verifica tu internet.',
  };
  return map[err.code] || err.message;
}