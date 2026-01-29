import { Router } from 'express';
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  freezeDocumentVersion,
  cancelDocument,
  deleteDocument,
  changeDocumentStatus,
  getDocumentStatusTransitions,
  addDocumentCheck
} from '../controllers/documents.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  freezeDocumentSchema,
  listDocumentsSchema,
  createDocumentCheckSchema
} from '../validators/documents.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';

export const documentsRouter = Router();

// Применяем аутентификацию ко всем роутам документов
documentsRouter.use(authenticateToken);

const documentIdSchema = z.object({
  id: z.string().uuid('Invalid document ID format')
});

const changeStatusSchema = z.object({
  // Полный список статусов портала. Валидация перехода всё равно делается в controller/service.
  status: z.enum([
    'Draft',
    'Validated',
    'Frozen',
    'QueuedToUH',
    'SentToUH',
    'AcceptedByUH',
    'PostedInUH',
    'RejectedByUH',
    'Cancelled'
  ])
});

documentsRouter.get('/', validateQuery(listDocumentsSchema), getDocuments);
documentsRouter.get('/:id', validateParams(documentIdSchema), getDocumentById);
documentsRouter.get('/:id/status/transitions', validateParams(documentIdSchema), getDocumentStatusTransitions);
documentsRouter.post('/', validate(createDocumentSchema), createDocument);
documentsRouter.put('/:id', validateParams(documentIdSchema), validate(updateDocumentSchema), updateDocument);
documentsRouter.post('/:id/freeze', validateParams(documentIdSchema), freezeDocumentVersion);
documentsRouter.post('/:id/cancel', validateParams(documentIdSchema), cancelDocument);
documentsRouter.delete('/:id', validateParams(documentIdSchema), deleteDocument);
documentsRouter.post('/:id/status', validateParams(documentIdSchema), validate(changeStatusSchema), changeDocumentStatus);
documentsRouter.post('/:id/checks', validateParams(documentIdSchema), validate(createDocumentCheckSchema), addDocumentCheck);