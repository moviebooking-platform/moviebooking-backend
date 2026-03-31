import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MovieRequestsService } from './movie-requests.service';
import { CreateMovieRequestDto } from './dto/create-movie-request.dto';
import { ReviewMovieRequestDto } from './dto/review-movie-request.dto';
import { ListMovieRequestsQueryDto } from './dto/list-movie-requests-query.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  ROLES,
  Roles,
  DecryptId,
  CurrentUser,
  ICurrentUser,
} from '@moviebooking/common';

@ApiTags('movie-requests')
@Controller('movie-requests')
export class MovieRequestsController {
  constructor(private readonly movieRequestsService: MovieRequestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.THEATRE_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create movie request', description: 'Theatre Admin requests a new movie to be added' })
  @ApiResponse({ status: 201, description: 'Request created' })
  @ApiResponse({ status: 409, description: 'Pending request with same title already exists' })
  async create(
    @Body() dto: CreateMovieRequestDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.movieRequestsService.create(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.STAFF, ROLES.THEATRE_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List movie requests', description: 'Theatre Admin: own only. Super Admin/Staff: all.' })
  @ApiResponse({ status: 200, description: 'Requests retrieved' })
  async findAll(
    @Query() query: ListMovieRequestsQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.movieRequestsService.findAll(query, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.STAFF, ROLES.THEATRE_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get movie request detail' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Request ID' })
  @ApiResponse({ status: 200, description: 'Request retrieved' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async findOne(
    @DecryptId('id') id: number,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.movieRequestsService.findOne(id, user);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve movie request', description: 'Approve and auto-create movie (Super Admin / Staff)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Request ID' })
  @ApiResponse({ status: 200, description: 'Request approved, movie created' })
  @ApiResponse({ status: 422, description: 'Request is not in PENDING status' })
  async approve(
    @DecryptId('id') id: number,
    @Body() dto: ReviewMovieRequestDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.movieRequestsService.approve(id, dto, user);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject movie request', description: 'Reject with reason (Super Admin / Staff)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Request ID' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  @ApiResponse({ status: 400, description: 'reviewReason is required' })
  @ApiResponse({ status: 422, description: 'Request is not in PENDING status' })
  async reject(
    @DecryptId('id') id: number,
    @Body() dto: ReviewMovieRequestDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.movieRequestsService.reject(id, dto, user);
  }
}
