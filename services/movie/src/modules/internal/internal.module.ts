import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie, MovieImage } from '../../entities';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';

@Module({
  imports: [TypeOrmModule.forFeature([Movie, MovieImage])],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
