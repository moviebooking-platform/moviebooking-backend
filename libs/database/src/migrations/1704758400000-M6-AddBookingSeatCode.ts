import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Snapshots the human-readable seat code (e.g. "A12") on each booking line, alongside
 * the price snapshot, so confirmations and tickets never need the Theatre Service.
 * Existing rows are backfilled from seats; seats are never hard-deleted (FK is NO ACTION).
 */
export class M6AddBookingSeatCode1704758400000 implements MigrationInterface {
  name = 'M6AddBookingSeatCode1704758400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'booking_seats',
      new TableColumn({
        name: 'seat_code',
        type: 'varchar',
        length: '10',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      UPDATE bs
      SET bs.seat_code = s.seat_code
      FROM booking_seats bs
      INNER JOIN seats s ON s.id = bs.seat_id
    `);

    await queryRunner.query(
      `ALTER TABLE booking_seats ALTER COLUMN seat_code VARCHAR(10) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('booking_seats', 'seat_code');
  }
}
