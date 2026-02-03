import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

type AnalyticsAccess = {
  loading: boolean;
  enabledTypeCodes: Set<string>;
  isEnabled: (typeCode: string) => boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AnalyticsAccess | undefined>(undefined);

export function AnalyticsAccessProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [enabledTypeCodes, setEnabledTypeCodes] = useState<Set<string>>(new Set());

  const refresh = async () => {
    if (!isAuthenticated) {
      setEnabledTypeCodes(new Set());
      return;
    }
    setLoading(true);
    try {
      const res = await api.analytics.listSubscriptions();
      const set = new Set<string>();
      (res.data || []).forEach((s) => {
        if (s.isEnabled) set.add(String(s.typeCode || '').toUpperCase());
      });
      setEnabledTypeCodes(set);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const value = useMemo<AnalyticsAccess>(() => {
    const isEnabled = (typeCode: string) => enabledTypeCodes.has(String(typeCode || '').toUpperCase());
    return { loading, enabledTypeCodes, isEnabled, refresh };
  }, [loading, enabledTypeCodes]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAnalyticsAccess() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useAnalyticsAccess must be used within AnalyticsAccessProvider');
  }
  return ctx;
}

