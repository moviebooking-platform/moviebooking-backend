import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@moviebooking/database';

export class BookingSeatResponse {
  @ApiProperty({ description: 'Encrypted seat ID' })
  seatId: string;

  @ApiProperty({ description: 'Seat code (e.g., A5)' })
  seatCode: string;

  @ApiProperty({ description: 'Seat type (e.g., STANDARD, VIP)' })
  seatType: string;

  @ApiProperty({ description: 'Price in cents' })
  priceCents: number;
}

export class BookingResponse {
  @ApiProperty({ description: 'Unique booking reference' })
  bookingRef: string;

  @ApiProperty({ description: 'Encrypted show ID' })
  showId: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({ type: [BookingSeatResponse] })
  seats: BookingSeatResponse[];

  @ApiProperty({ description: 'Total amount in cents' })
  totalAmountCents: number;

  @ApiProperty({ description: 'Currency code', example: 'GBP' })
  currency: string;

  @ApiProperty({
    description: 'Hold expiration timestamp (ISO 8601)',
    nullable: true,
  })
  holdExpiresAt: string | null;

  @ApiProperty({ description: 'Seconds remaining until hold expires' })
  remainingSeconds: number;
}
