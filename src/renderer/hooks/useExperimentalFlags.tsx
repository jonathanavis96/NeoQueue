import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppState, ExperimentalFlags as PersistedExperimentalFlags } from '../../shared/types';
import { getEnvExperimentalFlags, mergeExperimentalFlags } from '../experimentalFlags';

export type ExperimentalFlags = ReturnType<typeof getEnvExperimentalFlags>;
export type ExperimentalFlagKey = keyof ExperimentalFlags;

type ExperimentalFlagOverrides = Partial<PersistedExperimentalFlags> | undefined;

type ExperimentalFlagsContextValue = {
  flags: ExperimentalFlags;
  setFlag: (key: ExperimentalFlagKey, enabled: boolean) => Promise<void>;
};

const ExperimentalFlagsContext = createContext<ExperimentalFlagsContextValue | null>(null);

export const ExperimentalFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const envFlags = useMemo(() => getEnvExperimentalFlags(), []);
  const [overrides, setOverrides] = useState<ExperimentalFlagOverrides>(undefined);

  // Load persisted overrides once. Best-effort: absence is fine.
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await window.electronAPI.loadData();
        if (!response.success || !response.data) return;
        const next = response.data.settings?.experimentalFlags;
        if (isMounted) setOverrides(next);
      } catch {
        // ignore
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const flags = useMemo(() => mergeExperimentalFlags(envFlags, overrides), [envFlags, overrides]);

  const setFlag = useCallback<ExperimentalFlagsContextValue['setFlag']>(
    async (key, enabled) => {
      // Optimistic UI update.
      const nextOverrides: ExperimentalFlagOverrides = { ...(overrides ?? {}), [key]: enabled };
      setOverrides(nextOverrides);

      try {
        const response = await window.electronAPI.loadData();
        if (!response.success || !response.data) return;

        const current = response.data;
        const nextState: AppState = {
          ...current,
          settings: {
            ...(current.settings ?? {}),
            experimentalFlags: {
              ...(current.settings?.experimentalFlags ?? {}),
              [key]: enabled,
            },
          },
        };

        await window.electronAPI.saveData(nextState);
      } catch {
        // Best-effort: if save fails, revert to previous overrides.
        setOverrides(overrides);
      }
    },
    [overrides]
  );

  const value = useMemo<ExperimentalFlagsContextValue>(() => ({ flags, setFlag }), [flags, setFlag]);

  return <ExperimentalFlagsContext.Provider value={value}>{children}</ExperimentalFlagsContext.Provider>;
};

export const useExperimentalFlags = (): ExperimentalFlagsContextValue => {
  const ctx = useContext(ExperimentalFlagsContext);
  if (!ctx) throw new Error('useExperimentalFlags must be used within ExperimentalFlagsProvider');
  return ctx;
};
