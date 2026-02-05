// Контроллер для работы с файлами

import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import * as documentsRepo from '../repositories/documents.js';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Helper для безопасного получения параметров
function getParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

// Загрузка файла к документу
export async function uploadFile(req: Request, res: Response, next: NextFunction) {
  const documentId = getParam(req, 'documentId');
  try {
    const file = req.file;

    logger.info('File upload attempt', { documentId, fileName: file?.originalname, fileSize: file?.size, mimeType: file?.mimetype });

    if (!file) {
      logger.warn('No file uploaded', { documentId });
      return res.status(400).json({ error: { message: 'Файл не выбран' } });
    }

    // Проверяем ошибки multer
    if ((req as any).fileValidationError) {
      logger.warn('File validation error', { documentId, error: (req as any).fileValidationError });
      return res.status(400).json({ error: { message: (req as any).fileValidationError } });
    }

    // Проверяем существование документа
    const docResult = await pool.query('SELECT id FROM documents WHERE id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      logger.warn('Document not found', { documentId });
      // Удаляем загруженный файл, если документ не найден
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    // Вычисляем SHA-256 хэш файла
    const fileBuffer = fs.readFileSync(file.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Сохраняем информацию о файле в БД
    const result = await pool.query(
      `INSERT INTO document_files (
        document_id, file_name, file_path, file_size, mime_type, hash_sha256, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        documentId,
        file.originalname,
        file.path,
        file.size,
        file.mimetype,
        hash,
        (req as any).user?.username || 'system'
      ]
    );

    logger.info('File uploaded successfully', { documentId, fileId: result.rows[0].id, fileName: result.rows[0].file_name });

    // Добавляем запись в историю документа
    const user = req.user;
    try {
      await documentsRepo.addDocumentHistory(
        documentId,
        `Загружен файл: ${file.originalname}`,
        user?.id || user?.username || 'system',
        user?.username || 'Система',
        undefined, // версия не указана для файлов
        { 
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileId: result.rows[0].id
        }
      );
    } catch (historyError) {
      // Логируем ошибку, но не прерываем загрузку файла
      logger.warn('Failed to add file upload to history', { documentId, error: historyError });
    }

    res.status(201).json({
      data: {
        id: result.rows[0].id,
        name: result.rows[0].file_name,
        size: result.rows[0].file_size,
        mimeType: result.rows[0].mime_type,
        uploadedAt: result.rows[0].uploaded_at,
        hash: result.rows[0].hash_sha256
      }
    });
  } catch (error: any) {
    logger.error('Error uploading file', { documentId, errorMessage: error?.message, errorStack: error?.stack });
    // Удаляем файл при ошибке
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        logger.warn('Failed to delete file after error', { path: req.file.path });
      }
    }
    next(error);
  }
}

// Получение списка файлов документа
export async function getDocumentFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const documentId = getParam(req, 'documentId');

    const result = await pool.query(
      `SELECT id, file_name, file_size, mime_type, uploaded_at, uploaded_by, hash_sha256
       FROM document_files
       WHERE document_id = $1
       ORDER BY uploaded_at DESC`,
      [documentId]
    );

    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        name: row.file_name,
        size: row.file_size,
        mimeType: row.mime_type,
        uploadedAt: row.uploaded_at,
        uploadedBy: row.uploaded_by,
        hash: row.hash_sha256
      }))
    });
  } catch (error) {
    next(error);
  }
}

// Скачивание файла
export async function downloadFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { fileId } = req.params;

    const result = await pool.query(
      'SELECT file_path, file_name, mime_type FROM document_files WHERE id = $1',
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const file = result.rows[0];
    const filePath = path.resolve(file.file_path);

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: { message: 'Файл не найден на диске' } });
    }

    // Отправляем файл
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
}

// Удаление файла
export async function deleteFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { fileId } = req.params;

    // Получаем информацию о файле
    const result = await pool.query(
      'SELECT file_path FROM document_files WHERE id = $1',
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const filePath = result.rows[0].file_path;

    // Удаляем из БД
    await pool.query('DELETE FROM document_files WHERE id = $1', [fileId]);

    // Удаляем файл с диска
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn('Failed to delete file from disk:', filePath);
    }

    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
}
