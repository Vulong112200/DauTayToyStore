import type { RoleName, UserProfile } from '@repo/contracts';

const ADMIN_ROLES: RoleName[] = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];
const MANAGE_ROLES: RoleName[] = ['SUPER_ADMIN', 'ADMIN'];

export function isAdminUser(user: UserProfile | null): boolean {
  return !!user && user.roles.some((role) => ADMIN_ROLES.includes(role));
}

/**
 * Can this user perform write actions (create/update/delete) on the
 * catalog/marketing/content/media admin modules? The API restricts those to
 * ADMIN/SUPER_ADMIN — STAFF gets read-only access there (plus inventory and
 * order-status, which are separately STAFF-allowed). Mirror that on the frontend
 * so STAFF isn't shown "Thêm/Xoá" buttons whose requests would just 403.
 */
export function canManageContent(user: UserProfile | null): boolean {
  return !!user && user.roles.some((role) => MANAGE_ROLES.includes(role));
}
