import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, RoleCode } from '../constants/roles.constant';

export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
