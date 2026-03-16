import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
