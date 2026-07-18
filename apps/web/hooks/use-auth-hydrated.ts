'use client';

import * as React from 'react';
import { useAuthStore } from '@/store/auth-store';

/** True once the persisted Zustand auth store has finished reading localStorage. */
export function useAuthHydrated(): boolean {
  // Must start `false` — the persist API (`useAuthStore.persist`) is only wired
  // up in the browser, so calling it in the useState initializer crashes during
  // SSR/static prerender ("Cannot read properties of undefined (reading
  // 'hasHydrated')"). This also keeps the server render and the first client
  // render in agreement (both "not hydrated"), avoiding a hydration mismatch;
  // the effect below flips it to true on the client once localStorage is read.
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsubscribe;
  }, []);

  return hydrated;
}
