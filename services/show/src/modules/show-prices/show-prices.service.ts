import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Show, ShowPrice } from '../../entities';
import { throwError, ICurrentUser, encryptId, ROLES } from '@moviebooking/common';
import { SetPricesDto } from './dto/set-prices.dto';
import { TheatreClient } from '../../clients/theatre.client';

@Injectable()
export class ShowPricesService {
  private readonly logger = new Logger(ShowPricesService.name);

  constructor(
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
    @InjectRepository(ShowPrice)
    private readonly showPriceRepository: Repository<ShowPrice>,
    private readonly theatreClient: TheatreClient,
    private readonly dataSource: DataSource,
  ) {}

  async setPrices(showId: number, dto: SetPricesDto, user: ICurrentUser) {
    // Verify show exists
    const show = await this.showRepository.findOne({ where: { id: showId } });
    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }

    // Validate screen ownership for Theatre Admin
    if (user.role.code === ROLES.THEATRE_ADMIN) {
      await this.verifyScreenOwnership(show.screenId, user.theatreId);
    }

    // Validate pricing completeness - all seat types must have prices
    await this.validatePricingCompleteness(show.screenId, dto);

    // Upsert prices in a transaction: preserves IDs, audit trail, and FK integrity
    const finalPrices = await this.dataSource.transaction(async (manager) => {
      const existing = await manager.find(ShowPrice, { where: { showId } });
      const existingByType = new Map(existing.map((p) => [p.seatType, p]));
      const incomingTypes = new Set(dto.prices.map((p) => p.seatType));

      const toUpdate: ShowPrice[] = [];
      const toCreate: ShowPrice[] = [];

      for (const item of dto.prices) {
        const found = existingByType.get(item.seatType);
        if (found) {
          found.amount = item.amount;
          found.currency = item.currency || 'GBP';
          toUpdate.push(found);
        } else {
          toCreate.push(
            manager.create(ShowPrice, {
              showId,
              seatType: item.seatType,
              amount: item.amount,
              currency: item.currency || 'GBP',
            }),
          );
        }
      }

      // Seat types removed from the new pricing
      const toDelete = existing.filter((p) => !incomingTypes.has(p.seatType));

      if (toDelete.length) await manager.remove(toDelete);
      if (toUpdate.length) await manager.save(toUpdate);
      if (toCreate.length) await manager.save(toCreate);

      this.logger.log(
        `Prices set for show ${showId}: ${toCreate.length} created, ${toUpdate.length} updated, ${toDelete.length} removed`,
      );

      return manager.find(ShowPrice, { where: { showId } });
    });

    return this.mapPricesResponse(finalPrices);
  }

  async getPrices(showId: number) {
    // Verify show exists
    const show = await this.showRepository.findOne({ where: { id: showId } });
    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }

    const prices = await this.showPriceRepository.find({ where: { showId } });
    return this.mapPricesResponse(prices);
  }

  // Private Helper Methods

  /** Validates that all seat types in the screen have configured prices. */
  private async validatePricingCompleteness(screenId: number, dto: SetPricesDto): Promise<void> {
    let seats;
    try {
      seats = await this.theatreClient.getScreenSeats(screenId);
    } catch (error) {
      this.logger.error(`Theatre Service unavailable: ${error.message}`);
      throwError('SERVICE_UNAVAILABLE', 'Theatre Service is currently unavailable');
    }

    if (!seats || seats.length === 0) {
      throwError('VALIDATION_ERROR', 'Screen has no seats configured');
    }

    // Get unique seat types from screen
    const screenSeatTypes = new Set<string>(seats.map((seat) => seat.seatType));

    // Get seat types from pricing DTO
    const pricedSeatTypes = new Set<string>(dto.prices.map((p) => p.seatType));

    // Check if all screen seat types have prices
    const missingSeatTypes = Array.from(screenSeatTypes).filter(
      (seatType) => !pricedSeatTypes.has(seatType),
    );

    if (missingSeatTypes.length > 0) {
      throwError(
        'VALIDATION_ERROR',
        `Missing prices for seat types: ${missingSeatTypes.join(', ')}`,
      );
    }
  }

  /** Verifies that the screen belongs to the theatre. */
  private async verifyScreenOwnership(screenId: number, theatreId: number): Promise<void> {
    try {
      const screen = await this.theatreClient.getScreen(screenId);
      
      if (!screen) {
        throwError('NOT_FOUND', 'Screen not found');
      }

      if (screen.theatreId !== theatreId) {
        throwError('FORBIDDEN', 'You can only set prices for shows in your assigned theatre');
      }
    } catch (error) {
      if (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN') {
        throw error;
      }
      this.logger.error(`Theatre Service unavailable: ${error.message}`);
      throwError('SERVICE_UNAVAILABLE', 'Theatre Service is currently unavailable');
    }
  }

  /** Maps ShowPrice entities to response DTOs. */
  private mapPricesResponse(prices: ShowPrice[]) {
    return prices.map((price) => ({
      id: encryptId(price.id),
      seatType: price.seatType,
      amount: price.amount,
      currency: price.currency,
    }));
  }
}
