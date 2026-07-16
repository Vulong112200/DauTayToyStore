import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { AuditLogInterceptor } from './audit-log.interceptor';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let reflector: { getAllAndOverride: jest.Mock };
  let auditLogService: { record: jest.Mock };

  function makeContext(request: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    auditLogService = { record: jest.fn() };
    interceptor = new AuditLogInterceptor(
      reflector as unknown as Reflector,
      auditLogService as unknown as AuditLogService,
    );
  });

  it('skips recording when no @AuditLog metadata is present', (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const request = { method: 'POST', params: {}, headers: {} };

    interceptor.intercept(makeContext(request), { handle: () => of({ id: '1' }) }).subscribe(() => {
      expect(auditLogService.record).not.toHaveBeenCalled();
      done();
    });
  });

  it('skips recording for GET requests even when metadata is present', (done) => {
    reflector.getAllAndOverride.mockReturnValue('Product');
    const request = { method: 'GET', params: {}, headers: {} };

    interceptor.intercept(makeContext(request), { handle: () => of([{ id: '1' }]) }).subscribe(() => {
      expect(auditLogService.record).not.toHaveBeenCalled();
      done();
    });
  });

  it('records a create action with the actor and response as after', (done) => {
    reflector.getAllAndOverride.mockReturnValue('Product');
    const request = {
      method: 'POST',
      params: {},
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
      user: { id: 'admin-1' },
    };

    interceptor
      .intercept(makeContext(request), { handle: () => of({ id: 'p1', name: 'LEGO' }) })
      .subscribe(() => {
        expect(auditLogService.record).toHaveBeenCalledWith({
          actorId: 'admin-1',
          action: 'Product.create',
          entityType: 'Product',
          entityId: 'p1',
          after: { id: 'p1', name: 'LEGO' },
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        });
        done();
      });
  });

  it('falls back to a productId-shaped route param when there is no id', (done) => {
    reflector.getAllAndOverride.mockReturnValue('Inventory');
    const request = {
      method: 'PATCH',
      params: { productId: 'prod-1' },
      headers: {},
    };

    interceptor
      .intercept(makeContext(request), { handle: () => of({ productId: 'prod-1' }) })
      .subscribe(() => {
        expect(auditLogService.record).toHaveBeenCalledWith(
          expect.objectContaining({ entityId: 'prod-1', action: 'Inventory.update' }),
        );
        done();
      });
  });

  it('omits the after snapshot for DELETE actions', (done) => {
    reflector.getAllAndOverride.mockReturnValue('Category');
    const request = { method: 'DELETE', params: { id: 'c1' }, headers: {} };

    interceptor
      .intercept(makeContext(request), { handle: () => of({ success: true }) })
      .subscribe(() => {
        expect(auditLogService.record).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'Category.delete', entityId: 'c1', after: undefined }),
        );
        done();
      });
  });
});
