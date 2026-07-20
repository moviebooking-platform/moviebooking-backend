import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
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
import { AdminBookingDetailResponseDto } from './dto/admin-booking-detail-response.dto';
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

  @Get(':id/admin')
  @ApiOperation({ summary: 'Get full booking detail for administration' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Encrypted booking ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking detail retrieved',
    type: AdminBookingDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid booking ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Booking or dependency not found' })
  @ApiResponse({ status: 503, description: 'Dependent service unavailable' })
  async getBookingDetail(
    @Param('id') encryptedBookingId: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AdminBookingDetailResponseDto> {
    return this.adminBookingQueryService.getBookingDetail(
      encryptedBookingId,
      currentUser,
    );
  }
}
