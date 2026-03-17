import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ScreensService } from './screens.service';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { ListScreensQueryDto } from './dto/list-screens-query.dto';
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

@ApiTags('screens')
@Controller('theatres/:theatreId/screens')
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TheatreOwnershipGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.THEATRE_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create screen', description: 'Create a new screen in a theatre (Theatre Admin: own theatre, Super Admin: any)' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiResponse({ status: 201, description: 'Screen created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Theatre not found' })
  async create(
    @DecryptId('theatreId') theatreId: number,
    @Body() dto: CreateScreenDto,
  ) {
    return this.screensService.create(theatreId, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List screens', description: 'List screens for a theatre. Guest: ACTIVE only. Authenticated: all statuses.' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiResponse({ status: 200, description: 'Screens retrieved' })
  @ApiResponse({ status: 404, description: 'Theatre not found' })
  async findAll(
    @DecryptId('theatreId') theatreId: number,
    @Query() query: ListScreensQueryDto,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.screensService.findAll(theatreId, query, user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get screen detail', description: 'Screen details with seat count. Guest: ACTIVE only.' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Screen ID' })
  @ApiResponse({ status: 200, description: 'Screen retrieved' })
  @ApiResponse({ status: 404, description: 'Screen not found' })
  async findOne(
    @DecryptId('theatreId') theatreId: number,
    @DecryptId('id') id: number,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.screensService.findOne(theatreId, id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TheatreOwnershipGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.THEATRE_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update screen', description: 'Partial update (Theatre Admin: own theatre, Super Admin: any)' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Screen ID' })
  @ApiResponse({ status: 200, description: 'Screen updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Screen not found' })
  async update(
    @DecryptId('theatreId') theatreId: number,
    @DecryptId('id') id: number,
    @Body() dto: UpdateScreenDto,
  ) {
    return this.screensService.update(theatreId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TheatreOwnershipGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.THEATRE_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete screen', description: 'Soft-delete by setting INACTIVE (Theatre Admin: own theatre, Super Admin: any)' })
  @ApiParam({ name: 'theatreId', type: String, description: 'Encrypted Theatre ID' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Screen ID' })
  @ApiResponse({ status: 200, description: 'Screen deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Screen not found' })
  async remove(
    @DecryptId('theatreId') theatreId: number,
    @DecryptId('id') id: number,
  ) {
    return this.screensService.remove(theatreId, id);
  }
}
