import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  ICurrentUser,
  DecryptId,
} from '@moviebooking/common';
import { ShowPricesService } from './show-prices.service';
import { SetPricesDto } from './dto/set-prices.dto';
import { ShowOwnershipGuard } from '../shows/guards/show-ownership.guard';

@ApiTags('Show Prices')
@ApiParam({ name: 'showId', type: String, description: 'Encrypted show ID' })
@Controller('shows/:showId/prices')
export class ShowPricesController {
  constructor(private readonly showPricesService: ShowPricesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get pricing for a show (Guest/Admin)' })
  async getPrices(@DecryptId('showId') showId: number) {
    return this.showPricesService.getPrices(showId);
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard, ShowOwnershipGuard)
  @Roles('THEATRE_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set/update pricing for a show (Theatre Admin)' })
  async setPrices(
    @DecryptId('showId') showId: number,
    @Body() dto: SetPricesDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.showPricesService.setPrices(showId, dto, user);
  }
}
