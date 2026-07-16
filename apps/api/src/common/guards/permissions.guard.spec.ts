import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { PermissionsGuard } from './permissions.guard';

function createContext(
  user?: { id: string; email: string; roles: RoleName[]; permissions: string[] },
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows access when no permissions are required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('throws ForbiddenException when there is no authenticated user', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['product:create']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the user lacks one of the required permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['product:create']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = createContext({
      id: 'u1',
      email: 'a@b.com',
      roles: [RoleName.STAFF],
      permissions: ['product:read', 'product:update'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows access when the user has all required permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['product:create']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = createContext({
      id: 'u1',
      email: 'a@b.com',
      roles: [RoleName.ADMIN],
      permissions: ['product:read', 'product:create'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('requires every permission when more than one is declared (AND semantics)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['product:read', 'product:update']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = createContext({
      id: 'u1',
      email: 'a@b.com',
      roles: [RoleName.STAFF],
      permissions: ['product:read'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
