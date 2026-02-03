import { z } from 'zod';

export const listAnalyticsTypesSchema = z.object({
  search: z.string().optional()
});

export const setSubscriptionSchema = z.object({
  typeId: z.string().uuid(),
  isEnabled: z.boolean()
});

export const listSubscribedValuesSchema = z.object({
  typeCode: z.string().min(1),
  search: z.string().optional(),
  // Доп. фильтры для НСИ-аналитик (вариант B: единый /analytics/values)
  organizationId: z.string().uuid().optional(),
  counterpartyId: z.string().uuid().optional(),
  // Например, для счетов: расчетный/валютный/касса и т.п.
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  cursorUpdatedAt: z.string().optional(),
  cursorId: z.string().uuid().optional(),
  activeOnly: z.enum(['true', 'false']).optional()
});

export const upsertWebhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(8),
  isActive: z.boolean().optional()
});

// ADMIN
export const adminCreateAnalyticsTypeSchema = z.object({
  code: z.string().min(2).max(100).regex(/^[A-Z0-9_]+$/, 'code должен быть в формате A-Z0-9_'),
  name: z.string().min(1).max(255),
  directionId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional()
});

export const adminUpdateAnalyticsTypeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  directionId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional()
});

export const adminUpsertAnalyticsValueSchema = z.object({
  typeCode: z.string().min(2).max(100),
  code: z.string().min(1).max(150),
  name: z.string().min(1).max(500),
  attrs: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional()
});

