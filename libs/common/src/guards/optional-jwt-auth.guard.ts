import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // If No token Allow request, user will be null
    if (!authHeader) {
      return true;
    }

    // If token present Validate it via JwtStrategy
    return super.canActivate(context);
  }

  handleRequest(_err: any, user: any) {
    // Don't throw on invalid token, just return null
    return user || null;
  }
}
