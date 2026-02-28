import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { UserStatus } from '../../../entities';
import { decryptId } from '@moviebooking/common';

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

  @ApiPropertyOptional({ example: 'abc123xyz', description: 'Encrypted Role ID to assign to user' })
  @IsOptional()
  @Transform(({ value }) => value !== undefined ? decryptId(String(value)) : undefined)
  roleId?: number;
}
