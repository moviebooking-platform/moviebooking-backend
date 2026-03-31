import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovieImagesController } from './movie-images.controller';
import { MovieImagesService } from './movie-images.service';
import { Movie, MovieImage } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Movie, MovieImage])],
  controllers: [MovieImagesController],
  providers: [MovieImagesService],
  exports: [MovieImagesService],
})
export class MovieImagesModule {}
