// Валидация документов через Zod

import { z } from 'zod';

// Базовые схемы
const uuidSchema = z.string().uuid('Invalid UUID format');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
const nonEmptyString = z.string().min(1, 'Field cannot be empty');

// Схема для товарной позиции
const documentItemSchema = z.object({
  rowNumber: z.number().int().positive().optional(),
  nomenclatureName: z.string().optional(),
  name: z.string().optional(),
  quantity: z.number().nonnegative().default(0),
  unit: z.string().optional(),
  price: z.number().nonnegative().default(0),
  amount: z.number().nonnegative().default(0),
  vatPercent: z.number().min(0).max(100).default(20),
  vatAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().nonnegative().default(0),
  accountId: uuidSchema.optional().nullable(),
  countryOfOrigin: z.string().optional().nullable(),
  type: z.enum(['goods', 'services', 'commission']).optional()
}).passthrough(); // Разрешаем дополнительные поля

// Базовая схема создания документа
export const createDocumentSchema = z.object({
  packageId: uuidSchema.optional().nullable(),
  number: nonEmptyString,
  date: dateSchema,
  type: nonEmptyString,
  organizationId: uuidSchema,
  counterpartyName: z.string().optional().nullable(),
  counterpartyInn: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  currency: z.string().length(3).default('RUB'),
  contractId: uuidSchema.optional().nullable(),
  paymentAccountId: uuidSchema.optional().nullable(),
  warehouseId: uuidSchema.optional().nullable(),
  hasDiscrepancies: z.boolean().default(false),
  originalReceived: z.boolean().default(false),
  isUPD: z.boolean().default(false),
  invoiceRequired: z.boolean().default(false),
  items: z.array(documentItemSchema).default([]),
  totalAmount: z.number().nonnegative().default(0),
  totalVAT: z.number().nonnegative().default(0),
  portalStatus: z.enum(['Draft', 'Validated', 'Frozen', 'QueuedToUH', 'SentToUH']).default('Draft'),
  // Дополнительные поля для разных типов документов
  dueDate: dateSchema.optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  documentNumber: z.string().optional().nullable()
}).passthrough();

// Схема обновления документа
export const updateDocumentSchema = createDocumentSchema.partial();

// Схема для заморозки документа
export const freezeDocumentSchema = z.object({
  id: uuidSchema
});

// Схема для получения списка документов
export const listDocumentsSchema = z.object({
  packageId: uuidSchema.optional(),
  organizationId: uuidSchema.optional(),
  portalStatus: z.enum(['Draft', 'Validated', 'Frozen', 'QueuedToUH', 'SentToUH']).optional(),
  uhStatus: z.enum(['None', 'Accepted', 'Posted', 'Error']).optional(),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().nonnegative().default(0)
});

// Типы для TypeScript
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type FreezeDocumentInput = z.infer<typeof freezeDocumentSchema>;
export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>;
