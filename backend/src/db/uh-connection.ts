// Подключение к БД 1С УХ (если требуется прямое подключение)
// ВНИМАНИЕ: Прямое подключение к БД 1С не рекомендуется!
// Используйте HTTP API через uh-integration.ts

import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

let uhPool: Pool | null = null;
let uhMssqlPool: sql.ConnectionPool | null = null;
/** Пул для Integrated Auth (текущий пользователь Windows) — через msnodesqlv8 */
let uhMssqlPoolIntegrated: sql.ConnectionPool | null = null;

type UHDbType = 'postgres' | 'mssql';

function getUHDbType(): UHDbType {
  const t = (process.env.UH_DB_TYPE || 'postgres').toLowerCase();
  if (t === 'mssql' || t === 'sqlserver' || t === 'ms-sql') return 'mssql';
  return 'postgres';
}

export function getUHConnection(): Pool | sql.ConnectionPool {
  if (getUHDbType() === 'mssql') {
    if (!uhMssqlPool) {
      const server = process.env.UH_MSSQL_SERVER || process.env.UH_DB_HOST;
      const database = process.env.UH_MSSQL_DATABASE || process.env.UH_DB_NAME;
      const port = parseInt(process.env.UH_MSSQL_PORT || process.env.UH_DB_PORT || '1433');

      const encrypt = (process.env.UH_MSSQL_ENCRYPT || 'false').toLowerCase() === 'true';
      const trustServerCertificate =
        (process.env.UH_MSSQL_TRUST_SERVER_CERTIFICATE || 'true').toLowerCase() === 'true';

      const rawUser =
        process.env.UH_MSSQL_USER ||
        process.env.UH_MSSQL_USERNAME ||
        process.env.UH_DB_USER ||
        '';
      const password = process.env.UH_MSSQL_PASSWORD || process.env.UH_DB_PASSWORD || '';

      let domain = process.env.UH_MSSQL_DOMAIN || '';
      let userName = process.env.UH_MSSQL_USERNAME || '';

      // Поддержка формата "DOMAIN\\user"
      if (!domain && !userName && rawUser.includes('\\')) {
        const parts = rawUser.split('\\');
        domain = parts[0] || '';
        userName = parts.slice(1).join('\\') || '';
      } else if (!userName) {
        userName = rawUser;
      }

      const authType = (process.env.UH_MSSQL_AUTH || (domain ? 'ntlm' : 'sql')).toLowerCase();

      const config: sql.config = {
        server: server || '',
        database: database || '',
        port,
        options: {
          encrypt,
          trustServerCertificate
        },
        pool: {
          max: 5,
          min: 0,
          idleTimeoutMillis: 30000
        }
      };

      if (authType === 'ntlm') {
        (config as any).authentication = {
          type: 'ntlm',
          options: {
            domain,
            userName,
            password
          }
        };
      } else {
        // SQL authentication
        (config as any).user = userName;
        (config as any).password = password;
      }

      uhMssqlPool = new sql.ConnectionPool(config);
      uhMssqlPool.connect().catch((err: any) => {
        console.error('❌ UH MSSQL pool connection failed:', err?.message || err);
        uhMssqlPool = null;
      });
    }

    return uhMssqlPool;
  }

  // PostgreSQL (старый вариант)
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

/** Для MSSQL с integrated/trusted — асинхронное получение пула (msnodesqlv8, Trusted_Connection) */
async function getUHConnectionAsync(): Promise<Pool | sql.ConnectionPool> {
  if (getUHDbType() !== 'mssql') {
    return getUHConnection();
  }
  const authType = (process.env.UH_MSSQL_AUTH || 'ntlm').toLowerCase();
  if (authType === 'integrated' || authType === 'trusted') {
    if (uhMssqlPoolIntegrated) {
      return uhMssqlPoolIntegrated;
    }
    try {
      const sqlMs = await import('mssql/msnodesqlv8');
      const sqlIntegrated = (sqlMs as any).default ?? sqlMs;
      const server = process.env.UH_MSSQL_SERVER || process.env.UH_DB_HOST || '';
      const database = process.env.UH_MSSQL_DATABASE || process.env.UH_DB_NAME || '';
      const port = parseInt(process.env.UH_MSSQL_PORT || process.env.UH_DB_PORT || '1433');
      const trustServerCertificate =
        (process.env.UH_MSSQL_TRUST_SERVER_CERTIFICATE || 'true').toLowerCase() === 'true';
      const driver =
        process.env.UH_MSSQL_ODBC_DRIVER ||
        'ODBC Driver 17 for SQL Server';
      const config: any = {
        server,
        database,
        port,
        driver,
        options: {
          trustedConnection: true,
          trustServerCertificate
        },
        pool: { max: 5, min: 0, idleTimeoutMillis: 30000 }
      };
      uhMssqlPoolIntegrated = new sqlIntegrated.ConnectionPool(config);
      await uhMssqlPoolIntegrated.connect();
      return uhMssqlPoolIntegrated;
    } catch (err: any) {
      uhMssqlPoolIntegrated = null;
      const msg = err?.message || String(err);
      if (msg.includes('Data source name not found') || msg.includes('no default driver')) {
        throw new Error(
          'ODBC-драйвер не найден. Установите Microsoft ODBC Driver 17 (или 18) for SQL Server и перезапустите backend. ' +
          'Скачать: https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server'
        );
      }
      if (msg.includes('Trusted_Connection')) {
        throw new Error('Integrated Auth: запустите backend под доменной учётной записью (текущий пользователь Windows).');
      }
      throw new Error(msg);
    }
  }
  return getUHConnection();
}

export async function testUHConnection(): Promise<boolean> {
  const result = await testUHConnectionWithMessage();
  return result.ok;
}

/** Результат проверки с текстом ошибки для UI */
export async function testUHConnectionWithMessage(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const conn =
      getUHDbType() === 'mssql' && ['integrated', 'trusted'].includes((process.env.UH_MSSQL_AUTH || '').toLowerCase())
        ? await getUHConnectionAsync()
        : getUHConnection();
    if (getUHDbType() === 'mssql') {
      const mssql = conn as sql.ConnectionPool;
      if ((process.env.UH_MSSQL_AUTH || '').toLowerCase() !== 'integrated' && (process.env.UH_MSSQL_AUTH || '').toLowerCase() !== 'trusted') {
        await mssql.connect();
      }
      await mssql.request().query('SELECT 1 as test');
      console.log('✅ UH Database (MSSQL) connection successful');
    } else {
      const pg = conn as Pool;
      await pg.query('SELECT 1 as test');
      console.log('✅ UH Database (Postgres) connection successful');
    }
    return { ok: true };
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('❌ UH Database connection failed:', error);
    return { ok: false, error: message };
  }
}

