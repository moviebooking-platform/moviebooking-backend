import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theatre, Screen } from '../../entities';
import { AuthModule } from '../auth/auth.module';
import { TheatresController } from './theatres.controller';
import { TheatresService } from './theatres.service';

@Module({
  imports: [TypeOrmModule.forFeature([Theatre, Screen]), AuthModule],
  controllers: [TheatresController],
  providers: [TheatresService],
  exports: [TheatresService],
})
export class TheatresModule {}
