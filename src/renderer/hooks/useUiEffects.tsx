import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type UiPulseAction = 'add' | 'copy' | 'toggleComplete' | 'restore' | 'other';

interface UiEffectsContextValue {
  scanlinesEnabled: boolean;
  setScanlinesEnabled: (enabled: boolean) => void;
  triggerPulse: (action?: UiPulseAction) => void;
  pulseAction: UiPulseAction | null;
}

const UiEffectsContext = createContext<UiEffectsContextValue | null>(null);

const SCANLINES_KEY = 'neoqueue.ui.effects.scanlines';

interface UiEffectsProviderProps {
  children: React.ReactNode;
}

export const UiEffectsProvider: React.FC<UiEffectsProviderProps> = ({ children }) => {
  const [scanlinesEnabled, setScanlinesEnabledState] = useState(false);
  const [pulseAction, setPulseAction] = useState<UiPulseAction | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SCANLINES_KEY);
      setScanlinesEnabledState(saved === 'true');
    } catch {
      // ignore
    }
  }, []);

  const setScanlinesEnabled = useCallback((enabled: boolean) => {
    setScanlinesEnabledState(enabled);
    try {
      window.localStorage.setItem(SCANLINES_KEY, String(enabled));
    } catch {
      // ignore
    }
  }, []);

  const triggerPulse = useCallback((action: UiPulseAction = 'other') => {
    setPulseAction(action);

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    // Keep the effect short and safe (under ~300ms).
    timeoutRef.current = window.setTimeout(() => {
      setPulseAction(null);
    }, 280);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const value = useMemo<UiEffectsContextValue>(() => ({
    scanlinesEnabled,
    setScanlinesEnabled,
    triggerPulse,
    pulseAction,
  }), [scanlinesEnabled, setScanlinesEnabled, triggerPulse, pulseAction]);

  return <UiEffectsContext.Provider value={value}>{children}</UiEffectsContext.Provider>;
};

export const useUiEffects = (): UiEffectsContextValue => {
  const ctx = useContext(UiEffectsContext);
  if (!ctx) {
    throw new Error('useUiEffects must be used within UiEffectsProvider');
  }
  return ctx;
};
