import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@moviebooking/database';
import { PaginationQueryDto } from '@moviebooking/common';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class ListBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '2026-06-15',
    description: 'Filter by booking creation date (YYYY-MM-DD UTC)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  bookingDate?: string;

  @ApiPropertyOptional({ description: 'Filter by encrypted show ID' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  showId?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
