import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../entities';
import {
  throwError,
  ICurrentUser,
  ROLES,
  encryptId,
} from '@moviebooking/common';
import { TheatreClient } from '../../clients/theatre.client';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

export interface RoleResponse {
  id: string;
  code: string;
  name: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: RoleResponse;
  assignedTheatreId?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponse;
  mustChangePassword?: boolean;
}

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  role: RoleResponse;
  status: UserStatus;
  assignedTheatreId?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly theatreClient: TheatreClient,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with role
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user) {
      throwError('INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throwError('INVALID_CREDENTIALS', 'Account is disabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throwError('INVALID_CREDENTIALS');
    }

    // Check if temporary password has expired
    if (user.passwordExpiresAt && new Date() > user.passwordExpiresAt) {
      throwError('PASSWORD_EXPIRED');
    }

    // Fetch theatreId for Theatre Admin
    let theatreId: number | null = null;
    if (user.role.code === ROLES.THEATRE_ADMIN) {
      theatreId = await this.theatreClient.getTheatreIdByUserId(user.id);
    }

    // Generate tokens
    const tokens = this.generateTokens(user, theatreId);

    const response: LoginResponse = {
      ...tokens,
      user: {
        id: encryptId(user.id),
        name: user.name,
        email: user.email,
        role: {
          id: encryptId(user.role.id),
          code: user.role.code,
          name: user.role.name,
        },
      },
    };

    // Add mustChangePassword flag if user needs to change password
    if (user.mustChangePassword) {
      response.mustChangePassword = true;
    }

    // Add assignedTheatreId for Theatre Admin role
    if (user.role.code === ROLES.THEATRE_ADMIN) {
      response.user.assignedTheatreId = theatreId
        ? encryptId(theatreId)
        : null;
    }

    return response;
  }

  async logout(_userId: number) {
    return;
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throwError('NOT_FOUND', 'User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throwError('INVALID_CREDENTIALS', 'Current password is incorrect');
    }

    // Ensure new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throwError('VALIDATION_ERROR', 'New password must be different from current password');
    }

    // Hash and save new password
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    user.passwordExpiresAt = null;

    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throwError('NOT_FOUND', 'User not found');
    }

    const profile: ProfileResponse = {
      id: encryptId(user.id),
      name: user.name,
      email: user.email,
      role: {
        id: encryptId(user.role.id),
        code: user.role.code,
        name: user.role.name,
      },
      status: user.status,
    };

    // Add assignedTheatreId for Theatre Admin role 
    if (user.role.code === ROLES.THEATRE_ADMIN) {
      const theatreId = await this.theatreClient.getTheatreIdByUserId(user.id);
      profile.assignedTheatreId = theatreId
        ? encryptId(theatreId)
        : null;
    }

    return profile;
  }

  private generateTokens(user: User, theatreId: number | null = null) {
    const accessToken = this.generateAccessToken(user, theatreId);

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['role'],
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throwError('TOKEN_INVALID');
      }

      // Fetch fresh theatreId for Theatre Admin
      let theatreId: number | null = null;
      if (user.role.code === ROLES.THEATRE_ADMIN) {
        theatreId = await this.theatreClient.getTheatreIdByUserId(user.id);
      }

      const accessToken = this.generateAccessToken(user, theatreId);

      return {
        accessToken,
        expiresIn: 3600,
      };
    } catch {
      throwError('TOKEN_INVALID');
    }
  }

  private generateAccessToken(user: User, theatreId: number | null = null): string {
    const payload: Partial<ICurrentUser> & { sub: number } = {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: {
        id: user.role.id,
        code: user.role.code,
        name: user.role.name,
      },
    };

    if (user.role.code === ROLES.THEATRE_ADMIN && theatreId) {
      payload.theatreId = theatreId;
    }

    return this.jwtService.sign(payload);
  }
}
