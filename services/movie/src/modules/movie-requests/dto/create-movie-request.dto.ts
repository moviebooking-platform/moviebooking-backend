import { IsString, IsNotEmpty, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMovieRequestDto {
  @ApiProperty({ example: 'Dune: Part Two' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: '2024-03-01', description: 'Known release date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional({ example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  expectedReleaseDate?: string;

  @ApiPropertyOptional({ example: 'Highly anticipated sequel' })
  @IsOptional()
  @IsString()
  notes?: string;
}
