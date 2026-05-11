import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { AppState } from 'react-native';
import { useCallback, useEffect, useRef } from 'react';

interface AutoRefreshOptions {
  enabled?: boolean;
  intervalMs?: number | null;
  minIntervalMs?: number;
}

export function useAutoRefreshOnFocus(
  refresh: () => void | Promise<void>,
  { enabled = true, intervalMs = 45000, minIntervalMs = 1500 }: AutoRefreshOptions = {}
) {
  const isFocused = useIsFocused();
  const refreshRef = useRef(refresh);
  const lastRunRef = useRef(0);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const runRefresh = useCallback(() => {
    if (!enabled) {
      return;
    }

    const now = Date.now();
    if (now - lastRunRef.current < minIntervalMs) {
      return;
    }

    lastRunRef.current = now;
    void refreshRef.current();
  }, [enabled, minIntervalMs]);

  useFocusEffect(
    useCallback(() => {
      runRefresh();
    }, [runRefresh])
  );

  useEffect(() => {
    if (!enabled || !isFocused) {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        runRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, isFocused, runRefresh]);

  useEffect(() => {
    if (!enabled || !isFocused || !intervalMs) {
      return;
    }

    const timer = setInterval(() => {
      runRefresh();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [enabled, intervalMs, isFocused, runRefresh]);
}
