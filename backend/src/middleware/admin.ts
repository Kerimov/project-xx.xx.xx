// Middleware для проверки прав администратора

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AuthUser } from './auth.js';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware для проверки прав администратора ЕЦОФ
 * Только пользователи с ролью 'ecof_admin' имеют доступ
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

    // Проверяем роль администратора ЕЦОФ
    const userRole = req.user.role || 'employee';
    
    if (userRole !== 'ecof_admin') {
      logger.warn('Admin access denied: insufficient permissions', { 
        userId: req.user.id,
        username: req.user.username,
        role: userRole,
        path: req.path 
      });
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Недостаточно прав для выполнения операции. Требуется роль администратора ЕЦОФ.' 
      });
    }

    logger.debug('ECOF admin access granted', { 
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
