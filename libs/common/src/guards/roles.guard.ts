import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RoleCode } from '../constants/roles.constant';
import { ERROR_CODES } from '../constants/error-codes.constant';

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
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Access denied',
      });
    }

    const hasRole = requiredRoles.includes(user.role?.code);

    if (!hasRole) {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Insufficient permissions',
      });
    }

    return true;
  }
}
