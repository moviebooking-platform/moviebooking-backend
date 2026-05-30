import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Show, ShowPrice } from '../../entities';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';

@Module({
  imports: [TypeOrmModule.forFeature([Show, ShowPrice])],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
