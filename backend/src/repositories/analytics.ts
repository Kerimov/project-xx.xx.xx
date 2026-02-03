import { pool } from '../db/connection.js';

export interface DirectionRow {
  id: string;
  code: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface AnalyticsTypeRow {
  id: string;
  code: string;
  name: string;
  direction_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AnalyticsValueRow {
  id: string;
  type_id: string;
  code: string;
  name: string;
  attrs: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrgWebhookRow {
  org_id: string;
  url: string;
  secret: string;
  is_active: boolean;
  last_delivered_seq: number;
  fail_count: number;
  last_error: string | null;
  next_retry_at: Date;
  created_at: Date;
  updated_at: Date;
}

export async function listDirections() {
  const r = await pool.query(`SELECT * FROM directions ORDER BY name ASC`);
  return r.rows as DirectionRow[];
}

export async function createDirection(data: { code: string; name: string }) {
  const r = await pool.query(
    `INSERT INTO directions (code, name) VALUES ($1, $2) RETURNING *`,
    [data.code, data.name]
  );
  return (r.rows[0] ?? null) as DirectionRow | null;
}

export async function listAnalyticsTypes(filters?: { directionId?: string; search?: string; activeOnly?: boolean }) {
  let q = `SELECT * FROM analytics_types WHERE 1=1`;
  const p: any[] = [];
  let i = 1;

  if (filters?.directionId) {
    q += ` AND (direction_id = $${i++} OR direction_id IS NULL)`;
    p.push(filters.directionId);
  }
  if (filters?.activeOnly) {
    q += ` AND is_active = true`;
  }
  if (filters?.search && filters.search.trim()) {
    q += ` AND (code ILIKE $${i++} OR name ILIKE $${i++})`;
    const s = `%${filters.search.trim()}%`;
    p.push(s, s);
  }
  q += ` ORDER BY name ASC`;
  const r = await pool.query(q, p);
  return r.rows as AnalyticsTypeRow[];
}

export async function getAnalyticsTypeByCode(code: string) {
  const r = await pool.query(`SELECT * FROM analytics_types WHERE code = $1`, [code]);
  return (r.rows[0] ?? null) as AnalyticsTypeRow | null;
}

export async function createAnalyticsType(data: {
  code: string;
  name: string;
  directionId?: string | null;
  isActive?: boolean;
}) {
  const r = await pool.query(
    `INSERT INTO analytics_types (code, name, direction_id, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.code, data.name, data.directionId ?? null, data.isActive ?? true]
  );
  return (r.rows[0] ?? null) as AnalyticsTypeRow | null;
}

export async function updateAnalyticsType(id: string, updates: Partial<Pick<AnalyticsTypeRow, 'name' | 'direction_id' | 'is_active'>>) {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (updates.name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(updates.name);
  }
  if (updates.direction_id !== undefined) {
    fields.push(`direction_id = $${i++}`);
    values.push(updates.direction_id);
  }
  if (updates.is_active !== undefined) {
    fields.push(`is_active = $${i++}`);
    values.push(updates.is_active);
  }
  if (fields.length === 0) {
    const r0 = await pool.query(`SELECT * FROM analytics_types WHERE id = $1`, [id]);
    return (r0.rows[0] ?? null) as AnalyticsTypeRow | null;
  }
  values.push(id);
  const r = await pool.query(
    `UPDATE analytics_types SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return (r.rows[0] ?? null) as AnalyticsTypeRow | null;
}

/**
 * Upsert значения аналитики + запись события для webhook.
 * Делаем в транзакции, чтобы событие не оторвалось от данных.
 */
export async function upsertAnalyticsValue(data: {
  typeId: string;
  typeCode: string;
  code: string;
  name: string;
  attrs?: Record<string, unknown>;
  isActive?: boolean;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const valueRes = await client.query(
      `INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (type_id, code)
       DO UPDATE SET name = EXCLUDED.name,
                    attrs = EXCLUDED.attrs,
                    is_active = EXCLUDED.is_active,
                    updated_at = now()
       RETURNING *`,
      [
        data.typeId,
        data.code,
        data.name,
        JSON.stringify(data.attrs ?? {}),
        data.isActive ?? true
      ]
    );
    const value = valueRes.rows[0] as AnalyticsValueRow;

    const eventType = value.is_active ? 'Upsert' : 'Deactivate';
    const payload = {
      eventType,
      typeCode: data.typeCode,
      value: {
        id: value.id,
        code: value.code,
        name: value.name,
        attrs: value.attrs ?? {},
        isActive: value.is_active,
        updatedAt: value.updated_at
      }
    };

    await client.query(
      `INSERT INTO analytics_events (event_type, type_id, value_id, payload)
       VALUES ($1, $2, $3, $4)`,
      [eventType, data.typeId, value.id, JSON.stringify(payload)]
    );

    await client.query('COMMIT');
    return value;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function listSubscribedValues(params: {
  orgId: string;
  typeCode: string;
  search?: string;
  organizationId?: string;
  counterpartyId?: string;
  type?: string;
  limit?: number;
  cursorUpdatedAt?: string;
  cursorId?: string;
  activeOnly?: boolean;
}) {
  const type = await getAnalyticsTypeByCode(params.typeCode);
  if (!type) return { type: null, rows: [] as AnalyticsValueRow[] };

  // Проверяем, что тип подписан
  const subRes = await pool.query(
    `SELECT 1 FROM org_analytics_subscriptions
     WHERE org_id = $1 AND type_id = $2 AND is_enabled = true`,
    [params.orgId, type.id]
  );
  if (!subRes.rowCount) return { type, rows: [] as AnalyticsValueRow[] };

  const typeCode = String(type.code || '').toUpperCase();

  /**
   * Вариант B: единый источник /analytics/values
   * Для ряда типов (CONTRACT/WAREHOUSE/ACCOUNT/...) значения берём из НСИ таблиц,
   * а не из analytics_values. Для остальных — оставляем MDM analytics_values.
   */
  const NSI_TYPES = new Set([
    'ORG',
    'COUNTERPARTY',
    'CONTRACT',
    'WAREHOUSE',
    'ACCOUNT',
    'BANK_ACCOUNT',
    'DEPARTMENT',
    'ACCOUNTING_ACCOUNT',
  ]);

  const limit = Math.min(Math.max(params.limit ?? 100, 1), 1000);

  if (NSI_TYPES.has(typeCode)) {
    const p: any[] = [];
    let i = 1;
    const where: string[] = [];

    // keyset pagination
    if (params.cursorUpdatedAt && params.cursorId) {
      where.push(`(x.updated_at, x.id) > ($${i++}::timestamptz, $${i++}::uuid)`);
      p.push(params.cursorUpdatedAt, params.cursorId);
    }

    // search
    if (params.search && params.search.trim()) {
      where.push(`(x.code ILIKE $${i} OR x.name ILIKE $${i + 1})`);
      const s = `%${params.search.trim()}%`;
      p.push(s, s);
      i += 2;
    }

    // type-specific filters (organizationId/counterpartyId/type)
    const orgFilter = params.organizationId ?? null;
    const cpFilter = params.counterpartyId ?? null;
    const accTypeFilter = params.type ?? null;

    let baseSql = '';

    if (typeCode === 'ORG') {
      // organizations: id, code, name, inn
      baseSql = `
        SELECT
          o.id,
          COALESCE(o.code, o.id::text) AS code,
          o.name,
          jsonb_build_object('inn', o.inn) AS attrs,
          true AS is_active,
          o.updated_at
        FROM organizations o
      `;
    } else if (typeCode === 'COUNTERPARTY') {
      baseSql = `
        SELECT
          cp.id,
          COALESCE(cp.inn, cp.id::text) AS code,
          cp.name,
          (COALESCE(cp.data, '{}'::jsonb) || jsonb_build_object('inn', cp.inn)) AS attrs,
          true AS is_active,
          cp.updated_at
        FROM counterparties cp
      `;
    } else if (typeCode === 'CONTRACT') {
      // contracts: filterable by organization/counterparty
      if (orgFilter) {
        where.push(`x.organization_id = $${i++}::uuid`);
        p.push(orgFilter);
      }
      if (cpFilter) {
        where.push(`x.counterparty_id = $${i++}::uuid`);
        p.push(cpFilter);
      }
      baseSql = `
        SELECT
          c.id,
          COALESCE(c.data->>'code', c.data->>'number', c.id::text) AS code,
          c.name,
          (
            COALESCE(c.data, '{}'::jsonb)
            || jsonb_build_object(
              'organizationId', c.organization_id,
              'organizationName', o.name,
              'counterpartyId', c.counterparty_id,
              'counterpartyName', cp.name
            )
          ) AS attrs,
          true AS is_active,
          c.updated_at,
          c.organization_id,
          c.counterparty_id
        FROM contracts c
        LEFT JOIN organizations o ON o.id = c.organization_id
        LEFT JOIN counterparties cp ON cp.id = c.counterparty_id
      `;
    } else if (typeCode === 'WAREHOUSE') {
      if (orgFilter) {
        where.push(`x.organization_id = $${i++}::uuid`);
        p.push(orgFilter);
      }
      baseSql = `
        SELECT
          w.id,
          COALESCE(w.code, w.id::text) AS code,
          w.name,
          (
            COALESCE(w.data, '{}'::jsonb)
            || jsonb_build_object(
              'organizationId', w.organization_id,
              'organizationName', o.name
            )
          ) AS attrs,
          true AS is_active,
          w.updated_at,
          w.organization_id
        FROM warehouses w
        LEFT JOIN organizations o ON o.id = w.organization_id
      `;
    } else if (typeCode === 'ACCOUNT' || typeCode === 'BANK_ACCOUNT') {
      if (orgFilter) {
        where.push(`x.organization_id = $${i++}::uuid`);
        p.push(orgFilter);
      }
      if (accTypeFilter) {
        where.push(`x.type = $${i++}`);
        p.push(accTypeFilter);
      }
      baseSql = `
        SELECT
          a.id,
          COALESCE(a.code, a.id::text) AS code,
          a.name,
          (
            COALESCE(a.data, '{}'::jsonb)
            || jsonb_build_object(
              'organizationId', a.organization_id,
              'organizationName', o.name,
              'type', a.type
            )
          ) AS attrs,
          true AS is_active,
          a.updated_at,
          a.organization_id,
          a.type
        FROM accounts a
        LEFT JOIN organizations o ON o.id = a.organization_id
      `;
    } else if (typeCode === 'DEPARTMENT') {
      if (orgFilter) {
        where.push(`x.organization_id = $${i++}::uuid`);
        p.push(orgFilter);
      }
      baseSql = `
        SELECT
          d.id,
          COALESCE(d.code, d.id::text) AS code,
          d.name,
          (
            COALESCE(d.data, '{}'::jsonb)
            || jsonb_build_object(
              'organizationId', d.organization_id,
              'organizationName', o.name
            )
          ) AS attrs,
          true AS is_active,
          d.updated_at,
          d.organization_id
        FROM organization_divisions d
        LEFT JOIN organizations o ON o.id = d.organization_id
      `;
    } else if (typeCode === 'ACCOUNTING_ACCOUNT') {
      baseSql = `
        SELECT
          aa.id,
          COALESCE(aa.code, aa.id::text) AS code,
          aa.name,
          COALESCE(aa.data, '{}'::jsonb) AS attrs,
          true AS is_active,
          aa.updated_at
        FROM accounting_accounts aa
      `;
    }

    // оборачиваем базовый запрос, чтобы унифицировать where/order по алиасу x
    const q = `
      SELECT x.id, x.code, x.name, x.attrs, x.is_active, x.updated_at
      FROM (${baseSql}) x
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY x.updated_at ASC, x.id ASC
      LIMIT $${i++}
    `;
    p.push(limit);

    const r = await pool.query(q, p);
    return { type, rows: r.rows as AnalyticsValueRow[] };
  }

  // MDM: analytics_values
  let q = `SELECT * FROM analytics_values WHERE type_id = $1`;
  const p: any[] = [type.id];
  let i = 2;

  if (params.activeOnly) {
    q += ` AND is_active = true`;
  }
  if (params.search && params.search.trim()) {
    q += ` AND (code ILIKE $${i++} OR name ILIKE $${i++})`;
    const s = `%${params.search.trim()}%`;
    p.push(s, s);
  }
  if (params.cursorUpdatedAt && params.cursorId) {
    q += ` AND (updated_at, id) > ($${i++}::timestamptz, $${i++}::uuid)`;
    p.push(params.cursorUpdatedAt, params.cursorId);
  }

  q += ` ORDER BY updated_at ASC, id ASC`;
  q += ` LIMIT $${i++}`;
  p.push(limit);

  const r = await pool.query(q, p);
  return { type, rows: r.rows as AnalyticsValueRow[] };
}

export async function setSubscription(orgId: string, typeId: string, isEnabled: boolean) {
  const r = await pool.query(
    `INSERT INTO org_analytics_subscriptions (org_id, type_id, is_enabled)
     VALUES ($1, $2, $3)
     ON CONFLICT (org_id, type_id)
     DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = now()
     RETURNING *`,
    [orgId, typeId, isEnabled]
  );
  return r.rows[0] ?? null;
}

export async function listOrgSubscriptions(orgId: string) {
  const r = await pool.query(
    `SELECT s.org_id, s.type_id, s.is_enabled, t.code as type_code, t.name as type_name
     FROM org_analytics_subscriptions s
     JOIN analytics_types t ON t.id = s.type_id
     WHERE s.org_id = $1
     ORDER BY t.name ASC`,
    [orgId]
  );
  return r.rows as Array<{ org_id: string; type_id: string; is_enabled: boolean; type_code: string; type_name: string }>;
}

export async function getEnabledTypeCodesForOrg(orgId: string): Promise<Set<string>> {
  const r = await pool.query(
    `SELECT t.code
     FROM org_analytics_subscriptions s
     JOIN analytics_types t ON t.id = s.type_id
     WHERE s.org_id = $1 AND s.is_enabled = true`,
    [orgId]
  );
  const set = new Set<string>();
  for (const row of r.rows as Array<{ code: string }>) {
    if (row?.code) set.add(String(row.code).toUpperCase());
  }
  return set;
}

export async function upsertOrgWebhook(data: {
  orgId: string;
  url: string;
  secret: string;
  isActive?: boolean;
}) {
  const r = await pool.query(
    `INSERT INTO org_webhooks (org_id, url, secret, is_active)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (org_id)
     DO UPDATE SET url = EXCLUDED.url,
                   secret = EXCLUDED.secret,
                   is_active = EXCLUDED.is_active,
                   updated_at = now()
     RETURNING *`,
    [data.orgId, data.url, data.secret, data.isActive ?? true]
  );
  return (r.rows[0] ?? null) as OrgWebhookRow | null;
}

export async function getOrgWebhook(orgId: string) {
  const r = await pool.query(`SELECT * FROM org_webhooks WHERE org_id = $1`, [orgId]);
  return (r.rows[0] ?? null) as OrgWebhookRow | null;
}

export async function createResyncJobsForOrg(orgId: string, typeIds: string[]) {
  if (typeIds.length === 0) return 0;
  const r = await pool.query(
    `INSERT INTO analytics_resync_jobs (org_id, type_id, status)
     SELECT $1, x.type_id, 'Pending'
     FROM UNNEST($2::uuid[]) AS x(type_id)
     ON CONFLICT DO NOTHING`,
    [orgId, typeIds]
  );
  return r.rowCount ?? 0;
}

