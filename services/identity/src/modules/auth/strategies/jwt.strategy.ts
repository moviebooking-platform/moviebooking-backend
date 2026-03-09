import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ICurrentUser, AppException } from '@moviebooking/common';

interface JwtPayload {
  sub: number;
  id: number;
  email: string;
  name: string;
  role: {
    id: number;
    code: string;
    name: string;
  };
  theatreId?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', ''),
    });
  }

  async validate(payload: JwtPayload): Promise<ICurrentUser> {
    const userId = payload.id ?? payload.sub;

    if (!userId) {
      throw new AppException('TOKEN_INVALID');
    }
   
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      theatreId: payload.theatreId,
    };
  }
}
