import { IsString, IsInt, IsEnum, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SeatType } from '@moviebooking/database';

export class BulkCreateSeatsDto {
  @ApiProperty({ example: 'A', description: 'Row label for all seats', maxLength: 10 })
  @IsString()
  @MaxLength(10)
  rowLabel: string;

  @ApiProperty({ example: 1, description: 'Starting seat number', minimum: 1 })
  @IsInt()
  @Min(1)
  startNumber: number;

  @ApiProperty({ example: 20, description: 'Ending seat number (inclusive)', minimum: 1 })
  @IsInt()
  @Min(1)
  endNumber: number;

  @ApiProperty({ enum: SeatType, example: SeatType.STANDARD })
  @IsEnum(SeatType)
  seatType: SeatType;
}
