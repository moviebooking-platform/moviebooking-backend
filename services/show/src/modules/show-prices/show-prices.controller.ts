import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard, Roles, CurrentUser, ICurrentUser, decryptId } from '@moviebooking/common';
import { ShowPricesService } from './show-prices.service';
import { SetPricesDto } from './dto/set-prices.dto';
import { ShowOwnershipGuard } from '../shows/guards/show-ownership.guard';

@ApiTags('Show Prices')
@Controller('shows/:showId/prices')
export class ShowPricesController {
  constructor(private readonly showPricesService: ShowPricesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get pricing for a show (Guest/Admin)' })
  async getPrices(@Param('showId') showId: string) {
    return this.showPricesService.getPrices(decryptId(showId));
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard, ShowOwnershipGuard)
  @Roles('THEATRE_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set/update pricing for a show (Theatre Admin)' })
  async setPrices(
    @Param('showId') showId: string,
    @Body() dto: SetPricesDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.showPricesService.setPrices(decryptId(showId), dto, user);
  }
}
