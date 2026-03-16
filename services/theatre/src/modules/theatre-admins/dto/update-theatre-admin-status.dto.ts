import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TheatreAdminStatus } from '../../../entities';

export class UpdateTheatreAdminStatusDto {
  @ApiProperty({ enum: TheatreAdminStatus, example: TheatreAdminStatus.ACTIVE })
  @IsEnum(TheatreAdminStatus)
  status: TheatreAdminStatus;
}
