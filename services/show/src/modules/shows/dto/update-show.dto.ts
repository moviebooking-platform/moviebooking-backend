import { IsISO8601, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShowStatus } from '@moviebooking/database';

/** DTO for updating an existing show. */
export class UpdateShowDto {
  @ApiProperty({ example: '2024-12-25T14:00:00Z', description: 'Show start time (ISO 8601 UTC)', required: false })
  @IsISO8601()
  @IsOptional()
  startsAt?: string;

  @ApiProperty({ example: '2024-12-25T16:30:00Z', description: 'Show end time (ISO 8601 UTC)', required: false })
  @IsISO8601()
  @IsOptional()
  endsAt?: string;

  @ApiProperty({ example: 'ACTIVE', enum: ShowStatus, description: 'Show status', required: false })
  @IsEnum(ShowStatus)
  @IsOptional()
  status?: ShowStatus;
}
