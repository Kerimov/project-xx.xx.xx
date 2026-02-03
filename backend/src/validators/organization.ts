import { z } from 'zod';

export const assignEmployeeSchema = z.object({
  userId: z.string().uuid('Некорректный ID пользователя'),
});

export const updateEmployeeRoleSchema = z.object({
  role: z.enum(['user', 'ecof_user', 'company_user', 'ecof_admin', 'admin'], {
    errorMap: () => ({ message: 'Некорректная роль' }),
  }),
});

export const searchUsersSchema = z.object({
  query: z.string().min(1, 'Введите поисковый запрос'),
});
