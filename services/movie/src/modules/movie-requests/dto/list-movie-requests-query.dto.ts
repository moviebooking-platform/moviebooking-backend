import { IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MovieRequestStatus } from '@moviebooking/database';

export class ListMovieRequestsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ enum: MovieRequestStatus })
  @IsOptional()
  @IsEnum(MovieRequestStatus)
  status?: MovieRequestStatus;

  @ApiPropertyOptional({ description: 'Filter by theatre (Admin only)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  theatreId?: number;
}
