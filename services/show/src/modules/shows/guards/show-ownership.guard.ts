import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICurrentUser, AppException, ROLES, decryptId } from '@moviebooking/common';
import { Show } from '../../../entities';
import { TheatreClient } from '../../../clients/theatre.client';

/** Validates that Theatre Admin can only access shows for their assigned theatre. */
@Injectable()
export class ShowOwnershipGuard implements CanActivate {
  constructor(
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
    private readonly theatreClient: TheatreClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: ICurrentUser = request.user;

    // Super Admin and Staff have full access
    if (user.role?.code === ROLES.SUPER_ADMIN || user.role?.code === ROLES.STAFF) {
      return true;
    }

    // Theatre Admin: verify ownership
    if (user.role?.code === ROLES.THEATRE_ADMIN) {
      if (!user.theatreId) {
        throw new AppException('FORBIDDEN', 'No theatre assignment found');
      }

      // For POST /shows, check screenId from body
      if (request.method === 'POST' && request.body?.screenId) {
        const screen = await this.theatreClient.getScreen(request.body.screenId);
        if (!screen || screen.theatreId !== user.theatreId) {
          throw new AppException('FORBIDDEN', 'You can only create shows for your assigned theatre');
        }
        return true;
      }

      // For PATCH/DELETE /shows/:id, check show's screen ownership
      const showId = request.params.id || request.params.showId;
      if (showId) {
        const decryptedShowId = decryptId(showId);
        const show = await this.showRepository.findOne({ where: { id: decryptedShowId } });
        
        if (!show) {
          throw new AppException('NOT_FOUND', 'Show not found');
        }

        const screen = await this.theatreClient.getScreen(show.screenId);
        if (!screen || screen.theatreId !== user.theatreId) {
          throw new AppException('FORBIDDEN', 'You can only access shows for your assigned theatre');
        }
        return true;
      }
    }

    throw new AppException('FORBIDDEN', 'Access denied');
  }
}
