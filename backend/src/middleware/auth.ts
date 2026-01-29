import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  organizationId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: { message: 'Access token required' } });
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  
  try {
    const decoded = jwt.verify(token, secret) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: { message: 'Invalid or expired token' } });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Insufficient permissions' } });
    }

    next();
  };
}
