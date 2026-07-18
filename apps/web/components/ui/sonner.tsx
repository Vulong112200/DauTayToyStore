'use client';

import { useTheme } from 'next-themes';
import { Toaster as SonnerToaster } from 'sonner';

/**
 * App-wide toast host. Mounted once in the root layout. Mirrors the current
 * next-themes value (which drives our `data-theme` attribute) so toasts match
 * light/dark. Styled to inherit the app's design tokens rather than sonner's
 * defaults, keeping the strawberry theme consistent.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={(resolvedTheme as 'light' | 'dark' | undefined) ?? 'light'}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-2xl border border-border font-sans',
        },
      }}
    />
  );
}
