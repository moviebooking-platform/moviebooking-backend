import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTheatreAdminDto {
  @ApiProperty({ description: 'Encrypted User ID', example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Encrypted Theatre ID', example: 'xyz789' })
  @IsString()
  @IsNotEmpty()
  theatreId: string;
}
