import { ApiProperty } from '@nestjs/swagger';

export class ReservationTimingResponseDto {
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  holdExpiresAt: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  paymentExpiresAt: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  activeExpiresAt: string | null;

  @ApiProperty({ minimum: 0 })
  remainingSeconds: number;

  @ApiProperty({ description: 'Current reservation stage message' })
  message: string;
}
