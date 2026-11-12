import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CancelBookingDto {
  @ApiProperty({
    description: 'Email address the booking was made with',
    example: 'guest@example.com',
  })
  @IsEmail({}, { message: 'Valid email address is required' })
  @IsNotEmpty()
  email: string;
}
