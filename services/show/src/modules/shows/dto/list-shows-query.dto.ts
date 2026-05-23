import { IsInt, IsPositive, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '@moviebooking/common';
import { ShowStatus } from '@moviebooking/database';

/** DTO for listing shows with filters. */
export class ListShowsQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: 1, description: 'Filter by movie ID', required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  movieId?: number;

  @ApiProperty({ example: 1, description: 'Filter by theatre ID', required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  theatreId?: number;

  @ApiProperty({ example: 1, description: 'Filter by screen ID', required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  screenId?: number;

  @ApiProperty({ example: '2024-12-25', description: 'Filter by specific date (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: '2024-12-01', description: 'Filter by start date (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiProperty({ example: '2024-12-31', description: 'Filter by end date (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiProperty({ example: 'ACTIVE', enum: ShowStatus, description: 'Filter by show status', required: false })
  @IsEnum(ShowStatus)
  @IsOptional()
  status?: ShowStatus;
}
