import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ path: __dirname + '/../.env' });

const dataSource = new DataSource({
  type: 'mysql', // Use the appropriate database type
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASS || 'mypassword',
  database: process.env.DB_NAME || 'mydatabase',
  synchronize: false, // Set this to true for development, but false for production
  logging: true, // Set this to true to log SQL queries (for debugging)
  entities: [__dirname + '/entities/**/*.{ts,js}'],
  migrations: [__dirname + '/migrations/**/*.{ts,js}'],
  migrationsTableName: 'migrations',
});

export default dataSource;
