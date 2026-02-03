import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3, 'Имя пользователя должно быть не менее 3 символов').max(100, 'Имя пользователя слишком длинное'),
  email: z.string().email('Некорректный email').optional().nullable(),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
  role: z.enum(['employee', 'org_admin', 'ecof_admin'], {
    errorMap: () => ({ message: 'Некорректная роль' }),
  }),
  organizationId: z.string().uuid('Некорректный ID организации').optional().nullable(),
});

export const updateUserSchema = z.object({
  username: z.string().min(3, 'Имя пользователя должно быть не менее 3 символов').max(100, 'Имя пользователя слишком длинное').optional(),
  email: z.string().email('Некорректный email').optional().nullable(),
  role: z.enum(['employee', 'org_admin', 'ecof_admin'], {
    errorMap: () => ({ message: 'Некорректная роль' }),
  }).optional(),
  organizationId: z.string().uuid('Некорректный ID организации').optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateUserPasswordSchema = z.object({
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
});

export const listUsersSchema = z.object({
  organizationId: z.string().uuid().optional(),
  role: z.enum(['employee', 'org_admin', 'ecof_admin']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
