import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@moviebooking/database';
import { ReservationTimingResponseDto } from './reservation-timing-response.dto';

export class AdminBookingSeatResponseDto {
  @ApiProperty({ description: 'Encrypted seat ID' })
  seatId: string;

  @ApiProperty({ description: 'Seat code', example: 'A5' })
  seatCode: string;

  @ApiProperty({ description: 'Seat type', example: 'STANDARD' })
  seatType: string;

  @ApiProperty({ description: 'Price in cents' })
  priceCents: number;
}

export class AdminBookingDetailResponseDto extends ReservationTimingResponseDto {
  @ApiProperty({ description: 'Encrypted booking ID' })
  id: string;

  @ApiProperty({ description: 'Unique booking reference' })
  bookingRef: string;

  @ApiProperty({ description: 'Encrypted show ID' })
  showId: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({ type: [AdminBookingSeatResponseDto] })
  seats: AdminBookingSeatResponseDto[];

  @ApiProperty({ description: 'Total amount in cents' })
  totalAmountCents: number;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'GBP' })
  currency: string;

  @ApiProperty({ nullable: true, type: String })
  needsReviewReason: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
