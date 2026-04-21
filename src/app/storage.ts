import { useEffect, useState } from "react";

export function usePersistentState<T>(
  key: string,
  fallback: T,
): [T, (nextValue: T | ((currentValue: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Local storage can be disabled in restricted previews.
    }
  }, [key, value]);

  return [value, setValue];
}
