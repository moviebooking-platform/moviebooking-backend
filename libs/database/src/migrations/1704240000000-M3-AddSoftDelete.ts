import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Milestone 3: Add Soft Delete Support
 * Adds deleted_at column to roles, users tables
 * Tables: roles, users
 */
export class M3AddSoftDelete1704240000000 implements MigrationInterface {
  name = 'M3AddSoftDelete1704240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted_at to roles table
    await queryRunner.query(`
      ALTER TABLE roles
      ADD deleted_at DATETIME2 NULL
    `);

    // Add deleted_at to users table
    await queryRunner.query(`
      ALTER TABLE users
      ADD deleted_at DATETIME2 NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN deleted_at`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN deleted_at`);
  }
}
