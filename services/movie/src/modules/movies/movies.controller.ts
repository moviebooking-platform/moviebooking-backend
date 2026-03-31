import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { ListMoviesQueryDto } from './dto/list-movies-query.dto';
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

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create movie', description: 'Create a new movie (Super Admin / Staff)' })
  @ApiResponse({ status: 201, description: 'Movie created' })
  @ApiResponse({ status: 409, description: 'Movie with same title and release date already exists' })
  async create(@Body() dto: CreateMovieDto) {
    return this.moviesService.create(dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List movies', description: 'Guest: ACTIVE only. Authenticated: all statuses.' })
  @ApiResponse({ status: 200, description: 'Movies retrieved' })
  async findAll(
    @Query() query: ListMoviesQueryDto,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.moviesService.findAll(query, user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get movie detail', description: 'Movie details with images. Guest: ACTIVE only.' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Movie ID' })
  @ApiResponse({ status: 200, description: 'Movie retrieved' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async findOne(
    @DecryptId('id') id: number,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.moviesService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update movie', description: 'Partial update (Super Admin / Staff)' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Movie ID' })
  @ApiResponse({ status: 200, description: 'Movie updated' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async update(
    @DecryptId('id') id: number,
    @Body() dto: UpdateMovieDto,
  ) {
    return this.moviesService.update(id, dto);
  }
}
