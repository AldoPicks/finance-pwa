import React, { createContext, useContext, useCallback } from 'react';
import { AuditService } from '../firebase/services';
import { useAuth } from './AuthContext';

const AuditContext = createContext(null);

export function AuditProvider({ children }) {
  const { user } = useAuth();

  const log = useCallback((action, opts = {}) => {
    if (!user) return;
    return AuditService.log(user.uid, action, {
      email: user.email, userName: user.name, ...opts,
    });
  }, [user]);

  return (
    <AuditContext.Provider value={{ log, AuditService }}>
      {children}
    </AuditContext.Provider>
  );
}

export const useAudit = () => useContext(AuditContext);
