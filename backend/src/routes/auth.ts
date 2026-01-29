import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../db/connection.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/auth.js';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    // Данные уже валидированы через middleware
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT id, username, password_hash, role, organization_id FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organization_id
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          organizationId: user.organization_id
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});
