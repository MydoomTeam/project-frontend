import { useCallback, useEffect, useRef, useState } from 'react';

export const usePeriodicAsync = <T>(
  asyncFn: () => Promise<T>,
  intervalMs: number,
  dependencies: unknown[] = [],
  initialValue: T,
): [T, boolean, () => Promise<void>] => {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const asyncFnRef = useRef(asyncFn);
  const mountedRef = useRef(true);

  useEffect(() => {
    asyncFnRef.current = asyncFn;
  }, [asyncFn]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await asyncFnRef.current();
      if (mountedRef.current) {
        setValue(result);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let intervalId: number;

    refresh();
    intervalId = window.setInterval(refresh, intervalMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs, refresh, ...dependencies]);

  return [value, isLoading, refresh];
};