/** Параметры подключения без паролей (для отображения на странице проверки) */
export function getUHDbSafeConfig(): {
  type: string;
  server: string;
  database: string;
  port: number;
  authType?: string;
} | null {
  const type = getUHDbType();
  if (type === 'mssql') {
    const server = process.env.UH_MSSQL_SERVER || process.env.UH_DB_HOST || '';
    const database = process.env.UH_MSSQL_DATABASE || process.env.UH_DB_NAME || '';
    const port = parseInt(process.env.UH_MSSQL_PORT || process.env.UH_DB_PORT || '1433');
    const auth = (process.env.UH_MSSQL_AUTH || 'ntlm').toLowerCase();
    const userRaw = process.env.UH_MSSQL_USER || process.env.UH_DB_USER || '';
    const authType =
      auth === 'integrated' || auth === 'trusted'
        ? 'Integrated (текущий пользователь Windows)'
        : userRaw.includes('\\')
          ? 'NTLM (домен)'
          : auth === 'ntlm'
            ? 'NTLM'
            : 'SQL';
    if (!server && !database) return null;
    return { type: 'MS SQL Server', server, database, port, authType };
  }
  const host = process.env.UH_DB_HOST || '';
  const database = process.env.UH_DB_NAME || '';
  const port = parseInt(process.env.UH_DB_PORT || '5432');
  if (!host && !database) return null;
  return { type: 'PostgreSQL', server: host, database, port };
}

/** Пример данных из одной таблицы (sys.tables в MSSQL, pg_tables в PG) — для проверки доступа к данным */
export async function runUHSampleQuery(): Promise<{ rows: any[]; columns: string[]; source: string }> {
  const conn =
    getUHDbType() === 'mssql' && ['integrated', 'trusted'].includes((process.env.UH_MSSQL_AUTH || '').toLowerCase())
      ? await getUHConnectionAsync()
      : getUHConnection();
  if (getUHDbType() === 'mssql') {
    const mssql = conn as sql.ConnectionPool;
    if ((process.env.UH_MSSQL_AUTH || '').toLowerCase() !== 'integrated' && (process.env.UH_MSSQL_AUTH || '').toLowerCase() !== 'trusted') {
      await mssql.connect();
    }
    const result = await mssql.request().query(
      'SELECT TOP 10 name AS table_name, create_date FROM sys.tables ORDER BY name'
    );
    const rows = result.recordset || [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : ['table_name', 'create_date'];
    return { rows, columns, source: 'sys.tables' };
  }
  const pg = conn as Pool;
  const result = await pg.query(
    "SELECT tablename AS table_name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LIMIT 10"
  );
  const rows = result.rows || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : ['table_name'];
  return { rows, columns, source: 'pg_tables' };
}

export async function closeUHConnection(): Promise<void> {
  if (uhPool) {
    await uhPool.end();
    uhPool = null;
  }
  if (uhMssqlPool) {
    await uhMssqlPool.close();
    uhMssqlPool = null;
  }
  if (uhMssqlPoolIntegrated) {
    await uhMssqlPoolIntegrated.close();
    uhMssqlPoolIntegrated = null;
  }
}
