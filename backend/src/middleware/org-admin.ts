// Middleware для проверки прав администратора организации

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AuthUser } from './auth.js';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware для проверки прав администратора организации
 * Пользователь должен быть либо ecof_admin (администратор ЕЦОФ), либо org_admin (администратор организации)
 * и принадлежать к организации
 */
export function requireOrgAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      logger.warn('Org admin access denied: no user in request', { path: req.path });
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Требуется аутентификация' 
      });
    }

    const userRole = req.user.role || 'employee';
    const orgId = req.user.organizationId;

    // Администратор ЕЦОФ имеет полный доступ
    if (userRole === 'ecof_admin') {
      logger.debug('ECOF admin access granted', { 
        userId: req.user.id,
        username: req.user.username,
        path: req.path 
      });
      return next();
    }

    // Администратор организации должен быть привязан к организации
    if (userRole === 'org_admin') {
      if (!orgId) {
        logger.warn('Org admin access denied: no organization', { 
          userId: req.user.id,
          username: req.user.username,
          path: req.path 
        });
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Администратор организации должен быть привязан к организации' 
        });
      }
      logger.debug('Org admin access granted', { 
        userId: req.user.id,
        username: req.user.username,
        orgId,
        path: req.path 
      });
      return next();
    }

    logger.warn('Org admin access denied: insufficient permissions', { 
      userId: req.user.id,
      username: req.user.username,
      role: userRole,
      path: req.path 
    });
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Недостаточно прав для выполнения операции. Требуется роль администратора организации или ЕЦОФ.' 
    });
  } catch (error) {
    logger.error('Error in org admin middleware', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Ошибка проверки прав доступа' 
    });
  }
}
