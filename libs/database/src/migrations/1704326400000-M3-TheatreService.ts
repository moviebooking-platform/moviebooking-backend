import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Milestone 3: Theatre Service
 * Creates tables for theatre management
 * Tables: theatres, theatre_admins, screens, seats
 */
export class M3TheatreService1704326400000 implements MigrationInterface {
  name = 'M3TheatreService1704326400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Theatres table
    await queryRunner.query(`
      CREATE TABLE theatres (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        address VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_theatres_city ON theatres(city)`);
    await queryRunner.query(`CREATE INDEX idx_theatres_status ON theatres(status)`);
    await queryRunner.query(`CREATE INDEX idx_theatres_name ON theatres(name)`);

    // Theatre Admins table
    await queryRunner.query(`
      CREATE TABLE theatre_admins (
        id INT IDENTITY(1,1) PRIMARY KEY,
        theatre_id INT NOT NULL,
        user_id INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL,
        CONSTRAINT FK_theatre_admins_theatre FOREIGN KEY (theatre_id) REFERENCES theatres(id),
        CONSTRAINT FK_theatre_admins_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT UQ_theatre_admins_theatre_user UNIQUE (theatre_id, user_id),
        CONSTRAINT UQ_theatre_admins_user UNIQUE (user_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_theatre_admins_theatre ON theatre_admins(theatre_id)`);
    await queryRunner.query(`CREATE INDEX idx_theatre_admins_status ON theatre_admins(status)`);

    // Screens table
    await queryRunner.query(`
      CREATE TABLE screens (
        id INT IDENTITY(1,1) PRIMARY KEY,
        theatre_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL,
        CONSTRAINT FK_screens_theatre FOREIGN KEY (theatre_id) REFERENCES theatres(id),
        CONSTRAINT UQ_screens_theatre_name UNIQUE (theatre_id, name)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_screens_theatre ON screens(theatre_id)`);
    await queryRunner.query(`CREATE INDEX idx_screens_status ON screens(status)`);

    // Seats table
    await queryRunner.query(`
      CREATE TABLE seats (
        id INT IDENTITY(1,1) PRIMARY KEY,
        screen_id INT NOT NULL,
        seat_code VARCHAR(10) NOT NULL,
        row_label VARCHAR(10) NOT NULL,
        seat_number INT NOT NULL,
        seat_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL,
        CONSTRAINT FK_seats_screen FOREIGN KEY (screen_id) REFERENCES screens(id),
        CONSTRAINT UQ_seats_screen_code UNIQUE (screen_id, seat_code)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_seats_screen ON seats(screen_id)`);
    await queryRunner.query(`CREATE INDEX idx_seats_screen_type ON seats(screen_id, seat_type)`);
    await queryRunner.query(`CREATE INDEX idx_seats_status ON seats(status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS seats`);
    await queryRunner.query(`DROP TABLE IF EXISTS screens`);
    await queryRunner.query(`DROP TABLE IF EXISTS theatre_admins`);
    await queryRunner.query(`DROP TABLE IF EXISTS theatres`);
  }
}
