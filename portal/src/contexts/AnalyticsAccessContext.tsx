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
      // Загружаем сразу две сущности:
      // 1) Подписки на аналитики (COUNTERPARTY, CONTRACT, WAREHOUSE и т.д.)
      // 2) Подписки на объекты учета (FIXED_ASSET, WAREHOUSE и т.д.)
      //
      // Для ряда кодов (CONTRACT, WAREHOUSE, ACCOUNT, BANK_ACCOUNT, DEPARTMENT)
      // аналитика и объект учета представляют один и тот же справочник.
      // Поэтому считаем аналитику "доступной", если:
      // - включена подписка на аналитику ИЛИ
      // - включена подписка на объект учета (режим ALL или SELECTED с выбранными карточками).
      const [analyticsRes, objectSubsRes] = await Promise.all([
        api.analytics.listSubscriptions(),
        api.objects.subscriptions
          .listMy()
          .catch(() => ({ data: [] as Array<{ typeCode: string; mode: 'NONE' | 'ALL' | 'SELECTED'; selectedCount: number }> }))
      ]);

      const set = new Set<string>();

      // Подписки на аналитики
      (analyticsRes.data || []).forEach((s) => {
        if (s.isEnabled) set.add(String(s.typeCode || '').toUpperCase());
      });

      // Подписки на объекты учета (v2)
      (objectSubsRes.data || []).forEach((s) => {
        const code = String(s.typeCode || '').toUpperCase();
        const hasAccess =
          s.mode === 'ALL' ||
          (s.mode === 'SELECTED' && (s.selectedCount ?? 0) > 0);
        if (hasAccess) {
          set.add(code);
        }
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

