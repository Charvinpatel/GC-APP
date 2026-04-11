import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';

/**
 * Custom hook to automatically trigger a refresh callback at a set interval.
 * Only active when the screen is focused.
 * 
 * @param {Function} onRefresh - The function to call for refreshing data.
 * @param {number} intervalMs - Interval in milliseconds (Default: 60s).
 */
export function useAutoRefresh(onRefresh, intervalMs = 60000) {
  const isFocused = useIsFocused();
  const refreshRef = useRef(onRefresh);

  // Keep ref updated to avoid stale closures
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!isFocused) return;

    // Trigger initial refresh if needed or wait for interval
    // We'll wait for interval because most screens already load on mount/focus
    
    const interval = setInterval(() => {
      if (refreshRef.current) {
        console.log('Auto-refreshing...');
        refreshRef.current();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isFocused, intervalMs]);
}
