'use client';

import { canManageContent } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';

/**
 * True when the logged-in admin may write to the catalog/marketing/content/media
 * modules (ADMIN/SUPER_ADMIN). Use to hide create/delete controls from STAFF,
 * whose write requests the API rejects with 403. See `canManageContent`.
 */
export function useCanManageContent(): boolean {
  const user = useAuthStore((state) => state.user);
  return canManageContent(user);
}
