import { pool } from './connection.js';

export async function waitForDb(opts?: { retries?: number; delayMs?: number }) {
  const retries = opts?.retries ?? 30;
  const delayMs = opts?.delayMs ?? 1000;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1 as ok');
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Database is not reachable');
}

