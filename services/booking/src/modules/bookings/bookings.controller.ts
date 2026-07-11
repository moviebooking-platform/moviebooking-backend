import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { encryptId, formatUtcDateTime } from '@moviebooking/common';
import { HoldService } from './hold.service';
import { HoldSeatsDto } from './dto/hold-seats.dto';
import { BookingResponse, BookingSeatResponse } from './dto/booking-response.dto';

/** Public booking endpoints for guests (no authentication required). */
@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  private readonly logger = new Logger(BookingsController.name);

  constructor(private readonly holdService: HoldService) {}

  @Post('hold')
  @ApiOperation({ summary: 'Create a seat hold for a show' })
  @ApiResponse({
    status: 201,
    description: 'Seat hold created successfully',
    type: BookingResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (invalid input)',
  })
  @ApiResponse({
    status: 422,
    description: 'Business rule violation (seats unavailable, show inactive, etc.)',
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable (Show/Theatre service down)',
  })
  async holdSeats(@Body() dto: HoldSeatsDto): Promise<BookingResponse> {
    this.logger.log(`Hold request for show ${dto.showId}, ${dto.seatIds.length} seats`);

    const booking = await this.holdService.holdSeats(dto);

    return this.mapBookingResponse(booking);
  }

  /** Maps booking entity to API response with encrypted IDs and calculated remaining time. */
  private mapBookingResponse(booking: any): BookingResponse {
    const now = new Date();
    const expiresAt = booking.holdExpiresAt ? new Date(booking.holdExpiresAt) : null;
    
    const remainingSeconds =
      expiresAt && expiresAt > now
        ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
        : 0;

    const seats: BookingSeatResponse[] = booking.seats.map((seat: any) => ({
      seatId: encryptId(seat.seatId),
      seatCode: seat.seatCode || `${seat.seatType}-${seat.seatId}`, // Fallback if seatCode not available
      seatType: seat.seatType,
      priceCents: seat.priceCents,
    }));

    return {
      bookingRef: booking.bookingRef,
      showId: encryptId(booking.showId),
      status: booking.status,
      seats,
      totalAmountCents: booking.totalAmountCents,
      currency: booking.currency,
      holdExpiresAt: expiresAt ? formatUtcDateTime(expiresAt) : null,
      remainingSeconds,
    };
  }
}
