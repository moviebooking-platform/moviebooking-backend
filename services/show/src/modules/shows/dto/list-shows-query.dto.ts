import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '@moviebooking/common';
import { ShowStatus } from '@moviebooking/database';

/** DTO for listing shows with filters. */
export class ListShowsQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: 'a3f8x2k', description: 'Filter by encrypted movie ID', required: false })
  @IsString()
  @IsOptional()
  movieId?: string;

  @ApiProperty({ example: 'c5h2z8n', description: 'Filter by encrypted theatre ID', required: false })
  @IsString()
  @IsOptional()
  theatreId?: string;

  @ApiProperty({ example: 'b7g9y4m', description: 'Filter by encrypted screen ID', required: false })
  @IsString()
  @IsOptional()
  screenId?: string;

  @ApiProperty({ example: '2026-06-15', description: 'Filter by specific date (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: '2026-06-01', description: 'Filter by start date (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiProperty({ example: '2026-06-30', description: 'Filter by end date (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiProperty({ example: 'ACTIVE', enum: ShowStatus, description: 'Filter by show status', required: false })
  @IsEnum(ShowStatus)
  @IsOptional()
  status?: ShowStatus;
}
