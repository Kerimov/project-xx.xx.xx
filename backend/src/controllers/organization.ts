import { Request, Response, NextFunction } from 'express';
import * as orgRepo from '../repositories/organization.js';
import { logger } from '../utils/logger.js';

function getOrgId(req: Request): string | null {
  return (req as any).user?.organizationId ?? null;
}

/**
 * Получить информацию об организации текущего пользователя
 */
export async function getMyOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    }

    const org = await orgRepo.getOrganizationById(orgId);
    if (!org) {
      return res.status(404).json({ error: { message: 'Организация не найдена' } });
    }

    res.json({
      data: {
        id: org.id,
        code: org.code,
        name: org.name,
        inn: org.inn,
        directionId: org.direction_id,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Получить список сотрудников организации
 */
export async function getMyEmployees(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    }

    const employees = await orgRepo.getOrganizationEmployees(orgId);
    res.json({
      data: employees.map((e) => ({
        id: e.id,
        username: e.username,
        email: e.email,
        role: e.role,
        organizationId: e.organization_id,
        isActive: e.is_active,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      })),
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Найти пользователей для добавления в организацию
 */
export async function searchUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    }

    const query = (req.query.query as string) || '';
    if (!query || query.length < 1) {
      return res.json({ data: [] });
    }

    const users = await orgRepo.searchUsers(query, orgId);
    res.json({
      data: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        organizationId: u.organization_id,
        organizationName: null, // Можно добавить JOIN если нужно
      })),
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Привязать сотрудника к организации
 */
export async function assignEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    }

    const { userId } = req.body;

    // Проверяем, что пользователь существует
    const user = await orgRepo.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: { message: 'Пользователь не найден' } });
    }

    // Проверяем, что пользователь не привязан к другой организации
    if (user.organization_id && user.organization_id !== orgId) {
      return res.status(400).json({
        error: { message: 'Пользователь уже привязан к другой организации' },
      });
    }

    const updated = await orgRepo.assignUserToOrganization(userId, orgId);

    logger.info('Employee assigned to organization', {
      userId,
      orgId,
      assignedBy: (req as any).user?.id,
    });

    res.json({
      data: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        organizationId: updated.organization_id,
        isActive: updated.is_active,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
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
 * Обновить роль сотрудника
 */
export async function updateEmployeeRole(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    }

    const { id: userId } = req.params;
    const { role } = req.body;

    // Проверяем, что пользователь принадлежит организации
    const user = await orgRepo.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: { message: 'Пользователь не найден' } });
    }

    if (user.organization_id !== orgId) {
      return res.status(403).json({
        error: { message: 'Пользователь не принадлежит вашей организации' },
      });
    }

    // Не позволяем изменять роль админов
    if (['ecof_admin', 'admin'].includes(user.role)) {
      return res.status(403).json({
        error: { message: 'Нельзя изменить роль администратора' },
      });
    }

    const updated = await orgRepo.updateUserRole(userId, role);

    logger.info('Employee role updated', {
      userId,
      orgId,
      newRole: role,
      updatedBy: (req as any).user?.id,
    });

    res.json({
      data: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        organizationId: updated.organization_id,
        isActive: updated.is_active,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
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
 * Отвязать сотрудника от организации
 */
export async function unassignEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    }

    const { id: userId } = req.params;

    // Проверяем, что пользователь принадлежит организации
    const user = await orgRepo.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: { message: 'Пользователь не найден' } });
    }

    if (user.organization_id !== orgId) {
      return res.status(403).json({
        error: { message: 'Пользователь не принадлежит вашей организации' },
      });
    }

    // Не позволяем отвязывать админов
    if (['ecof_admin', 'admin'].includes(user.role)) {
      return res.status(403).json({
        error: { message: 'Нельзя отвязать администратора от организации' },
      });
    }

    await orgRepo.unassignUserFromOrganization(userId);

    logger.info('Employee unassigned from organization', {
      userId,
      orgId,
      unassignedBy: (req as any).user?.id,
    });

    res.json({ data: { success: true } });
  } catch (e: any) {
    next(e);
  }
}
