// Валидация аутентификации через Zod

import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(100, 'Username too long'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  passwordConfirm: z.string().min(1, 'Password confirmation is required'),
  organizationId: z.string().uuid('Invalid organization ID').optional().nullable(),
  role: z.enum(['employee', 'org_admin', 'ecof_admin']).default('employee')
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"]
});

export type RegisterInput = z.infer<typeof registerSchema>;
