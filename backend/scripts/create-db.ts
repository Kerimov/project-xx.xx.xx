import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function createDatabase() {
  // Подключаемся к системной БД postgres для создания новой БД
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // подключаемся к системной БД
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  try {
    await adminClient.connect();
    console.log('✅ Connected to Postgres');

    const dbName = process.env.DB_NAME || 'ecof_portal';

    // Проверяем, существует ли БД
    const checkResult = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`ℹ️  Database "${dbName}" already exists`);
    } else {
      // Создаем БД
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database "${dbName}" created successfully`);
    }

    await adminClient.end();
  } catch (error: any) {
    console.error('❌ Error creating database:', error.message);
    process.exit(1);
  }
}

createDatabase();
