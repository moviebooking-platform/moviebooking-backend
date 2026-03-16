import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RoleCode } from '../constants/roles.constant';
import { AppException } from '../exceptions/app.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new AppException('FORBIDDEN');
    }

    const hasRole = requiredRoles.includes(user.role?.code);

    if (!hasRole) {
      throw new AppException('FORBIDDEN', 'Insufficient permissions');
    }

    return true;
  }
}
