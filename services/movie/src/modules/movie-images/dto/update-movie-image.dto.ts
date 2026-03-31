import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMovieImageDto {
  @ApiProperty({ description: 'Set this image as primary' })
  @IsBoolean()
  isPrimary: boolean;
}
