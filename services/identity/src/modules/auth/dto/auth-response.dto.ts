import { ApiProperty } from '@nestjs/swagger';

class RoleDto {
  @ApiProperty({ example: 'a1b2c3d4', description: 'Encrypted role ID' })
  id: string;

  @ApiProperty({ example: 'SUPER_ADMIN' })
  code: string;

  @ApiProperty({ example: 'Super Admin' })
  name: string;
}

class UserDto {
  @ApiProperty({ example: 'a1b2c3d4', description: 'Encrypted user ID' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ type: RoleDto })
  role: RoleDto;

  @ApiProperty({
    example: null,
    nullable: true,
    required: false,
    description: 'Encrypted theatre ID, only present for Theatre Admin users',
  })
  assignedTheatreId?: string | null;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ example: 3600, description: 'Token expiry in seconds' })
  expiresIn: number;

  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty({
    example: false,
    required: false,
    description: 'True if user must change password before proceeding',
  })
  mustChangePassword?: boolean;
}

export class RefreshResponseDto {
  @ApiProperty({ description: 'New JWT access token' })
  accessToken: string;

  @ApiProperty({ example: 3600, description: 'Token expiry in seconds' })
  expiresIn: number;
}

export class ProfileResponseDto {
  @ApiProperty({ example: 'a1b2c3d4', description: 'Encrypted user ID' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ type: RoleDto })
  role: RoleDto;

  @ApiProperty({
    example: null,
    nullable: true,
    required: false,
    description: 'Encrypted theatre ID, only present for Theatre Admin users',
  })
  assignedTheatreId?: string | null;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'DISABLED'] })
  status: string;
}
