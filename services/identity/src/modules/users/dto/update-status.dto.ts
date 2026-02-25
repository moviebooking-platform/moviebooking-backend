import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../../../entities';

export class UpdateStatusDto {
  @ApiProperty({ 
    enum: UserStatus, 
    example: UserStatus.ACTIVE,
    description: 'New user status' 
  })
  @IsEnum(UserStatus)
  status: UserStatus;
}
