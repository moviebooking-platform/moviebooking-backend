import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMovieDto {
  @ApiProperty({ example: 'Dune: Part Two' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: '2024-03-01', description: 'Movie release date (YYYY-MM-DD)' })
  @IsDateString()
  releaseDate: string;

  @ApiPropertyOptional({ example: 'The saga continues...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Timothée Chalamet, Zendaya' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cast?: string;

  @ApiPropertyOptional({ example: 'Denis Villeneuve' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  director?: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  language?: string;

  @ApiPropertyOptional({ example: 166 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  runningTimeMinutes?: number;

  @ApiPropertyOptional({ example: 8.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ratingValue?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  ratingMax?: number;
}
