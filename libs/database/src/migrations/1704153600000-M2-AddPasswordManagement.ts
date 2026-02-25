import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Milestone 2: Add password management fields
 * Adds must_change_password and password_expires_at columns to users table
 */
export class M2AddPasswordManagement1704153600000 implements MigrationInterface {
  name = 'M2AddPasswordManagement1704153600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
      ADD must_change_password BIT NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      ADD password_expires_at DATETIME2 NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN password_expires_at`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN must_change_password`);
  }
}
