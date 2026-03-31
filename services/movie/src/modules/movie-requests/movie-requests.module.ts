import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovieRequestsController } from './movie-requests.controller';
import { MovieRequestsService } from './movie-requests.service';
import { Movie, MovieRequest } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Movie, MovieRequest])],
  controllers: [MovieRequestsController],
  providers: [MovieRequestsService],
  exports: [MovieRequestsService],
})
export class MovieRequestsModule {}
