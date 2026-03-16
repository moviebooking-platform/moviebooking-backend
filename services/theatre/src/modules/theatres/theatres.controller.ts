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
import { TheatresService } from './theatres.service';
import { CreateTheatreDto } from './dto/create-theatre.dto';
import { UpdateTheatreDto } from './dto/update-theatre.dto';
import { ListTheatresQueryDto } from './dto/list-theatres-query.dto';
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

@ApiTags('theatres')
@Controller('theatres')
export class TheatresController {
  constructor(private readonly theatresService: TheatresService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create theatre', description: 'Create a new theatre (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Theatre created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateTheatreDto) {
    return this.theatresService.create(dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List theatres', description: 'Paginated list. Unauthenticated: ACTIVE only. Super Admin: all statuses.' })
  @ApiResponse({ status: 200, description: 'Theatres retrieved' })
  async findAll(
    @Query() query: ListTheatresQueryDto,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.theatresService.findAll(query, user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get theatre detail', description: 'Theatre details with screen count' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Theatre ID' })
  @ApiResponse({ status: 200, description: 'Theatre retrieved' })
  @ApiResponse({ status: 404, description: 'Theatre not found' })
  async findOne(@DecryptId('id') id: number) {
    return this.theatresService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update theatre', description: 'Partial update (Super Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Theatre ID' })
  @ApiResponse({ status: 200, description: 'Theatre updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Theatre not found' })
  async update(
    @DecryptId('id') id: number,
    @Body() dto: UpdateTheatreDto,
  ) {
    return this.theatresService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete theatre', description: 'Soft-delete by setting INACTIVE (Super Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Theatre ID' })
  @ApiResponse({ status: 200, description: 'Theatre deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Theatre not found' })
  async remove(@DecryptId('id') id: number) {
    return this.theatresService.remove(id);
  }
}
