import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';
import { decryptId } from '@moviebooking/common';
import { BadRequestException } from '@nestjs/common';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '<encrypted>', description: 'Encrypted Role ID' })
  @Transform(({ value }) => {
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
  roleId: number;
}