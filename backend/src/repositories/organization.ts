import { pool } from '../db/connection.js';

export interface EmployeeRow {
  id: string;
  username: string;
  email: string | null;
  role: string;
  organization_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationRow {
  id: string;
  code: string;
  name: string;
  inn: string | null;
  direction_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Получить информацию об организации по ID
 */
export async function getOrganizationById(orgId: string): Promise<OrganizationRow | null> {
  const result = await pool.query<OrganizationRow>(
    `SELECT id, code, name, inn, direction_id, created_at, updated_at
     FROM organizations
     WHERE id = $1`,
    [orgId]
  );
  return result.rows[0] || null;
}

/**
 * Получить список сотрудников организации
 */
export async function getOrganizationEmployees(orgId: string): Promise<EmployeeRow[]> {
  const result = await pool.query<EmployeeRow>(
    `SELECT id, username, email, role, organization_id, is_active, created_at, updated_at
     FROM users
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [orgId]
  );
  return result.rows;
}

/**
 * Получить пользователя по ID
 */
export async function getUserById(userId: string): Promise<EmployeeRow | null> {
  const result = await pool.query<EmployeeRow>(
    `SELECT id, username, email, role, organization_id, is_active, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Привязать пользователя к организации
 */
export async function assignUserToOrganization(
  userId: string,
  orgId: string
): Promise<EmployeeRow> {
  const result = await pool.query<EmployeeRow>(
    `UPDATE users
     SET organization_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, username, email, role, organization_id, is_active, created_at, updated_at`,
    [orgId, userId]
  );
  if (result.rows.length === 0) {
    throw new Error('Пользователь не найден');
  }
  return result.rows[0];
}

/**
 * Обновить роль пользователя
 */
export async function updateUserRole(
  userId: string,
  role: string
): Promise<EmployeeRow> {
  const result = await pool.query<EmployeeRow>(
    `UPDATE users
     SET role = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, username, email, role, organization_id, is_active, created_at, updated_at`,
    [role, userId]
  );
  if (result.rows.length === 0) {
    throw new Error('Пользователь не найден');
  }
  return result.rows[0];
}

/**
 * Отвязать пользователя от организации
 */
export async function unassignUserFromOrganization(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users
     SET organization_id = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Найти пользователей по username или email (для поиска при добавлении)
 */
export async function searchUsers(query: string, excludeOrgId?: string): Promise<EmployeeRow[]> {
  const searchPattern = `%${query}%`;
  let sql = `SELECT id, username, email, role, organization_id, is_active, created_at, updated_at
             FROM users
             WHERE (username ILIKE $1 OR email ILIKE $1)
             AND is_active = true`;
  const params: any[] = [searchPattern];
  
  if (excludeOrgId) {
    sql += ` AND (organization_id IS NULL OR organization_id != $2)`;
    params.push(excludeOrgId);
  }
  
  sql += ` ORDER BY username LIMIT 20`;
  
  const result = await pool.query<EmployeeRow>(sql, params);
  return result.rows;
}
