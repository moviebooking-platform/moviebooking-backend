import { IsString, IsInt, IsEnum, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SeatType, SeatStatus } from '@moviebooking/database';

export class UpdateSeatDto {
  @ApiPropertyOptional({ example: 'A', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  rowLabel?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  seatNumber?: number;

  @ApiPropertyOptional({ enum: SeatType })
  @IsOptional()
  @IsEnum(SeatType)
  seatType?: SeatType;

  @ApiPropertyOptional({ enum: SeatStatus })
  @IsOptional()
  @IsEnum(SeatStatus)
  status?: SeatStatus;
}
