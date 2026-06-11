import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
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
  async getTheatreAdminByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.internalService.getTheatreIdByUserId(userId);
  }

  @Get('theatres/:id')
  @ApiOperation({
    summary: 'Get theatre by ID',
    description: 'Internal endpoint for other services to fetch theatre details',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Returns theatre details or null' })
  async getTheatreById(@Param('id', ParseIntPipe) id: number) {
    return this.internalService.getTheatreById(id);
  }

  @Post('theatres/batch')
  @ApiOperation({
    summary: 'Get multiple theatres by IDs',
    description: 'Internal batch endpoint for efficient list enrichment',
  })
  async getTheatresByIds(@Body() body: { theatreIds: number[] }) {
    return this.internalService.getTheatresByIds(body.theatreIds ?? []);
  }

  @Get('screens/:id')
  @ApiOperation({
    summary: 'Get screen by ID',
    description: 'Internal endpoint for Show Service to fetch screen details and verify ownership',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Returns screen details or null' })
  async getScreenById(@Param('id', ParseIntPipe) id: number) {
    return this.internalService.getScreenById(id);
  }

  @Post('screens/batch')
  @ApiOperation({
    summary: 'Get multiple screens by IDs',
    description: 'Internal batch endpoint for efficient list enrichment',
  })
  async getScreensByIds(@Body() body: { screenIds: number[] }) {
    return this.internalService.getScreensByIds(body.screenIds ?? []);
  }

  @Get('screens/:id/seats')
  @ApiOperation({
    summary: 'Get seats by screen ID',
    description: 'Internal endpoint for Show/Booking Service to fetch all active seats for a screen',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Returns array of seats' })
  async getSeatsByScreenId(@Param('id', ParseIntPipe) id: number) {
    return this.internalService.getSeatsByScreenId(id);
  }
}
