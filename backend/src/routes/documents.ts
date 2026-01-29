import { Router } from 'express';
import { getDocuments, getDocumentById, createDocument, updateDocument, freezeDocumentVersion } from '../controllers/documents.js';

export const documentsRouter = Router();

documentsRouter.get('/', getDocuments);
documentsRouter.get('/:id', getDocumentById);
documentsRouter.post('/', createDocument);
documentsRouter.put('/:id', updateDocument);
documentsRouter.post('/:id/freeze', freezeDocumentVersion);
