import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DecryptId } from '@moviebooking/common';
import { AvailabilityService } from './availability.service';

@ApiTags('Seat Availability')
@Controller('shows')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':showId/seats/availability')
  @ApiOperation({ summary: 'Get seat availability for a show (public)' })
  @ApiParam({ name: 'showId', type: String, description: 'Encrypted Show ID' })
  @ApiResponse({ status: 200, description: 'Seat map with summary' })
  @ApiResponse({ status: 404, description: 'Show not found or inactive' })
  @ApiResponse({ status: 400, description: 'Invalid show ID' })
  async getAvailability(@DecryptId('showId') showId: number) {
    return this.availabilityService.getAvailability(showId);
  }
}
