import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class M6AddPaymentDeadline1704672000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'payment_expires_at',
        type: 'datetime2',
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_payment_expires',
        columnNames: ['status', 'payment_expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('bookings', 'idx_bookings_payment_expires');
    await queryRunner.dropColumn('bookings', 'payment_expires_at');
  }
}
