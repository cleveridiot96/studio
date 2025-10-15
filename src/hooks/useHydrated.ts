"use client";

import { useState, useEffect } from 'react';

/**
 * A simple hook that returns `true` only after the component has mounted on the client.
 * This is useful for preventing hydration mismatches by conditionally rendering
 * components that rely on browser-specific APIs (like localStorage or window).
 *
 * @returns {boolean} `true` if the component is hydrated, `false` otherwise.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
