import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TheatreAdminsService } from './theatre-admins.service';
import { CreateTheatreAdminDto } from './dto/create-theatre-admin.dto';
import { UpdateTheatreAdminStatusDto } from './dto/update-theatre-admin-status.dto';
import { ListTheatreAdminsQueryDto } from './dto/list-theatre-admins-query.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  ROLES,
  Roles,
  DecryptId,
} from '@moviebooking/common';

@ApiTags('theatre-admins')
@Controller('theatre-admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
export class TheatreAdminsController {
  constructor(private readonly theatreAdminsService: TheatreAdminsService) {}

  @Post()
  @ApiOperation({ summary: 'Assign user to theatre', description: 'Create theatre admin assignment (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Duplicate assignment' })
  @ApiResponse({ status: 422, description: 'User does not have THEATRE_ADMIN role' })
  async create(@Body() dto: CreateTheatreAdminDto) {
    return this.theatreAdminsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List theatre admin assignments', description: 'Paginated list (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Assignments retrieved' })
  async findAll(@Query() query: ListTheatreAdminsQueryDto) {
    return this.theatreAdminsService.findAll(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update assignment status', description: 'Set ACTIVE or DISABLED (Super Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Assignment ID' })
  @ApiResponse({ status: 200, description: 'Assignment updated' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async updateStatus(
    @DecryptId('id') id: number,
    @Body() dto: UpdateTheatreAdminStatusDto,
  ) {
    return this.theatreAdminsService.updateStatus(id, dto);
  }
}
