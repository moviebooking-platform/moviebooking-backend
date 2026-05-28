import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PriceItemDto } from './price-item.dto';

/** DTO for setting/updating prices for a show. */
export class SetPricesDto {
  @ApiProperty({
    type: [PriceItemDto],
    description: 'Array of prices per seat type',
    example: [
      { seatType: 'STANDARD', amount: 1500, currency: 'GBP' },
      { seatType: 'VIP', amount: 2500, currency: 'GBP' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceItemDto)
  prices: PriceItemDto[];
}
