import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateTheatreDto {
  @ApiProperty({ example: 'PVR Cinemas', minLength: 2, maxLength: 255 })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Mumbai', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: '123 Main Street, Andheri West', minLength: 5, maxLength: 255 })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  address: string;
}
