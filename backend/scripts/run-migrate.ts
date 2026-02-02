// Запуск миграций БД (без старта сервера)

import dotenv from 'dotenv';
import { runMigrations } from '../src/db/migrate.js';
import { testConnection } from '../src/db/connection.js';

dotenv.config();

runMigrations()
  .then(async () => {
    await testConnection();
    console.log('Migrations applied.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
