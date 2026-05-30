import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { OptionalJwtAuthGuard, decryptId } from '@moviebooking/common';
import { SeatAvailabilityService } from './seat-availability.service';

@ApiTags('Seat Availability')
@Controller('shows/:showId/seats')
export class SeatAvailabilityController {
  constructor(private readonly seatAvailabilityService: SeatAvailabilityService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get seat availability for a show (Guest/Admin)' })
  @ApiParam({ name: 'showId', type: String, description: 'Encrypted Show ID' })
  async getAvailability(@Param('showId') showId: string) {
    return this.seatAvailabilityService.getAvailability(decryptId(showId));
  }
}
