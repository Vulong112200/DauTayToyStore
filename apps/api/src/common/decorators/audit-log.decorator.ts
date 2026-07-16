import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_ENTITY_KEY = 'auditLogEntity';

/**
 * Marks a controller (or a single handler) so mutating requests (POST/PATCH/PUT/DELETE)
 * against it are recorded to AuditLog by the global AuditLogInterceptor. GET handlers on
 * the same controller are automatically skipped — no need to opt individual read routes out.
 */
export const AuditLog = (entityType: string) => SetMetadata(AUDIT_LOG_ENTITY_KEY, entityType);
