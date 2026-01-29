import { pool } from './connection.js';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backend/src/db -> backend/db/migrations
const migrationsDir = path.resolve(__dirname, '../../db/migrations');

export async function runMigrations() {
  // Needed for gen_random_uuid() used in schema
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) return;

  // Track applied migrations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  for (const file of files) {
    const already = await pool.query('SELECT 1 FROM _migrations WHERE id = $1', [file]);
    if (already.rowCount) continue;

    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (id) VALUES ($1)', [file]);
  }
}

