import { IsString, IsOptional, IsEnum, MinLength, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../entities';
import { Transform } from 'class-transformer';
import { decryptId } from '@moviebooking/common';
import { BadRequestException } from '@nestjs/common';

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

  @ApiPropertyOptional({ example: '<encrypted>', description: 'Encrypted Role ID' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || String(value).trim() === '') {
      return undefined;
    }

    const id = decryptId(String(value));
    if (id === null) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid roleId',
      });
    }

    return id;
  }, { toClassOnly: true })
  @IsInt()
  @Min(1)
  roleId?: number;
}