// Middleware для проверки прав администратора

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AuthUser } from './auth.js';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware для проверки прав администратора
 * В текущей реализации проверяет наличие роли 'admin' в токене
 * В будущем можно расширить проверку через БД
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Проверяем наличие пользователя в запросе (должен быть установлен auth middleware)
    if (!req.user) {
      logger.warn('Admin access denied: no user in request', { path: req.path });
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Требуется аутентификация' 
      });
    }

    // Проверяем роль администратора
    // В текущей реализации используем простую проверку через роль
    // TODO: В будущем можно добавить проверку через БД или более сложную систему ролей
    const userRole = req.user.role || 'user';
    
    if (userRole !== 'admin') {
      logger.warn('Admin access denied: insufficient permissions', { 
        userId: req.user.id,
        username: req.user.username,
        role: userRole,
        path: req.path 
      });
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Недостаточно прав для выполнения операции' 
      });
    }

    logger.debug('Admin access granted', { 
      userId: req.user.id,
      username: req.user.username,
      path: req.path 
    });

    next();
  } catch (error) {
    logger.error('Error in admin middleware', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Ошибка проверки прав доступа' 
    });
  }
}
