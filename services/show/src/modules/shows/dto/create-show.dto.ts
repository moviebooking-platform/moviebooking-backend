import { IsInt, IsPositive, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** DTO for creating a new show. */
export class CreateShowDto {
  @ApiProperty({ example: 1, description: 'Movie ID' })
  @IsInt()
  @IsPositive()
  movieId: number;

  @ApiProperty({ example: 1, description: 'Screen ID' })
  @IsInt()
  @IsPositive()
  screenId: number;

  @ApiProperty({ example: '2024-12-25T14:00:00Z', description: 'Show start time (ISO 8601 UTC)' })
  @IsISO8601()
  startsAt: string;

  @ApiProperty({ example: '2024-12-25T16:30:00Z', description: 'Show end time (ISO 8601 UTC)' })
  @IsISO8601()
  endsAt: string;
}
