import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, RoleCode } from '@moviebooking/common';

export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
