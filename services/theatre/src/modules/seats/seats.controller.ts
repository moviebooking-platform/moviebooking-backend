import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SeatsService } from './seats.service';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { ListSeatsQueryDto } from './dto/list-seats-query.dto';
import { BulkCreateSeatsDto } from './dto/bulk-create-seats.dto';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RolesGuard,
  ROLES,
  Roles,
  DecryptId,
  CurrentUser,
  ICurrentUser,
} from '@moviebooking/common';
import { TheatreOwnershipGuard } from '../../shared/guards/theatre-ownership.guard';

@ApiTags('seats')
@Controller('theatres/:theatreId/screens/:screenId/seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TheatreOwnershipGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.THEATRE_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create seat', description: 'Create a single seat' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiParam({ name: 'screenId', type: String, description: 'Encrypted Screen ID' })
  @ApiResponse({ status: 201, description: 'Seat created' })
  @ApiResponse({ status: 409, description: 'Seat already exists' })
  async create(
    @DecryptId('theatreId') theatreId: number,
    @DecryptId('screenId') screenId: number,
    @Body() dto: CreateSeatDto,
  ) {
    return this.seatsService.create(theatreId, screenId, dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard, TheatreOwnershipGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.THEATRE_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk create seats', description: 'Create multiple seats in a row' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiParam({ name: 'screenId', type: String, description: 'Encrypted Screen ID' })
  @ApiResponse({ status: 201, description: 'Seats created' })
  @ApiResponse({ status: 409, description: 'One or more seats already exist' })
  async bulkCreate(
    @DecryptId('theatreId') theatreId: number,
    @DecryptId('screenId') screenId: number,
    @Body() dto: BulkCreateSeatsDto,
  ) {
    return this.seatsService.bulkCreate(theatreId, screenId, dto);
  }


  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List seats', description: 'List seats for a screen. Guest: ACTIVE only.' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiParam({ name: 'screenId', type: String, description: 'Encrypted Screen ID' })
  @ApiResponse({ status: 200, description: 'Seats retrieved' })
  async findAll(
    @DecryptId('theatreId') theatreId: number,
    @DecryptId('screenId') screenId: number,
    @Query() query: ListSeatsQueryDto,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.seatsService.findAll(theatreId, screenId, query, user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get seat detail', description: 'Get seat details. Guest: ACTIVE only.' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiParam({ name: 'screenId', type: String, description: 'Encrypted Screen ID' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Seat ID' })
  @ApiResponse({ status: 200, description: 'Seat retrieved' })
  @ApiResponse({ status: 404, description: 'Seat not found' })
  async findOne(
    @DecryptId('theatreId') theatreId: number,
    @DecryptId('screenId') screenId: number,
    @DecryptId('id') id: number,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.seatsService.findOne(theatreId, screenId, id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TheatreOwnershipGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.THEATRE_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update seat', description: 'Update seat details' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiParam({ name: 'screenId', type: String, description: 'Encrypted Screen ID' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Seat ID' })
  @ApiResponse({ status: 200, description: 'Seat updated' })
  @ApiResponse({ status: 404, description: 'Seat not found' })
  @ApiResponse({ status: 409, description: 'Seat position conflict' })
  async update(
    @DecryptId('theatreId') theatreId: number,
    @DecryptId('screenId') screenId: number,
    @DecryptId('id') id: number,
    @Body() dto: UpdateSeatDto,
  ) {
    return this.seatsService.update(theatreId, screenId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TheatreOwnershipGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.THEATRE_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete seat', description: 'Soft-delete by setting INACTIVE' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiParam({ name: 'screenId', type: String, description: 'Encrypted Screen ID' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Seat ID' })
  @ApiResponse({ status: 200, description: 'Seat deleted' })
  @ApiResponse({ status: 404, description: 'Seat not found' })
  async remove(
    @DecryptId('theatreId') theatreId: number,
    @DecryptId('screenId') screenId: number,
    @DecryptId('id') id: number,
  ) {
    return this.seatsService.remove(theatreId, screenId, id);
  }
}
