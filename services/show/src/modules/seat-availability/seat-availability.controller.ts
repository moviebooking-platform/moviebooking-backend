import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { OptionalJwtAuthGuard, DecryptId } from '@moviebooking/common';
import { SeatAvailabilityService } from './seat-availability.service';

@ApiTags('Seat Availability')
@Controller('shows/:showId/seats')
export class SeatAvailabilityController {
  constructor(
    private readonly seatAvailabilityService: SeatAvailabilityService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get seat availability for a show (Guest/Admin)' })
  @ApiParam({ name: 'showId', type: String, description: 'Encrypted Show ID' })
  async getAvailability(@DecryptId('showId') showId: number) {
    return this.seatAvailabilityService.getAvailability(showId);
  }
}
