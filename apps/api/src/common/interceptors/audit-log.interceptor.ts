import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { AUDIT_LOG_ENTITY_KEY } from '../decorators/audit-log.decorator';

const ACTION_BY_METHOD: Record<string, string> = {
  POST: 'create',
  PATCH: 'update',
  PUT: 'update',
  DELETE: 'delete',
};

/**
 * Generic counterpart to the manual AuditLogService.record() calls in AuthService — rather
 * than hand-writing a record() call in every admin service, controllers opt in with
 * @AuditLog('EntityType') and this interceptor derives action/entityId/actor from the
 * request/response automatically. No "before" snapshot is captured (no pre-fetch happens
 * here), matching the same before-less shape AuthService's manual calls already use.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entityType = this.reflector.getAllAndOverride<string | undefined>(AUDIT_LOG_ENTITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const actionSuffix = ACTION_BY_METHOD[request.method];

    if (!entityType || !actionSuffix) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((response) => {
        const entityId = this.resolveEntityId(request.params, response);

        void this.auditLogService.record({
          actorId: request.user?.id ?? null,
          action: `${entityType}.${actionSuffix}`,
          entityType,
          entityId,
          after: request.method === 'DELETE' ? undefined : (response as object),
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
      }),
    );
  }

  /** Route params/response bodies don't all name their id the same way (`id`, `productId`, ...),
   * so this checks the common shapes rather than assuming a single field name everywhere. */
  private resolveEntityId(
    params: Record<string, string | string[]> | undefined,
    response: unknown,
  ): string | null {
    const fromParams = params?.id ?? params?.productId;
    if (fromParams) return Array.isArray(fromParams) ? (fromParams[0] ?? null) : fromParams;

    if (response && typeof response === 'object') {
      const record = response as Record<string, unknown>;
      const value = record.id ?? record.productId;
      if (value !== undefined && value !== null) return String(value);
    }

    return null;
  }
}
