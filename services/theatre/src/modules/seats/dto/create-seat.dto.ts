import { IsString, IsInt, IsEnum, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SeatType } from '@moviebooking/database';

export class CreateSeatDto {
  @ApiProperty({ example: 'A', maxLength: 10 })
  @IsString()
  @MaxLength(10)
  rowLabel: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  seatNumber: number;

  @ApiProperty({ enum: SeatType, example: SeatType.STANDARD })
  @IsEnum(SeatType)
  seatType: SeatType;
}
