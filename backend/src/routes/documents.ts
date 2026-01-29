import { Router } from 'express';
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  freezeDocumentVersion,
  cancelDocument,
  changeDocumentStatus,
  getDocumentStatusTransitions
} from '../controllers/documents.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  freezeDocumentSchema,
  listDocumentsSchema
} from '../validators/documents.js';
import { z } from 'zod';

export const documentsRouter = Router();

const documentIdSchema = z.object({
  id: z.string().uuid('Invalid document ID format')
});

const changeStatusSchema = z.object({
  status: z.enum(['Draft', 'Validated', 'Frozen', 'Cancelled'])
});

documentsRouter.get('/', validateQuery(listDocumentsSchema), getDocuments);
documentsRouter.get('/:id', validateParams(documentIdSchema), getDocumentById);
documentsRouter.get('/:id/status/transitions', validateParams(documentIdSchema), getDocumentStatusTransitions);
documentsRouter.post('/', validate(createDocumentSchema), createDocument);
documentsRouter.put('/:id', validateParams(documentIdSchema), validate(updateDocumentSchema), updateDocument);
documentsRouter.post('/:id/freeze', validateParams(documentIdSchema), freezeDocumentVersion);
documentsRouter.post('/:id/cancel', validateParams(documentIdSchema), cancelDocument);
documentsRouter.post('/:id/status', validateParams(documentIdSchema), validate(changeStatusSchema), changeDocumentStatus);
