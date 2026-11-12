import { IsArray, ValidateNested, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SeatType } from '@moviebooking/database';

/** Single seat update item for bulk operations. */
class SeatUpdateItem {
  @ApiProperty({ example: 'a1b2c3d4', description: 'Encrypted Seat ID' })
  @IsString()
  id: string;

  @ApiProperty({ enum: SeatType, example: SeatType.VIP })
  @IsEnum(SeatType)
  seatType: SeatType;
}

/** Bulk update multiple seat types in one transaction. */
export class BulkUpdateSeatsDto {
  @ApiProperty({
    type: [SeatUpdateItem],
    example: [
      { id: 'a1b2c3d4', seatType: SeatType.VIP },
      { id: 'e5f6g7h8', seatType: SeatType.STANDARD },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatUpdateItem)
  seats: SeatUpdateItem[];
}
