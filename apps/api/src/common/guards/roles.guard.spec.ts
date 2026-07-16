import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function createContext(user?: { id: string; email: string; roles: RoleName[] }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('throws ForbiddenException when there is no authenticated user', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the user lacks the required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = createContext({ id: 'u1', email: 'a@b.com', roles: [RoleName.CUSTOMER] });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows access when the user has one of the required roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.ADMIN, RoleName.STAFF]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = createContext({ id: 'u1', email: 'a@b.com', roles: [RoleName.STAFF] });

    expect(guard.canActivate(context)).toBe(true);
  });
});
