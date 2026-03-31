import { IsString, IsUrl, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMovieImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/movies/dune2-poster.jpg' })
  @IsString()
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;
}
