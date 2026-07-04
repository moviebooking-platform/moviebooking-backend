import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsString,
} from 'class-validator';

export class HoldSeatsDto {
  @ApiProperty({
    description: 'Encrypted show ID',
    example: 'abc123xyz',
  })
  @IsString()
  @IsNotEmpty()
  showId: string;

  @ApiProperty({
    description: 'Array of encrypted seat IDs to hold',
    example: ['seat1', 'seat2', 'seat3'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one seat must be selected' })
  @ArrayMaxSize(10, { message: 'Cannot book more than 10 seats at once' })
  @ArrayUnique({ message: 'Duplicate seat IDs are not allowed' })
  @IsString({ each: true })
  seatIds: string[];

  @ApiProperty({
    description: 'Guest email for booking confirmation',
    example: 'guest@example.com',
  })
  @IsEmail({}, { message: 'Valid email address is required' })
  @IsNotEmpty()
  email: string;
}
