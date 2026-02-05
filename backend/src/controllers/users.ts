import { Request, Response, NextFunction } from 'express';
import * as usersRepo from '../repositories/users.js';
import { logger } from '../utils/logger.js';

// Helper для безопасного получения параметров из req.params
function getParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

/**
 * Получить список всех пользователей (для администратора ЕЦОФ)
 */
export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.query.organizationId as string | undefined;
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await usersRepo.getAllUsers({
      organizationId,
      role,
      search,
      limit,
      offset,
    });

    res.json({
      data: result.users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        organizationId: u.organization_id,
        organizationName: u.organization_name,
        isActive: u.is_active,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      })),
      pagination: {
        total: result.total,
        limit,
        offset,
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Получить пользователя по ID
 */
export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const user = await usersRepo.getUserById(id);

    if (!user) {
      return res.status(404).json({ error: { message: 'Пользователь не найден' } });
    }

    res.json({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Создать нового пользователя
 */
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password, role, organizationId } = req.body;

    // Проверяем, что пользователь с таким username не существует
    const { pool } = await import('../db/connection.js');
    const usernameCheck = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({
        error: { message: 'Пользователь с таким именем уже существует' },
      });
    }

    // Проверяем email, если указан
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email IS NOT NULL AND LOWER(email) = LOWER($1)',
        [email]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          error: { message: 'Пользователь с таким email уже существует' },
        });
      }
    }

    const user = await usersRepo.createUser({
      username,
      email: email || null,
      password,
      role,
      organizationId: organizationId || null,
    });

    logger.info('User created by admin', {
      userId: user.id,
      username: user.username,
      createdBy: (req as any).user?.id,
    });

    res.status(201).json({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (e: any) {
    if (e.message === 'Пользователь не найден') {
      return res.status(404).json({ error: { message: e.message } });
    }
    next(e);
  }
}

/**
 * Обновить пользователя
 */
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const { username, email, role, organizationId, isActive } = req.body;

    // Проверяем, что пользователь существует
    const existingUser = await usersRepo.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: { message: 'Пользователь не найден' } });
    }

    // Проверяем уникальность username, если он изменяется
    if (username && username !== existingUser.username) {
      const { pool } = await import('../db/connection.js');
      const usernameCheck = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username, id]
      );
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({
          error: { message: 'Пользователь с таким именем уже существует' },
        });
      }
    }

    // Проверяем уникальность email, если он изменяется
    if (email !== undefined && email !== existingUser.email) {
      if (email) {
        const { pool } = await import('../db/connection.js');
        const emailCheck = await pool.query(
          'SELECT id FROM users WHERE email IS NOT NULL AND LOWER(email) = LOWER($1) AND id != $2',
          [email, id]
        );
        if (emailCheck.rows.length > 0) {
          return res.status(400).json({
            error: { message: 'Пользователь с таким email уже существует' },
          });
        }
      }
    }

    const user = await usersRepo.updateUser(id, {
      username,
      email: email !== undefined ? email : undefined,
      role,
      organizationId: organizationId !== undefined ? organizationId : undefined,
      isActive,
    });

    logger.info('User updated by admin', {
      userId: user.id,
      username: user.username,
      updatedBy: (req as any).user?.id,
    });

    res.json({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (e: any) {
    if (e.message === 'Пользователь не найден') {
      return res.status(404).json({ error: { message: e.message } });
    }
    next(e);
  }
}

/**
 * Изменить пароль пользователя
 */
export async function updateUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const { password } = req.body;

    const existingUser = await usersRepo.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: { message: 'Пользователь не найден' } });
    }

    await usersRepo.updateUserPassword(id, password);

    logger.info('User password updated by admin', {
      userId: id,
      username: existingUser.username,
      updatedBy: (req as any).user?.id,
    });

    res.json({ data: { success: true } });
  } catch (e: any) {
    next(e);
  }
}

/**
 * Удалить пользователя (мягкое удаление)
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');

    const existingUser = await usersRepo.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: { message: 'Пользователь не найден' } });
    }

    await usersRepo.deleteUser(id);

    logger.info('User deleted by admin', {
      userId: id,
      username: existingUser.username,
      deletedBy: (req as any).user?.id,
    });

    res.json({ data: { success: true } });
  } catch (e: any) {
    next(e);
  }
}
