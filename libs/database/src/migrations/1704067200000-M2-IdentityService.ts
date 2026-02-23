import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

/**
 * Milestone 2: Identity Service
 * Creates tables for authentication and user management
 * Tables: roles, users
 */
export class M2IdentityService1704067200000 implements MigrationInterface {
  name = 'M2IdentityService1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Roles table
    await queryRunner.query(`
      CREATE TABLE roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
      )
    `);

    // Users table
    await queryRunner.query(`
      CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_users_role ON users(role_id)`);
    await queryRunner.query(`CREATE INDEX idx_users_status ON users(status)`);

    // Seed roles
    await queryRunner.query(`
      INSERT INTO roles (code, name) VALUES
      ('SUPER_ADMIN', 'Super Admin'),
      ('STAFF', 'Staff'),
      ('THEATRE_ADMIN', 'Theatre Admin')
    `);

    // Seed default super admin user from environment variables
    const adminName = process.env.ADMIN_NAME || 'Super Admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@moviebooking.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await queryRunner.query(`
      INSERT INTO users (name, email, password_hash, role_id, status) VALUES
      ('${adminName}', '${adminEmail}', '${passwordHash}', 1, 'ACTIVE')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles`);
  }
}
