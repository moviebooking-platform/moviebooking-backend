import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  ICurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  ROLES,
} from '@moviebooking/common';
import { AdminBookingQueryService } from './admin-booking-query.service';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';

@ApiTags('Admin Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.THEATRE_ADMIN, ROLES.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminBookingsController {
  constructor(
    private readonly adminBookingQueryService: AdminBookingQueryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List bookings for administration' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listBookings(
    @Query() query: ListBookingsQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ) {
    return this.adminBookingQueryService.listBookings(query, currentUser);
  }
}
