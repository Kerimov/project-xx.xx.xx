import { Router } from 'express';
import { getDocuments, getDocumentById, createDocument, updateDocument, freezeDocumentVersion } from '../controllers/documents.js';
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

documentsRouter.get('/', validateQuery(listDocumentsSchema), getDocuments);
documentsRouter.get('/:id', validateParams(documentIdSchema), getDocumentById);
documentsRouter.post('/', validate(createDocumentSchema), createDocument);
documentsRouter.put('/:id', validateParams(documentIdSchema), validate(updateDocumentSchema), updateDocument);
documentsRouter.post('/:id/freeze', validateParams(documentIdSchema), freezeDocumentVersion);
