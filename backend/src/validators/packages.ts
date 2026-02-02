// Валидация пакетов через Zod

import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID format');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
const periodSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format');

export const createPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required').max(100),
  organizationId: uuidSchema.optional().nullable(),
  period: periodSchema,
  type: z.string().optional().nullable(),
  documentCount: z.number().int().nonnegative().default(0)
});

export const updatePackageSchema = createPackageSchema.partial().extend({
  id: uuidSchema,
  status: z.enum(['New', 'InProcessing', 'Done', 'Failed', 'PartiallyFailed']).optional()
});

export const listPackagesSchema = z.object({
  search: z.string().optional(),
  organizationId: uuidSchema.optional(),
  status: z.enum(['New', 'InProcessing', 'Done', 'Failed', 'PartiallyFailed']).optional(),
  period: periodSchema.optional(),
  type: z.string().optional(),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().nonnegative().default(0)
});

export const addDocumentsToPackageSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1, 'Укажите хотя бы один документ')
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
export type ListPackagesInput = z.infer<typeof listPackagesSchema>;
