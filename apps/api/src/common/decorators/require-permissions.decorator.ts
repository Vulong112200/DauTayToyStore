import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/** All listed permission keys are required (AND, not OR) — mirrors `@Roles()`'s
 * `SetMetadata`/`Reflector.getAllAndOverride` shape but is enforced by the separate
 * `PermissionsGuard`, additively alongside `@Roles()` rather than replacing it. */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
