import { ApiProperty } from '@nestjs/swagger';

class RoleDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'SUPER_ADMIN' })
  code: string;

  @ApiProperty({ example: 'Super Admin' })
  name: string;
}

class UserDto {
  @ApiProperty({ example: 1 })
  id: number;

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
    description: 'Only present for Theatre Admin users' 
  })
  assignedTheatreId?: number | null;
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
    description: 'True if user must change password before proceeding' 
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
  @ApiProperty({ example: 1 })
  id: number;

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
    description: 'Only present for Theatre Admin users' 
  })
  assignedTheatreId?: number | null;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'DISABLED'] })
  status: string;
}
