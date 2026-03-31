import { Controller, Post, Patch, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MovieImagesService } from './movie-images.service';
import { CreateMovieImageDto } from './dto/create-movie-image.dto';
import { UpdateMovieImageDto } from './dto/update-movie-image.dto';
import { JwtAuthGuard, RolesGuard, ROLES, Roles, DecryptId } from '@moviebooking/common';

@ApiTags('movie-images')
@Controller('movies/:movieId/images')
export class MovieImagesController {
  constructor(private readonly movieImagesService: MovieImagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add movie image', description: 'Add image URL to a movie (Super Admin / Staff)' })
  @ApiParam({ name: 'movieId', type: String, description: 'Encrypted Movie ID' })
  @ApiResponse({ status: 201, description: 'Image added' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async create(
    @DecryptId('movieId') movieId: number,
    @Body() dto: CreateMovieImageDto,
  ) {
    return this.movieImagesService.create(movieId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update image', description: 'Set image as primary (Super Admin / Staff)' })
  @ApiParam({ name: 'movieId', type: String, description: 'Encrypted Movie ID' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Image ID' })
  @ApiResponse({ status: 200, description: 'Image updated' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async update(
    @DecryptId('id') id: number,
    @Body() dto: UpdateMovieImageDto,
  ) {
    return this.movieImagesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete image', description: 'Remove image from movie (Super Admin / Staff)' })
  @ApiParam({ name: 'movieId', type: String, description: 'Encrypted Movie ID' })
  @ApiParam({ name: 'id', type: String, description: 'Encrypted Image ID' })
  @ApiResponse({ status: 200, description: 'Image deleted' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async remove(@DecryptId('id') id: number) {
    return this.movieImagesService.remove(id);
  }
}
