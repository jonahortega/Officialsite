import { useEffect, useState } from 'react';

/**
 * Re-render periodically so “past vs upcoming” lists update without navigation.
 * Default 30s — light weight vs polling every second.
 */
export function useSchoolClockTick(intervalMs = 30000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return tick;
}
