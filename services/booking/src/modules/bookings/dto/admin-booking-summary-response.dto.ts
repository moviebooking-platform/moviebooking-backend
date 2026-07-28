import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@moviebooking/database';

export class AdminBookingSummaryResponseDto {
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

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  holdExpiresAt: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;
}
