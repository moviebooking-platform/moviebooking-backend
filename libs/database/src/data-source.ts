import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

export const dataSourceOptions: DataSourceOptions = {
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'moviebooking_db',
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Never use in production
  logging: process.env.NODE_ENV === 'development',
  options: {
    encrypt: false, // For local development
    trustServerCertificate: true,
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
