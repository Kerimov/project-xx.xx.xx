import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export type ObjectSubscriptionMode = 'NONE' | 'ALL' | 'SELECTED';

type ObjectAccess = {
  loading: boolean;
  /** typeCode -> { mode, selectedCount } */
  subscriptions: Map<string, { mode: ObjectSubscriptionMode; selectedCount: number }>;
  isEnabled: (typeCode: string) => boolean;
  getMode: (typeCode: string) => ObjectSubscriptionMode;
  getSelectedCount: (typeCode: string) => number;
  refresh: () => Promise<void>;
};

const Ctx = createContext<ObjectAccess | undefined>(undefined);

export function ObjectAccessProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<Map<string, { mode: ObjectSubscriptionMode; selectedCount: number }>>(new Map());

  const refresh = async () => {
    if (!isAuthenticated) {
      setSubs(new Map());
      return;
    }
    setLoading(true);
    try {
      const res = await api.objects.subscriptions.listMy();
      const m = new Map<string, { mode: ObjectSubscriptionMode; selectedCount: number }>();
      (res.data || []).forEach((s) => {
        const code = String(s.typeCode || '').toUpperCase();
        m.set(code, { mode: s.mode as ObjectSubscriptionMode, selectedCount: Number(s.selectedCount || 0) });
      });
      setSubs(m);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const value = useMemo<ObjectAccess>(() => {
    const getMode = (typeCode: string): ObjectSubscriptionMode =>
      (subs.get(String(typeCode || '').toUpperCase())?.mode as ObjectSubscriptionMode) || 'NONE';
    const getSelectedCount = (typeCode: string): number =>
      Number(subs.get(String(typeCode || '').toUpperCase())?.selectedCount || 0);
    const isEnabled = (typeCode: string) => {
      const mode = getMode(typeCode);
      if (mode === 'NONE') return false;
      if (mode === 'SELECTED') return getSelectedCount(typeCode) > 0;
      return true;
    };
    return { loading, subscriptions: subs, isEnabled, getMode, getSelectedCount, refresh };
  }, [loading, subs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useObjectAccess() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useObjectAccess must be used within ObjectAccessProvider');
  }
  return ctx;
}

