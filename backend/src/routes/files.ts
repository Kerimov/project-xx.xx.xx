// Роуты для работы с файлами

import { Router, Request, Response, NextFunction } from 'express';
import {
  uploadFile,
  getDocumentFiles,
  downloadFile,
  deleteFile
} from '../controllers/files.js';
import {
  uploadObjectCardFile,
  getObjectCardFiles,
  downloadObjectCardFile,
  deleteObjectCardFile
} from '../controllers/object-files.js';
import { uploadSingle } from '../middleware/upload.js';
import { validateParams } from '../middleware/validate.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
import multer from 'multer';

export const filesRouter = Router();

// Применяем аутентификацию ко всем роутам файлов
filesRouter.use(authenticateToken);

const fileIdSchema = z.object({
  fileId: z.string().uuid('Invalid file ID format')
});

const documentIdSchema = z.object({
  documentId: z.string().uuid('Invalid document ID format')
});

// Middleware для обработки ошибок multer (должен быть после uploadSingle)
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: { message: `Размер файла превышает допустимый лимит (${process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) / 1024 / 1024 : 50} МБ)` }
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: { message: 'Превышено максимальное количество файлов' }
      });
    }
    return res.status(400).json({ 
      error: { message: `Ошибка загрузки файла: ${err.message}` }
    });
  }
  if (err) {
    return res.status(400).json({ 
      error: { message: err.message || 'Ошибка загрузки файла' }
    });
  }
  next();
};

// Загрузка файла к документу
// Обработка ошибок multer должна быть после uploadSingle
filesRouter.post('/documents/:documentId/files', 
  validateParams(documentIdSchema), 
  (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadFile
);

// Получение списка файлов документа
filesRouter.get('/documents/:documentId/files', validateParams(documentIdSchema), getDocumentFiles);

// Скачивание файла
filesRouter.get('/files/:fileId', validateParams(fileIdSchema), downloadFile);

// Удаление файла
filesRouter.delete('/files/:fileId', validateParams(fileIdSchema), deleteFile);

// ========== Файлы карточек объектов учета ==========

const cardIdSchema = z.object({
  cardId: z.string().uuid('Invalid card ID format')
});

// Загрузка файла к карточке объекта
filesRouter.post(
  '/objects/cards/:cardId/files',
  validateParams(cardIdSchema),
  (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadObjectCardFile
);

// Получение списка файлов карточки объекта
filesRouter.get('/objects/cards/:cardId/files', validateParams(cardIdSchema), getObjectCardFiles);

// Скачивание файла карточки объекта
filesRouter.get('/objects/cards/files/:fileId', validateParams(fileIdSchema), downloadObjectCardFile);

// Удаление файла карточки объекта
filesRouter.delete('/objects/cards/files/:fileId', validateParams(fileIdSchema), deleteObjectCardFile);
