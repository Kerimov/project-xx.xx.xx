// Подключение к БД 1С УХ (если требуется прямое подключение)
// ВНИМАНИЕ: Прямое подключение к БД 1С не рекомендуется!
// Используйте HTTP API через uh-integration.ts

import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let uhPool: Pool | null = null;

export function getUHConnection(): Pool {
  if (!uhPool) {
    const config: PoolConfig = {
      host: process.env.UH_DB_HOST,
      port: parseInt(process.env.UH_DB_PORT || '5432'),
      database: process.env.UH_DB_NAME,
      user: process.env.UH_DB_USER,
      password: process.env.UH_DB_PASSWORD,
      ssl: process.env.UH_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 5, // Максимум соединений
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };

    uhPool = new Pool(config);

    // Обработка ошибок подключения
    uhPool.on('error', (err) => {
      console.error('❌ Unexpected error on idle UH DB client', err);
    });
  }

  return uhPool;
}

export async function testUHConnection(): Promise<boolean> {
  try {
    const pool = getUHConnection();
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ UH Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ UH Database connection failed:', error);
    return false;
  }
}

export async function closeUHConnection(): Promise<void> {
  if (uhPool) {
    await uhPool.end();
    uhPool = null;
  }
}
