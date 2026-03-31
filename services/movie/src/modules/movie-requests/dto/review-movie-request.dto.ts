import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewMovieRequestDto {
  @ApiProperty({ example: 'Approved - high demand expected' })
  @IsString()
  @IsNotEmpty()
  reviewReason: string;
}
