import { IsEnum, IsInt, IsPositive, IsString, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SeatType } from '@moviebooking/database';

/** DTO for a single price item per seat type. */
export class PriceItemDto {
  @ApiProperty({ example: 'STANDARD', enum: SeatType, description: 'Seat type' })
  @IsEnum(SeatType)
  seatType: SeatType;

  @ApiProperty({ example: 1500, description: 'Price in cents (e.g., 1500 = £15.00)' })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'GBP', description: 'Currency code (3 letters)', required: false, default: 'GBP' })
  @IsString()
  @Length(3, 3)
  @IsOptional()
  currency?: string;
}
