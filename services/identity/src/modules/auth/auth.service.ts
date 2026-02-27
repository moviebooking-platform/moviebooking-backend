import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../entities';
import { throwError, ICurrentUser, ROLES } from '@moviebooking/common';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    // Generate tokens
    const tokens = await this.generateTokens(user);

    const response: any = {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: {
          id: user.role.id,
          code: user.role.code,
          name: user.role.name,
        },
      },
    };

    // Add mustChangePassword flag if user needs to change password
    if (user.mustChangePassword) {
      response.mustChangePassword = true;
    }

    // Add assignedTheatreId only for Theatre Admin role
    if (user.role.code === ROLES.THEATRE_ADMIN) {
      response.user.assignedTheatreId = null;
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

    const profile: any = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: {
        id: user.role.id,
        code: user.role.code,
        name: user.role.name,
      },
      status: user.status,
    };

    if (user.role.code === ROLES.THEATRE_ADMIN) {
      profile.assignedTheatreId = null; 
    }

    return profile;
  }

  private async generateTokens(user: User) {
    const accessToken = this.generateAccessToken(user);

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

      const accessToken = this.generateAccessToken(user);

      return {
        accessToken,
        expiresIn: 3600,
      };
    } catch {
      throwError('TOKEN_INVALID');
    }
  }

  private generateAccessToken(user: User): string {
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
      // theatreId
    };

    return this.jwtService.sign(payload);
  }
}
