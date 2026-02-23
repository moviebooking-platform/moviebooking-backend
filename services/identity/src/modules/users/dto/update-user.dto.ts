import { IsString, IsOptional, IsInt, IsEnum, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../entities';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'User full name', minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: UserStatus, example: 'ACTIVE', description: 'User status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 1, description: 'Role ID to assign to user' })
  @IsOptional()
  @IsInt()
  roleId?: number;
}
