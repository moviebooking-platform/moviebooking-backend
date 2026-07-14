import { Injectable } from '@nestjs/common';
import { ICurrentUser } from '@moviebooking/common';
import { ShowClient } from '../../clients/show.client';
import { TheatreClient } from '../../clients/theatre.client';

@Injectable()
export class TheatreBookingScopeService {
  constructor(
    private readonly theatreClient: TheatreClient,
    private readonly showClient: ShowClient,
  ) {}

  async resolveShowIdsForCurrentUser(
    currentUser: ICurrentUser,
  ): Promise<number[]> {
    if (currentUser.theatreId == null) {
      return [];
    }

    const screenIds = await this.theatreClient.getScreensByTheatre(
      currentUser.theatreId,
    );

    if (screenIds.length === 0) {
      return [];
    }

    return this.showClient.getShowIdsByScreens(screenIds);
  }
}
