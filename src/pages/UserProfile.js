import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, Avatar,
  Switch, FormControlLabel, Divider, Alert, Chip, Slider,
  InputAdornment, IconButton, CircularProgress,
} from '@mui/material';
import {
  Person, Email, Lock, Visibility, VisibilityOff,
  Save, Notifications, AttachMoney, CheckCircle,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const AVATAR_OPTIONS = ['😊','💼','🚀','🦊','🐺','🌟','🎯','💡','🏄','🎸','🌊','🦋'];

export default function UserProfile() {
  const { user, updateProfile, changePassword } = useAuth();

  const [profile, setProfile] = useState({
    name:          user?.name          || '',
    email:         user?.email         || '',
    avatar:        user?.avatar        || user?.name?.charAt(0) || 'U',
    currency:      user?.currency      || 'MXN',
    defaultIncome: user?.defaultIncome || 10000,
  });

  const [prefs, setPrefs] = useState({
    showUSD:        user?.prefs?.showUSD        ?? true,
    alertCarro:     user?.prefs?.alertCarro     ?? true,
    alertThreshold: user?.prefs?.alertThreshold ?? 50,
  });

  const [passwords,     setPasswords]     = useState({ current: '', nuevo: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, nuevo: false });
  const [saving,        setSaving]        = useState(false);
  const [savingPass,    setSavingPass]    = useState(false);
  const [successMsg,    setSuccessMsg]    = useState('');
  const [errorMsg,      setErrorMsg]      = useState('');
  const [passError,     setPassError]     = useState('');
  const [passSuccess,   setPassSuccess]   = useState('');

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const showError   = (msg) => { setErrorMsg(msg);   setTimeout(() => setErrorMsg(''),   4000); };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // ✅ await correcto para que Firestore guarde antes de continuar
      await updateProfile({
        name:          profile.name,
        avatar:        profile.avatar,   // ✅ siempre guardamos el avatar elegido
        currency:      profile.currency,
        defaultIncome: Number(profile.defaultIncome),
        prefs,
      });
      showSuccess('Perfil actualizado correctamente');
    } catch (e) {
      showError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPassError(''); setPassSuccess('');
    if (passwords.nuevo !== passwords.confirm) { setPassError('Las contraseñas nuevas no coinciden'); return; }
    if (passwords.nuevo.length < 6)            { setPassError('La contraseña debe tener al menos 6 caracteres'); return; }
    setSavingPass(true);
    try {
      await changePassword(passwords.current, passwords.nuevo);
      setPasswords({ current: '', nuevo: '', confirm: '' });
      setPassSuccess('Contraseña cambiada correctamente');
      setTimeout(() => setPassSuccess(''), 3000);
    } catch (e) {
      setPassError(e.message);
    } finally {
      setSavingPass(false);
    }
  };

  const isEmojiAvatar = AVATAR_OPTIONS.includes(profile.avatar);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontFamily: 'Syne', fontWeight: 800, mb: 0.5, letterSpacing: '-1px' }}>Mi perfil</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>Gestiona tu cuenta y preferencias</Typography>

      {successMsg && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}
      {errorMsg   && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }} onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}

      <Grid container spacing={3}>
        {/* ── Columna izquierda ─────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
              <Avatar sx={{
                width: 80, height: 80,
                fontSize: isEmojiAvatar ? '2.2rem' : '2rem',
                bgcolor: 'rgba(79,195,247,0.15)',
                border: '2px solid rgba(79,195,247,0.3)',
                fontFamily: 'Syne', fontWeight: 800, color: 'primary.main',
              }}>
                {profile.avatar}
              </Avatar>
            </Box>

            <Typography variant="h6" sx={{ fontFamily: 'Syne', fontWeight: 700 }}>{profile.name}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'DM Mono' }}>{user?.email}</Typography>

            <Box sx={{ mt: 1 }}>
              <Chip
                label={`Miembro desde ${new Date(user?.createdAt || Date.now()).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`}
                size="small"
                sx={{ fontSize: '0.68rem', bgcolor: 'rgba(79,195,247,0.08)', color: 'text.secondary', fontFamily: 'DM Mono' }}
              />
            </Box>

            {/* Selector de avatar */}
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1 }}>
                Elige avatar
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                {AVATAR_OPTIONS.map((emoji) => (
                  <Box key={emoji} onClick={() => setProfile((p) => ({ ...p, avatar: emoji }))}
                    sx={{
                      width: 34, height: 34, borderRadius: 1.5, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                      border: profile.avatar === emoji ? '2px solid #4fc3f7' : '2px solid transparent',
                      bgcolor: profile.avatar === emoji ? 'rgba(79,195,247,0.15)' : 'rgba(255,255,255,0.03)',
                      transition: 'all 0.15s',
                      '&:hover': { bgcolor: 'rgba(79,195,247,0.1)' },
                    }}>
                    {emoji}
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* ── Columna derecha ───────────────────────────── */}
        <Grid item xs={12} md={8}>

          {/* Información personal */}
          <Paper sx={{ p: 3, mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <Person sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontSize: '0.95rem' }}>Información personal</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Nombre completo" value={profile.name} size="small"
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Correo electrónico" value={profile.email} disabled size="small"
                  InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
                  helperText="El correo no se puede cambiar" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Ingreso predeterminado (MXN)" value={profile.defaultIncome}
                  type="number" size="small"
                  onChange={(e) => setProfile((p) => ({ ...p, defaultIncome: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><AttachMoney sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
                  helperText="Se usará al crear un nuevo mes" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Moneda" value={profile.currency} size="small"
                  onChange={(e) => setProfile((p) => ({ ...p, currency: e.target.value }))}
                  SelectProps={{ native: true }}>
                  <option value="MXN">MXN — Peso Mexicano</option>
                  <option value="USD">USD — Dólar</option>
                  <option value="EUR">EUR — Euro</option>
                </TextField>
              </Grid>
            </Grid>
          </Paper>

          {/* Preferencias */}
          <Paper sx={{ p: 3, mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <Notifications sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontSize: '0.95rem' }}>Preferencias y alertas</Typography>
            </Box>

            <FormControlLabel
              control={<Switch checked={prefs.showUSD} onChange={(e) => setPrefs((p) => ({ ...p, showUSD: e.target.checked }))} sx={{ '& .MuiSwitch-thumb': { bgcolor: 'primary.main' } }} />}
              label={<Typography variant="body2">Mostrar equivalente en USD</Typography>}
              sx={{ mb: 2, display: 'flex' }} />

            <FormControlLabel
              control={<Switch checked={prefs.alertCarro} onChange={(e) => setPrefs((p) => ({ ...p, alertCarro: e.target.checked }))} />}
              label={<Typography variant="body2">Alerta si el abono al carro supera el umbral</Typography>}
              sx={{ mb: 2, display: 'flex' }} />

            {prefs.alertCarro && (
              <Box sx={{ px: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'Syne', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1 }}>
                  Umbral de alerta: {prefs.alertThreshold}% del ingreso
                </Typography>
                <Slider value={prefs.alertThreshold} onChange={(_, v) => setPrefs((p) => ({ ...p, alertThreshold: v }))}
                  min={10} max={80} step={5}
                  marks={[{ value: 30, label: '30%' }, { value: 50, label: '50%' }, { value: 70, label: '70%' }]}
                  sx={{ mt: 1, color: 'primary.main' }} />
              </Box>
            )}
          </Paper>

          {/* Guardar perfil */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5 }}>
            <Button variant="contained" onClick={handleSaveProfile} disabled={saving}
              startIcon={saving ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <Save />}
              sx={{ background: 'linear-gradient(90deg, #4fc3f7, #00e5ff)', color: '#0a1628', fontWeight: 800 }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </Box>

          <Divider sx={{ borderColor: 'rgba(79,195,247,0.1)', mb: 2.5 }} />

          {/* Cambiar contraseña */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <Lock sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontSize: '0.95rem' }}>Cambiar contraseña</Typography>
            </Box>

            {passError   && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }} onClose={() => setPassError('')}>{passError}</Alert>}
            {passSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} icon={<CheckCircle />}>{passSuccess}</Alert>}

            <Grid container spacing={2}>
              {[
                { key: 'current', label: 'Contraseña actual',          show: 'current' },
                { key: 'nuevo',   label: 'Nueva contraseña',           show: 'nuevo'   },
                { key: 'confirm', label: 'Confirmar nueva contraseña', show: 'nuevo'   },
              ].map(({ key, label, show }) => (
                <Grid item xs={12} sm={key === 'confirm' ? 12 : 6} key={key}>
                  <TextField fullWidth label={label} size="small"
                    type={showPasswords[show] ? 'text' : 'password'}
                    value={passwords[key]}
                    onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                    InputProps={{
                      endAdornment: show === key ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPasswords((s) => ({ ...s, [show]: !s[show] }))}>
                            {showPasswords[show] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }} />
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={handleChangePassword} disabled={savingPass}
                startIcon={savingPass ? <CircularProgress size={16} /> : <Lock />}
                sx={{ borderColor: 'rgba(79,195,247,0.3)', color: 'primary.main' }}>
                {savingPass ? 'Cambiando...' : 'Cambiar contraseña'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}