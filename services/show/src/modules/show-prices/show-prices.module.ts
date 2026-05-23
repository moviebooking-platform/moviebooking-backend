import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Show, ShowPrice } from '../../entities';
import { ShowPricesController } from './show-prices.controller';
import { ShowPricesService } from './show-prices.service';
import { TheatreClientModule } from '../../clients/theatre-client.module';
import { ShowsModule } from '../shows/shows.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Show, ShowPrice]),
    TheatreClientModule,
    ShowsModule,
  ],
  controllers: [ShowPricesController],
  providers: [ShowPricesService],
  exports: [ShowPricesService],
})
export class ShowPricesModule {}
