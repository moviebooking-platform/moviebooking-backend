import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Show, ShowPrice } from '../../entities';
import { throwError } from '@moviebooking/common';

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
    @InjectRepository(ShowPrice)
    private readonly showPriceRepository: Repository<ShowPrice>,
  ) {}

  /** Returns raw show data for other services. */
  async getShowById(id: number) {
    const show = await this.showRepository.findOne({ where: { id } });

    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }

    return show;
  }

  /** Returns raw pricing array for other services. */
  async getPricesByShowId(showId: number) {
    const show = await this.showRepository.findOne({ where: { id: showId } });

    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }

    return this.showPriceRepository.find({ where: { showId } });
  }
}
