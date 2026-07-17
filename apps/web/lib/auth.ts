import type { RoleName, UserProfile } from '@repo/contracts';

const ADMIN_ROLES: RoleName[] = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];

export function isAdminUser(user: UserProfile | null): boolean {
  return !!user && user.roles.some((role) => ADMIN_ROLES.includes(role));
}
