'use client';

import * as React from 'react';
import { useAuthStore } from '@/store/auth-store';

/** True once the persisted Zustand auth store has finished reading localStorage. */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(() => useAuthStore.persist.hasHydrated());

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
