import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDB, seedDemoData } from '../db/schema';

// ============================================================
// AuthContext v2 — Usa la capa DB centralizada (schema.js)
// Soporta: login, registro, actualizar perfil, cambiar contraseña
// ============================================================

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sembrar datos demo si la BD está vacía
    seedDemoData();
    // Restaurar sesión activa
    const session = UserDB.getCurrentSession();
    setUser(session);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    await new Promise((r) => setTimeout(r, 600));
    const userData = UserDB.login(email, password);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    UserDB.logout();
    setUser(null);
  };

  const register = async (email, password, name) => {
    await new Promise((r) => setTimeout(r, 600));
    UserDB.create({ email, password, name });
    const session = UserDB.login(email, password);
    setUser(session);
    return session;
  };

  const updateProfile = (updates) => {
    if (!user) return;
    const updated = UserDB.update(user.uid, updates);
    setUser(updated);
    return updated;
  };

  const changePassword = (currentPassword, newPassword) => {
    if (!user) throw new Error('No hay sesión activa');
    return UserDB.changePassword(user.uid, currentPassword, newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
