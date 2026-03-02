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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserResponseDto, PaginatedUsersResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLES, DecryptId } from '@moviebooking/common';
import { Roles } from './decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all users', description: 'Get paginated list of users (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved', type: PaginatedUsersResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires SUPER_ADMIN role' })
  async findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create user', description: 'Create a new user (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'User created', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires SUPER_ADMIN role' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID', description: 'Get user details (Super Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires SUPER_ADMIN role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@DecryptId('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user', description: 'Update user details (Super Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted User ID' })
  @ApiResponse({ status: 200, description: 'User updated', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires SUPER_ADMIN role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @DecryptId('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reset user password', description: 'Generate new temporary password for user (Super Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted User ID' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires SUPER_ADMIN role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(@DecryptId('id') id: number) {
    return this.usersService.resetPassword(id);
  }

  @Patch(':id/status')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user status', description: 'Enable or disable user (Super Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted User ID' })
  @ApiResponse({ status: 200, description: 'Status updated', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires SUPER_ADMIN role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateStatus(
    @DecryptId('id') id: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.usersService.updateStatus(id, updateStatusDto.status);
  }
}
