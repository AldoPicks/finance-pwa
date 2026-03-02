import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserService, AuditService } from '../firebase/services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);   // perfil de Firestore
  const [fbUser,  setFbUser]  = useState(null);   // Firebase Auth user
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFbUser(firebaseUser);
        try {
          const profile = await UserService.getProfile(firebaseUser.uid);
          setUser(profile || {
            uid:   firebaseUser.uid,
            email: firebaseUser.email,
            name:  firebaseUser.displayName || 'Usuario',
          });
        } catch (e) {
          console.error('Error cargando perfil:', e);
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
    const cred    = await signInWithEmailAndPassword(auth, email, password);
    const profile = await UserService.getProfile(cred.user.uid);
    AuditService.log(cred.user.uid, 'AUTH_LOGIN', {
      email, userName: profile?.name || '',
      detail: `Login desde ${/Mobi/.test(navigator.userAgent) ? 'móvil' : 'desktop'}`,
    });
    return profile;
  };

  const register = async (email, password, name) => {
    const cred    = await createUserWithEmailAndPassword(auth, email, password);
    const profile = await UserService.createProfile(cred.user.uid, { email, name });
    AuditService.log(cred.user.uid, 'AUTH_REGISTER', {
      email, userName: name,
      detail: 'Nueva cuenta creada',
    });
    setUser(profile);
    return profile;
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

  const updateProfile = async (updates) => {
    if (!user) return;
    const updated = await UserService.updateProfile(user.uid, updates);
    setUser(updated);
    AuditService.log(user.uid, 'PROFILE_UPDATE', {
      email: user.email, userName: user.name,
      detail: `Campos: ${Object.keys(updates).join(', ')}`,
      before: { name: user.name, currency: user.currency, defaultIncome: user.defaultIncome },
      after:  updates,
    });
    return updated;
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!fbUser) throw new Error('No hay sesión activa');
    const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
    await reauthenticateWithCredential(fbUser, credential);
    await updatePassword(fbUser, newPassword);
    AuditService.log(user.uid, 'AUTH_CHANGE_PASSWORD', {
      email: user.email, userName: user.name,
      detail: 'Contraseña cambiada',
    });
    return true;
  };

  return (
    <AuthContext.Provider value={{
      user, fbUser, loading,
      login, logout, register, updateProfile, changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
