import { Injectable } from '@nestjs/common';
import { ShowClient } from '../../clients/show.client';
import { TheatreClient } from '../../clients/theatre.client';

@Injectable()
export class TheatreBookingScopeService {
  constructor(
    private readonly theatreClient: TheatreClient,
    private readonly showClient: ShowClient,
  ) {}

  async getAccessibleShowIds(
    theatreId: number | null,
  ): Promise<number[]> {    
    if (theatreId == null) {
      return [];
    }

    const screenIds = await this.theatreClient.getScreensByTheatre(theatreId);    
    
    if (screenIds.length === 0) {
      return [];
    }

    return this.showClient.getShowIdsByScreens(screenIds);
  }
}
