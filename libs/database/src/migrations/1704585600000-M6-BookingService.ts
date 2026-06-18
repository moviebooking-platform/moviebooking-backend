import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * M6: Booking Service Migration
 * Creates bookings, booking_seats, and seat_holds tables with their indexes,
 * foreign keys, and the filtered unique index that guards against double holds.
 */
export class M6BookingService1704585600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create bookings table
    await queryRunner.createTable(
      new Table({
        name: 'bookings',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'booking_ref',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'show_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'HOLDING'",
            isNullable: false,
          },
          {
            name: 'hold_expires_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'total_amount_cents',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'char',
            length: '3',
            default: "'GBP'",
            isNullable: false,
          },
          {
            name: 'needs_review_reason',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETDATE()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime2',
            default: 'GETDATE()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'datetime2',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Foreign key: bookings.show_id → shows.id (integrity only, no cross-service JOIN)
    await queryRunner.createForeignKey(
      'bookings',
      new TableForeignKey({
        columnNames: ['show_id'],
        referencedTableName: 'shows',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'fk_bookings_show',
      }),
    );

    // Unique index on booking_ref
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_ref',
        columnNames: ['booking_ref'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_show',
        columnNames: ['show_id'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_status',
        columnNames: ['status'],
      }),
    );

    // Sweep / hold-expiry lookup: (status, hold_expires_at)
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_hold_expires',
        columnNames: ['status', 'hold_expires_at'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_email',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_created',
        columnNames: ['created_at'],
      }),
    );

    // Create booking_seats table
    await queryRunner.createTable(
      new Table({
        name: 'booking_seats',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'booking_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'show_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'seat_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'seat_type',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'price_cents',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETDATE()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime2',
            default: 'GETDATE()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'datetime2',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Foreign key: booking_seats.booking_id → bookings.id (CASCADE)
    await queryRunner.createForeignKey(
      'booking_seats',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'fk_booking_seats_booking',
      }),
    );

    // Foreign key: booking_seats.seat_id → seats.id (integrity only)
    await queryRunner.createForeignKey(
      'booking_seats',
      new TableForeignKey({
        columnNames: ['seat_id'],
        referencedTableName: 'seats',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'fk_booking_seats_seat',
      }),
    );

    // Unique constraint: one line per seat per booking
    await queryRunner.createIndex(
      'booking_seats',
      new TableIndex({
        name: 'uq_booking_seats_booking_seat',
        columnNames: ['booking_id', 'seat_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'booking_seats',
      new TableIndex({
        name: 'idx_booking_seats_booking',
        columnNames: ['booking_id'],
      }),
    );

    await queryRunner.createIndex(
      'booking_seats',
      new TableIndex({
        name: 'idx_booking_seats_seat',
        columnNames: ['seat_id'],
      }),
    );

    // Double-sell / availability check: (show_id, seat_id)
    await queryRunner.createIndex(
      'booking_seats',
      new TableIndex({
        name: 'idx_booking_seats_show_seat',
        columnNames: ['show_id', 'seat_id'],
      }),
    );

    // Create seat_holds table
    await queryRunner.createTable(
      new Table({
        name: 'seat_holds',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'booking_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'show_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'seat_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'ACTIVE'",
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETDATE()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime2',
            default: 'GETDATE()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'datetime2',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Foreign key: seat_holds.booking_id → bookings.id (CASCADE)
    await queryRunner.createForeignKey(
      'seat_holds',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'fk_seat_holds_booking',
      }),
    );

    await queryRunner.createIndex(
      'seat_holds',
      new TableIndex({
        name: 'idx_seat_holds_booking',
        columnNames: ['booking_id'],
      }),
    );

    // Sweep job lookup: (status, expires_at)
    await queryRunner.createIndex(
      'seat_holds',
      new TableIndex({
        name: 'idx_seat_holds_expiry',
        columnNames: ['status', 'expires_at'],
      }),
    );

    // Availability lookup: (show_id, seat_id, status)
    await queryRunner.createIndex(
      'seat_holds',
      new TableIndex({
        name: 'idx_seat_holds_show_seat_status',
        columnNames: ['show_id', 'seat_id', 'status'],
      }),
    );

    // Filtered unique index — the authoritative double-hold guard.
    // Cannot be expressed via TableIndex WHERE clause, so use raw SQL.
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_seat_holds_unique_active
      ON seat_holds (show_id, seat_id)
      WHERE status = 'ACTIVE';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the filtered unique index before dropping its table.
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_seat_holds_unique_active ON seat_holds;`,
    );

    await queryRunner.dropTable('seat_holds', true);
    await queryRunner.dropTable('booking_seats', true);
    await queryRunner.dropTable('bookings', true);
  }
}
