import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateScreenDto } from './create-screen.dto';
import { ScreenStatus } from '@moviebooking/database';

export class UpdateScreenDto extends PartialType(CreateScreenDto) {
  @ApiPropertyOptional({ enum: ScreenStatus, example: ScreenStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ScreenStatus)
  status?: ScreenStatus;
}
