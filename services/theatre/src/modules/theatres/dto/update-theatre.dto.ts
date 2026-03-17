import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateTheatreDto } from './create-theatre.dto';
import { TheatreStatus } from '@moviebooking/database';

export class UpdateTheatreDto extends PartialType(CreateTheatreDto) {
  @ApiPropertyOptional({ enum: TheatreStatus, example: TheatreStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TheatreStatus)
  status?: TheatreStatus;
}
