import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * M5: Show Service Migration
 * Creates shows and show_prices tables with proper indexes and constraints.
 */
export class M5ShowService1704499200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create shows table
    await queryRunner.createTable(
      new Table({
        name: 'shows',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'screen_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'movie_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'starts_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'ends_at',
            type: 'datetime2',
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

    // Foreign key: shows.screen_id → screens.id
    await queryRunner.createForeignKey(
      'shows',
      new TableForeignKey({
        columnNames: ['screen_id'],
        referencedTableName: 'screens',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        name: 'fk_shows_screen',
      }),
    );

    // Foreign key: shows.movie_id → movies.id
    await queryRunner.createForeignKey(
      'shows',
      new TableForeignKey({
        columnNames: ['movie_id'],
        referencedTableName: 'movies',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        name: 'fk_shows_movie',
      }),
    );

    // Index for overlap detection: (screen_id, starts_at)
    await queryRunner.createIndex(
      'shows',
      new TableIndex({
        name: 'idx_shows_screen_date',
        columnNames: ['screen_id', 'starts_at'],
      }),
    );

    // Index for filtered overlap detection: (screen_id, status, starts_at)
    await queryRunner.createIndex(
      'shows',
      new TableIndex({
        name: 'idx_shows_screen_status_date',
        columnNames: ['screen_id', 'status', 'starts_at'],
      }),
    );

    // Index for movie-based filtering: (movie_id, starts_at)
    await queryRunner.createIndex(
      'shows',
      new TableIndex({
        name: 'idx_shows_movie_date',
        columnNames: ['movie_id', 'starts_at'],
      }),
    );

    // Index for date-based filtering: (starts_at)
    await queryRunner.createIndex(
      'shows',
      new TableIndex({
        name: 'idx_shows_starts_at',
        columnNames: ['starts_at'],
      }),
    );

    // Index for status filtering: (status)
    await queryRunner.createIndex(
      'shows',
      new TableIndex({
        name: 'idx_shows_status',
        columnNames: ['status'],
      }),
    );

    // Create show_prices table
    await queryRunner.createTable(
      new Table({
        name: 'show_prices',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'show_id',
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
            name: 'amount',
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

    // Foreign key: show_prices.show_id → shows.id
    await queryRunner.createForeignKey(
      'show_prices',
      new TableForeignKey({
        columnNames: ['show_id'],
        referencedTableName: 'shows',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'fk_show_prices_show',
      }),
    );

    // Unique constraint: (show_id, seat_type)
    await queryRunner.createIndex(
      'show_prices',
      new TableIndex({
        name: 'uq_show_prices_show_seat_type',
        columnNames: ['show_id', 'seat_type'],
        isUnique: true,
      }),
    );

    // Index for pricing lookup: (show_id)
    await queryRunner.createIndex(
      'show_prices',
      new TableIndex({
        name: 'idx_show_prices_show',
        columnNames: ['show_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop show_prices table (foreign keys and indexes are dropped automatically)
    await queryRunner.dropTable('show_prices', true);

    // Drop shows table (foreign keys and indexes are dropped automatically)
    await queryRunner.dropTable('shows', true);
  }
}
