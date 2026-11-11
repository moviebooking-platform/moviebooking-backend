import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-off data fix: bookings moved to PENDING_REVIEW before holds were released on
 * that transition still have ACTIVE holds, which block their seats indefinitely.
 */
export class M6ReleasePendingReviewHolds1704844800000
  implements MigrationInterface
{
  name = 'M6ReleasePendingReviewHolds1704844800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE seat_holds
      SET status = 'RELEASED', updated_at = GETDATE()
      WHERE status = 'ACTIVE'
        AND booking_id IN (SELECT id FROM bookings WHERE status = 'PENDING_REVIEW')
    `);
  }

  public async down(): Promise<void> {
    // Data fix only; the previous state (seats blocked indefinitely) is not restored.
  }
}
