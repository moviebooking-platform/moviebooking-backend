import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { decryptId } from '@moviebooking/common';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'abc123xyz', description: 'Encrypted Role ID to assign to user' })
  @Transform(({ value }) => decryptId(String(value)))
  roleId: number;
}
