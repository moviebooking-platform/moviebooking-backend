import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ICurrentUser, AppException, ROLES, decryptId } from '@moviebooking/common';

@Injectable()
export class TheatreOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: ICurrentUser = request.user;

    // Super Admins bypass ownership check
    if (user.role?.code === ROLES.SUPER_ADMIN) {
      return true;
    }

    // Theatre Admins must have a theatreId in their JWT
    if (!user.theatreId) {
      throw new AppException('FORBIDDEN', 'No theatre assignment found');
    }

    // If theatreId is in URL params, verify ownership
    const urlTheatreId = request.params.theatreId;
    if (urlTheatreId) {
      const decryptedTheatreId = decryptId(urlTheatreId);
      if (decryptedTheatreId !== user.theatreId) {
        throw new AppException('FORBIDDEN', 'You can only access your assigned theatre');
      }
    }

    // Attach theatreId to request for service layer to use
    request.theatreId = user.theatreId;
    return true;
  }
}
