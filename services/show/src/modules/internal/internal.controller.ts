import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
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
}
