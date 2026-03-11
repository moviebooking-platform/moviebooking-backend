import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SkipTransform } from '@moviebooking/common';
import { InternalService } from './internal.service';

/**
 * Internal API — for service-to-service communication only.
 * No JWT required. In production, restrict via network policies.
 */
@ApiTags('internal')
@SkipTransform()
@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get('theatre-admins/by-user/:userId')
  @ApiOperation({
    summary: 'Get theatre assignment by user ID',
    description: 'Internal endpoint for Identity Service to fetch theatreId during login',
  })
  @ApiParam({ name: 'userId', type: Number })
  @ApiResponse({ status: 200, description: 'Returns theatreId or null' })
  async getTheatreAdminByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.internalService.getTheatreIdByUserId(userId);
  }
}
