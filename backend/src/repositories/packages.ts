import { pool } from '../db/connection.js';

export interface PackageRow {
  id: string;
  name: string;
  organization_id: string | null;
  period: string;
  type: string | null;
  status: string;
  document_count: number;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

export async function getPackages(filters?: {
  organizationId?: string;
  status?: string;
  period?: string;
  limit?: number;
  offset?: number;
}) {
  let query = `
    SELECT p.*, o.name as organization_name
    FROM packages p
    LEFT JOIN organizations o ON p.organization_id = o.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.organizationId) {
    query += ` AND p.organization_id = $${paramIndex++}`;
    params.push(filters.organizationId);
  }
  if (filters?.status) {
    query += ` AND p.status = $${paramIndex++}`;
    params.push(filters.status);
  }
  if (filters?.period) {
    query += ` AND p.period = $${paramIndex++}`;
    params.push(filters.period);
  }

  query += ` ORDER BY p.created_at DESC`;

  if (filters?.limit) {
    query += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }
  }

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getPackageById(id: string) {
  const result = await pool.query(
    `SELECT p.*, o.name as organization_name
     FROM packages p
     LEFT JOIN organizations o ON p.organization_id = o.id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createPackage(data: {
  name: string;
  organizationId?: string;
  period: string;
  type?: string;
  createdBy?: string;
}) {
  const result = await pool.query(
    `INSERT INTO packages (name, organization_id, period, type, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.name,
      data.organizationId || null,
      data.period,
      data.type || null,
      'New',
      data.createdBy || null
    ]
  );
  return result.rows[0];
}

export async function updatePackage(id: string, updates: Partial<PackageRow>) {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) {
    return getPackageById(id);
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE packages SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}
