import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { SkipTransform } from '@moviebooking/common';
import { InternalService } from './internal.service';
import { ParseIdListPipe } from './pipes/parse-id-list.pipe';

/**
 * Internal APIs for service-to-service communication. No auth required.
 *
 * Route order matters: Express matches routes in the order they are declared, so
 * static paths such as `shows/by-screens` must come before `shows/:id`, otherwise
 * "by-screens" is captured as an :id and rejected by ParseIntPipe.
 */
@ApiExcludeController()
@ApiTags('internal')
@SkipTransform()
@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get('shows/by-screens')
  @ApiOperation({ summary: 'Get show IDs for the given screen IDs (internal)' })
  async getShowsByScreens(
    @Query('screenIds', new ParseIdListPipe('screenIds')) screenIds: number[],
  ) {
    return this.internalService.getShowIdsByScreens(screenIds);
  }

  @Get('shows/:id')
  @ApiOperation({ summary: 'Get show by ID (internal)' })
  async getShowById(@Param('id', ParseIntPipe) id: number) {
    return this.internalService.getShowById(id);
  }

  @Get('shows/:showId/prices')
  @ApiOperation({ summary: 'Get show prices (internal)' })
  async getPricesByShowId(@Param('showId', ParseIntPipe) showId: number) {
    return this.internalService.getPricesByShowId(showId);
  }
}
