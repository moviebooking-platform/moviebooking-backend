import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from '../../entities';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';

@Module({
  imports: [TypeOrmModule.forFeature([Movie])],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
