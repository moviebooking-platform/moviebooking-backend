import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Milestone 4: Movie Service
 * Creates tables for movie catalogue management
 * Tables: movies, movie_images, movie_requests
 */
export class M4MovieService1704412800000 implements MigrationInterface {
  name = 'M4MovieService1704412800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Movies table
    await queryRunner.query(`
      CREATE TABLE movies (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        release_date DATE NOT NULL,
        cast VARCHAR(500) NULL,
        director VARCHAR(255) NULL,
        language VARCHAR(100) NULL,
        running_time_minutes INT NULL,
        rating_value DECIMAL(3,1) NULL,
        rating_max DECIMAL(3,1) NULL DEFAULT 10,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_movies_status ON movies(status)`);
    await queryRunner.query(`CREATE INDEX idx_movies_title ON movies(title)`);
    await queryRunner.query(`CREATE INDEX idx_movies_release_date ON movies(release_date)`);
    await queryRunner.query(`CREATE INDEX idx_movies_language ON movies(language)`);
    // Composite index for duplicate detection (title + release_date)
    await queryRunner.query(`CREATE UNIQUE INDEX idx_movies_title_release ON movies(title, release_date) WHERE deleted_at IS NULL`);

    // Movie Images table
    await queryRunner.query(`
      CREATE TABLE movie_images (
        id INT IDENTITY(1,1) PRIMARY KEY,
        movie_id INT NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        is_primary BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL,
        CONSTRAINT FK_movie_images_movie FOREIGN KEY (movie_id) REFERENCES movies(id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_movie_images_movie ON movie_images(movie_id)`);
    await queryRunner.query(`CREATE INDEX idx_movie_images_primary ON movie_images(movie_id, is_primary)`);

    // Movie Requests table
    await queryRunner.query(`
      CREATE TABLE movie_requests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        theatre_id INT NOT NULL,
        requested_by_user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        release_date DATE NULL,
        cast VARCHAR(500) NULL,
        director VARCHAR(255) NULL,
        language VARCHAR(100) NULL,
        expected_release_date DATE NULL,
        notes TEXT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        reviewed_by_user_id INT NULL,
        reviewed_at DATETIME2 NULL,
        review_reason TEXT NULL,
        created_movie_id INT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL,
        CONSTRAINT FK_movie_requests_created_movie FOREIGN KEY (created_movie_id) REFERENCES movies(id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_movie_requests_theatre ON movie_requests(theatre_id)`);
    await queryRunner.query(`CREATE INDEX idx_movie_requests_status ON movie_requests(status)`);
    await queryRunner.query(`CREATE INDEX idx_movie_requests_requested_by ON movie_requests(requested_by_user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS movie_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS movie_images`);
    await queryRunner.query(`DROP TABLE IF EXISTS movies`);
  }
}
