import { z } from 'zod';

// Object Type schemas
export const createObjectTypeSchema = z.object({
  code: z.string().min(1).max(100).regex(/^[A-Z_][A-Z0-9_]*$/, 'Код должен быть в формате UPPER_SNAKE_CASE'),
  name: z.string().min(1).max(255),
  directionId: z.string().uuid().nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateObjectTypeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  directionId: z.string().uuid().nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional()
});

export const createObjectTypeSchemaFieldSchema = z.object({
  fieldKey: z.string().min(1).max(100).regex(/^[a-z][a-zA-Z0-9]*$/, 'Ключ поля должен быть в формате camelCase'),
  label: z.string().min(1).max(255),
  dataType: z.enum(['string', 'number', 'date', 'boolean', 'money', 'enum', 'reference', 'file', 'json']),
  fieldGroup: z.string().max(100).nullable().optional(),
  isRequired: z.boolean().optional().default(false),
  isUnique: z.boolean().optional().default(false),
  validationRules: z.record(z.unknown()).optional().default({}),
  defaultValue: z.unknown().nullable().optional(),
  referenceTypeId: z.string().uuid().nullable().optional(),
  enumValues: z.array(z.unknown()).nullable().optional(),
  displayOrder: z.number().int().optional().default(0)
});

export const updateObjectTypeSchemaFieldSchema = createObjectTypeSchemaFieldSchema.partial().extend({
  fieldKey: z.string().min(1).max(100).optional() // можно обновить без изменения ключа
});

// Object Card schemas
export const createObjectCardSchema = z.object({
  typeId: z.string().uuid(),
  code: z.string().min(1).max(150),
  name: z.string().min(1).max(500),
  organizationId: z.string().uuid().nullable().optional(),
  status: z.enum(['Active', 'Inactive', 'Archived']).optional().default('Active'),
  attrs: z.record(z.unknown()).optional().default({})
});

export const updateObjectCardSchema = z.object({
  code: z.string().min(1).max(150).optional(),
  name: z.string().min(1).max(500).optional(),
  organizationId: z.string().uuid().nullable().optional(),
  status: z.enum(['Active', 'Inactive', 'Archived']).optional(),
  attrs: z.record(z.unknown()).optional()
});

export const listObjectCardsSchema = z.object({
  typeId: z.string().uuid().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  status: z.enum(['Active', 'Inactive', 'Archived']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

export const setObjectSubscriptionSchema = z.object({
  typeId: z.string().uuid(),
  isEnabled: z.boolean()
});
