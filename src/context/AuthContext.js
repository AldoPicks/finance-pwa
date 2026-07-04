import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserService, AuditService } from '../firebase/services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [fbUser,  setFbUser]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFbUser(firebaseUser);
        try {
          let profile = await UserService.getProfile(firebaseUser.uid);
          const isNewAccount = !profile || !profile.createdAt;

          if (isNewAccount && !firebaseUser.emailVerified) {
            // Cuenta nueva sin verificar — bloquear acceso
            setUser(null);
          } else {
            if (!profile) {
              // ✅ El perfil no existe en Firestore pero el usuario sí está autenticado
              // (cuenta antigua o creada externamente) — crearlo automáticamente
              profile = await UserService.createProfile(firebaseUser.uid, {
                email: firebaseUser.email,
                name:  firebaseUser.displayName || 'Usuario',
              });
            }
            setUser(profile);
          }
        } catch (e) {
          console.error('Error cargando perfil:', e);
          // Fallback mínimo para no bloquear el acceso
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, name: 'Usuario' });
        }
      } else {
        setFbUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // ✅ Solo bloquear si el perfil ya existe en Firestore Y el correo no está verificado
    // Esto evita bloquear cuentas antiguas creadas antes de implementar la verificación
    const profile = await UserService.getProfile(cred.user.uid);
    const isNewAccount = !profile || !profile.createdAt;

    if (isNewAccount && !cred.user.emailVerified) {
      await signOut(auth);
      const err = new Error('Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.');
      err.code = 'auth/email-not-verified';
      throw err;
    }

    // ✅ Verificar si el usuario usó contraseña temporal
    const hasTemp = await UserService.hasTemporaryPassword(cred.user.uid);
    const profileWithTemp = { ...profile, hasTemporaryPassword: hasTemp };

    AuditService.log(cred.user.uid, 'AUTH_LOGIN', {
      email, userName: profile?.name || '',
      detail: `Login desde ${/Mobi/.test(navigator.userAgent) ? 'móvil' : 'desktop'}`,
    });
    return profileWithTemp;
  };

  const register = async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // ✅ Crear perfil en Firestore aunque el correo no esté verificado aún
    await UserService.createProfile(cred.user.uid, { email, name });
    AuditService.log(cred.user.uid, 'AUTH_REGISTER', {
      email, userName: name,
      detail: 'Nueva cuenta creada — pendiente verificación de correo',
    });

    // ✅ Enviar correo de verificación
    await sendEmailVerification(cred.user);

    // Cerramos sesión para forzar que verifiquen antes de entrar
    await signOut(auth);

    return { emailSent: true };
  };

  const logout = async () => {
    if (user) {
      AuditService.log(user.uid, 'AUTH_LOGOUT', {
        email: user.email, userName: user.name,
        detail: 'Sesión cerrada',
      });
    }
    await signOut(auth);
  };

  // ✅ Reenviar correo de verificación (por si venció o no llegó)
  const resendVerificationEmail = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (cred.user.emailVerified) {
      await signOut(auth);
      throw new Error('Este correo ya fue verificado. Puedes iniciar sesión normalmente.');
    }
    await sendEmailVerification(cred.user);
    await signOut(auth);
    return true;
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    const updated = await UserService.updateProfile(user.uid, updates);
    // ✅ Si updated es null/undefined (Firestore falló el getDoc), conservar user actual + updates
    setUser(updated || { ...user, ...updates });
    AuditService.log(user.uid, 'PROFILE_UPDATE', {
      email: user.email, userName: user.name,
      detail: `Campos: ${Object.keys(updates).join(', ')}`,
      before: { name: user.name, currency: user.currency, defaultIncome: user.defaultIncome },
      after:  updates,
    });
    return updated || { ...user, ...updates };
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!fbUser) throw new Error('No hay sesión activa');
    const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
    await reauthenticateWithCredential(fbUser, credential);
    await updatePassword(fbUser, newPassword);
    await UserService.clearTemporaryPassword(user.uid);
    AuditService.log(user.uid, 'AUTH_CHANGE_PASSWORD', {
      email: user.email, userName: user.name,
      detail: 'Contraseña cambiada',
    });
    return true;
  };

  const requestPasswordReset = async (email) => {
    await sendPasswordResetEmail(auth, email);
    AuditService.log(auth.currentUser?.uid || 'anonymous', 'AUTH_PASSWORD_RESET_REQUESTED', {
      email,
      detail: 'Solicitud de recuperación de contraseña',
    });
    return { email };
  };

  const clearTemporaryPassword = async () => {
    if (!user) return;
    await UserService.clearTemporaryPassword(user.uid);
    setUser({ ...user, hasTemporaryPassword: false });
  };

  return (
    <AuthContext.Provider value={{
      user, fbUser, loading,
      login, logout, register, updateProfile, changePassword,
      resendVerificationEmail, requestPasswordReset, clearTemporaryPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);