// Контроллер для работы с файлами

import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Загрузка файла к документу
export async function uploadFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { documentId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }

    // Проверяем существование документа
    const docResult = await pool.query('SELECT id FROM documents WHERE id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      // Удаляем загруженный файл, если документ не найден
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: { message: 'Document not found' } });
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
    // Удаляем файл при ошибке
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Игнорируем ошибки удаления
      }
    }
    next(error);
  }
}

// Получение списка файлов документа
export async function getDocumentFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const { documentId } = req.params;

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
      return res.status(404).json({ error: { message: 'File not found on disk' } });
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
