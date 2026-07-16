import { RoleName } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: RoleName[];
  /** Flattened, deduped `Permission.key`s across all of the user's roles — see PermissionsGuard. */
  permissions: string[];
}
