// Роуты для работы с файлами

import { Router } from 'express';
import {
  uploadFile,
  getDocumentFiles,
  downloadFile,
  deleteFile
} from '../controllers/files.js';
import { uploadSingle } from '../middleware/upload.js';
import { validateParams } from '../middleware/validate.js';
import { z } from 'zod';

export const filesRouter = Router();

const fileIdSchema = z.object({
  fileId: z.string().uuid('Invalid file ID format')
});

const documentIdSchema = z.object({
  documentId: z.string().uuid('Invalid document ID format')
});

// Загрузка файла к документу
filesRouter.post('/documents/:documentId/files', validateParams(documentIdSchema), uploadSingle, uploadFile);

// Получение списка файлов документа
filesRouter.get('/documents/:documentId/files', validateParams(documentIdSchema), getDocumentFiles);

// Скачивание файла
filesRouter.get('/files/:fileId', validateParams(fileIdSchema), downloadFile);

// Удаление файла
filesRouter.delete('/files/:fileId', validateParams(fileIdSchema), deleteFile);
