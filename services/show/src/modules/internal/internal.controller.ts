import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { SkipTransform } from '@moviebooking/common';
import { InternalService } from './internal.service';

/** Internal APIs for service-to-service communication. No auth required. */
@ApiExcludeController()
@ApiTags('internal')
@SkipTransform()
@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

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

  @Get('shows/by-screens')
  @ApiOperation({
    summary: 'Get show IDs by screen IDs (Task 14.2)',
    description: 'Returns show IDs for the given screen IDs',
  })
  async getShowsByScreens(@Query('screenIds') screenIdsParam: string) {
    const screenIds = screenIdsParam ? screenIdsParam.split(',').map(Number) : [];
    return this.internalService.getShowIdsByScreens(screenIds);
  }
}
