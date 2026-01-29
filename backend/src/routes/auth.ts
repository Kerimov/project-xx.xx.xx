import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../db/connection.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

// Регистрация нового пользователя
authRouter.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { username, email, password, organizationId, role } = req.body;

    // Проверяем, существует ли пользователь с таким username
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        error: { message: 'Пользователь с таким именем уже существует' } 
      });
    }

    // Проверяем email, если указан
    if (email) {
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ 
          error: { message: 'Пользователь с таким email уже существует' } 
        });
      }
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, organization_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, username, email, role, organization_id, created_at`,
      [username, email || null, passwordHash, role || 'user', organizationId || null]
    );

    const user = result.rows[0];

    logger.info('User registered', { userId: user.id, username: user.username });

    // Генерируем токен
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

    res.status(201).json({
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organization_id
        }
      }
    });
  } catch (error: any) {
    logger.error('Registration error', error);
    res.status(500).json({ error: { message: 'Ошибка при регистрации: ' + (error.message || 'Неизвестная ошибка') } });
  }
});

// Вход в систему
authRouter.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT id, username, email, password_hash, role, organization_id FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: { message: 'Неверное имя пользователя или пароль' } });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: { message: 'Неверное имя пользователя или пароль' } });
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

    logger.info('User logged in', { userId: user.id, username: user.username });

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organization_id
        }
      }
    });
  } catch (error: any) {
    logger.error('Login error', error);
    res.status(500).json({ error: { message: 'Ошибка при входе: ' + (error.message || 'Неизвестная ошибка') } });
  }
});

// Получение информации о текущем пользователе (требует токен)
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: { message: 'Access token required' } });
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;

    const result = await pool.query(
      'SELECT id, username, email, role, organization_id FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
});
