import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@moviebooking/database';
import { ReservationTimingResponseDto } from './reservation-timing-response.dto';

export class AdminBookingSummaryResponseDto extends ReservationTimingResponseDto {
  @ApiProperty({ description: 'Encrypted booking ID' })
  id: string;

  @ApiProperty()
  bookingRef: string;

  @ApiProperty({ description: 'Encrypted show ID' })
  showId: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty()
  totalAmountCents: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;
}
