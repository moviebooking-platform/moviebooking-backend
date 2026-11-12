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
import { ShowsService } from './shows.service';
import { CreateShowDto } from './dto/create-show.dto';
import { UpdateShowDto } from './dto/update-show.dto';
import { ListShowsQueryDto } from './dto/list-shows-query.dto';
import { ShowOwnershipGuard } from './guards/show-ownership.guard';

@ApiTags('Shows')
@Controller('shows')
export class ShowsController {
  constructor(private readonly showsService: ShowsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List shows with filters (Guest/Admin)' })
  async findAll(
    @Query() query: ListShowsQueryDto,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.showsService.findAll(query, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, ShowOwnershipGuard)
  @Roles('THEATRE_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new show (Theatre Admin)' })
  async create(@Body() dto: CreateShowDto, @CurrentUser() user: ICurrentUser) {
    return this.showsService.create(dto, user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get show details (Guest/Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted show ID' })
  async findOne(
    @DecryptId('id') id: number,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.showsService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, ShowOwnershipGuard)
  @Roles('THEATRE_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update show (Theatre Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted show ID' })
  async update(
    @DecryptId('id') id: number,
    @Body() dto: UpdateShowDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.showsService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, ShowOwnershipGuard)
  @Roles('THEATRE_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete show (Theatre Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted show ID' })
  async delete(@DecryptId('id') id: number, @CurrentUser() user: ICurrentUser) {
    return this.showsService.delete(id, user);
  }
}
