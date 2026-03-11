import { ApiProperty } from '@nestjs/swagger';

class RoleDto {
  @ApiProperty({ example: 'a1b2c3d4', description: 'Encrypted role ID' })
  id: string;

  @ApiProperty({ example: 'SUPER_ADMIN' })
  code: string;

  @ApiProperty({ example: 'Super Admin' })
  name: string;
}

export class UserResponseDto {
  @ApiProperty({ example: 'a1b2c3d4', description: 'Encrypted user ID' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ type: RoleDto })
  role: RoleDto;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'DISABLED'] })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;

  @ApiProperty({ example: 100 })
  totalItems: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination: PaginationMetaDto;
}
