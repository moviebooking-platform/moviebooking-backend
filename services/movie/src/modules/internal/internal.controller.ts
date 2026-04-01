import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { SkipTransform } from '@moviebooking/common';
import { InternalService } from './internal.service';

// Internal endpoints for service-to-service communication only
@ApiExcludeController()
@ApiTags('internal')
@SkipTransform()
@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get('movies/:id')
  @ApiOperation({ summary: 'Get movie by ID (internal)' })
  async getMovieById(@Param('id', ParseIntPipe) id: number) {
    return this.internalService.getMovieById(id);
  }
}
