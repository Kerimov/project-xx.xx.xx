import { pool } from '../db/connection.js';
import bcrypt from 'bcryptjs';

export interface UserRow {
  id: string;
  username: string;
  email: string | null;
  role: string;
  organization_id: string | null;
  organization_name: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  username: string;
  email?: string | null;
  password: string;
  role: string;
  organizationId?: string | null;
}

export interface UpdateUserData {
  username?: string;
  email?: string | null;
  role?: string;
  organizationId?: string | null;
  isActive?: boolean;
}

/**
 * Получить список всех пользователей с информацией об организациях
 */
export async function getAllUsers(params?: {
  organizationId?: string;
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ users: UserRow[]; total: number }> {
  let where: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (params?.organizationId) {
    where.push(`u.organization_id = $${paramIndex}`);
    queryParams.push(params.organizationId);
    paramIndex++;
  }

  if (params?.role) {
    where.push(`u.role = $${paramIndex}`);
    queryParams.push(params.role);
    paramIndex++;
  }

  if (params?.search) {
    where.push(`(u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
    queryParams.push(`%${params.search}%`);
    paramIndex++;
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  // Получаем общее количество
  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM users u
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, queryParams);
  const total = countResult.rows[0]?.total || 0;

  // Получаем пользователей с информацией об организациях
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;
  queryParams.push(limit, offset);

  const usersQuery = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.role,
      u.organization_id,
      o.name AS organization_name,
      u.is_active,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const result = await pool.query<UserRow>(usersQuery, queryParams);
  return { users: result.rows, total };
}

/**
 * Получить пользователя по ID с информацией об организации
 */
export async function getUserById(userId: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT 
      u.id,
      u.username,
      u.email,
      u.role,
      u.organization_id,
      o.name AS organization_name,
      u.is_active,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
    WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Создать нового пользователя
 */
export async function createUser(data: CreateUserData): Promise<UserRow> {
  const passwordHash = await bcrypt.hash(data.password, 10);

  const result = await pool.query<UserRow>(
    `INSERT INTO users (username, email, password_hash, role, organization_id, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, username, email, role, organization_id, is_active, created_at, updated_at`,
    [
      data.username,
      data.email || null,
      passwordHash,
      data.role,
      data.organizationId || null
    ]
  );

  const user = result.rows[0];
  
  // Получаем имя организации если есть
  if (user.organization_id) {
    const orgResult = await pool.query(
      'SELECT name FROM organizations WHERE id = $1',
      [user.organization_id]
    );
    return { ...user, organization_name: orgResult.rows[0]?.name || null };
  }

  return { ...user, organization_name: null };
}

/**
 * Обновить пользователя
 */
export async function updateUser(userId: string, data: UpdateUserData): Promise<UserRow> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (data.username !== undefined) {
    updates.push(`username = $${paramIndex}`);
    params.push(data.username);
    paramIndex++;
  }

  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex}`);
    params.push(data.email);
    paramIndex++;
  }

  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex}`);
    params.push(data.role);
    paramIndex++;
  }

  if (data.organizationId !== undefined) {
    updates.push(`organization_id = $${paramIndex}`);
    params.push(data.organizationId);
    paramIndex++;
  }

  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    params.push(data.isActive);
    paramIndex++;
  }

  if (updates.length === 0) {
    const user = await getUserById(userId);
    if (!user) throw new Error('Пользователь не найден');
    return user;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(userId);

  const result = await pool.query<UserRow>(
    `UPDATE users
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, username, email, role, organization_id, is_active, created_at, updated_at`,
    params
  );

  if (result.rows.length === 0) {
    throw new Error('Пользователь не найден');
  }

  const user = result.rows[0];
  
  // Получаем имя организации если есть
  if (user.organization_id) {
    const orgResult = await pool.query(
      'SELECT name FROM organizations WHERE id = $1',
      [user.organization_id]
    );
    return { ...user, organization_name: orgResult.rows[0]?.name || null };
  }

  return { ...user, organization_name: null };
}

/**
 * Изменить пароль пользователя
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users
     SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, userId]
  );
}

/**
 * Удалить пользователя (мягкое удаление - установка is_active = false)
 */
export async function deleteUser(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users
     SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [userId]
  );
}
