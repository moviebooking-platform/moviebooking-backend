import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@moviebooking/common';
import { UserStatus } from '../../../entities';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'SUPER_ADMIN', description: 'Filter by role code' })
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({ enum: UserStatus, example: 'ACTIVE', description: 'Filter by status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 'john', description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}
