import { IsString, IsNotEmpty, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** DTO for creating a new show. */
export class CreateShowDto {
  @ApiProperty({ example: 'a3f8x2k', description: 'Encrypted Movie ID' })
  @IsString()
  @IsNotEmpty()
  movieId: string;

  @ApiProperty({ example: 'b7g9y4m', description: 'Encrypted Screen ID' })
  @IsString()
  @IsNotEmpty()
  screenId: string;

  @ApiProperty({ example: '2026-06-15T14:00:00Z', description: 'Show start time (ISO 8601 UTC)' })
  @IsISO8601()
  startsAt: string;

  @ApiProperty({ example: '2026-06-15T16:30:00Z', description: 'Show end time (ISO 8601 UTC)' })
  @IsISO8601()
  endsAt: string;
}
