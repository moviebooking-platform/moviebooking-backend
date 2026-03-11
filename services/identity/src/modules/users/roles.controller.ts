import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard, RolesGuard, ROLES, Roles } from '@moviebooking/common';
import { RoleResponseDto } from './dto/role-response.dto';

@ApiTags('roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all roles', description: 'Get all available roles (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Roles retrieved', type: [RoleResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires SUPER_ADMIN role' })
  async findAll() {
    return this.rolesService.findAll();
  }
}
