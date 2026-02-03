// Контроллер для работы с файлами карточек объектов учета

import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import * as objectsRepo from '../repositories/objects.js';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Загрузка файла к карточке объекта
export async function uploadObjectCardFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { cardId } = req.params;
    const file = req.file;

    logger.info('Object card file upload attempt', { cardId, fileName: file?.originalname, fileSize: file?.size, mimeType: file?.mimetype });

    if (!file) {
      logger.warn('No file uploaded', { cardId });
      return res.status(400).json({ error: { message: 'Файл не выбран' } });
    }

    // Проверяем ошибки multer
    if ((req as any).fileValidationError) {
      logger.warn('File validation error', { cardId, error: (req as any).fileValidationError });
      return res.status(400).json({ error: { message: (req as any).fileValidationError } });
    }

    // Проверяем существование карточки
    const cardResult = await pool.query('SELECT id FROM object_cards WHERE id = $1', [cardId]);
    if (cardResult.rows.length === 0) {
      logger.warn('Object card not found', { cardId });
      // Удаляем загруженный файл, если карточка не найдена
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({ error: { message: 'Карточка объекта учета не найдена' } });
    }

    // Вычисляем SHA-256 хэш файла
    const fileBuffer = fs.readFileSync(file.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Сохраняем информацию о файле в БД
    const result = await pool.query(
      `INSERT INTO object_card_files (
        card_id, file_name, file_path, file_size, mime_type, hash_sha256, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        cardId,
        file.originalname,
        file.path,
        file.size,
        file.mimetype,
        hash,
        (req as any).user?.username || 'system'
      ]
    );

    logger.info('Object card file uploaded successfully', { cardId, fileId: result.rows[0].id, fileName: result.rows[0].file_name });

    // Добавляем запись в историю карточки
    try {
      await objectsRepo.addObjectCardHistory(
        cardId,
        'FileUploaded',
        (req as any).user?.id || null,
        null, // field_key
        null, // old_value
        { fileName: file.originalname, fileId: result.rows[0].id }, // new_value
        `Загружен файл: ${file.originalname}`
      );
    } catch (historyError) {
      logger.warn('Failed to add file upload to history', { cardId, error: historyError });
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
    logger.error('Error uploading object card file', { cardId: req.params.cardId, error: error.message, stack: error.stack });
    // Удаляем файл при ошибке
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}

// Получение списка файлов карточки объекта
export async function getObjectCardFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const { cardId } = req.params;
    const result = await pool.query(
      `SELECT id, file_name, file_size, mime_type, uploaded_at, hash_sha256, uploaded_by
       FROM object_card_files
       WHERE card_id = $1
       ORDER BY uploaded_at DESC`,
      [cardId]
    );

    res.json({
      data: result.rows.map((row) => ({
        id: row.id,
        name: row.file_name,
        size: row.file_size,
        mimeType: row.mime_type,
        uploadedAt: row.uploaded_at,
        hash: row.hash_sha256,
        uploadedBy: row.uploaded_by
      }))
    });
  } catch (error) {
    next(error);
  }
}

// Скачивание файла карточки объекта
export async function downloadObjectCardFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { fileId } = req.params;
    const result = await pool.query(
      `SELECT file_path, file_name, mime_type FROM object_card_files WHERE id = $1`,
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Файл не найден' } });
    }

    const file = result.rows[0];
    // file_path уже содержит полный путь от uploadDir
    const filePath = path.resolve(file.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: { message: 'Файл не найден на диске' } });
    }

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
}

// Удаление файла карточки объекта
export async function deleteObjectCardFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user?.id || null;

    // Получаем информацию о файле и карточке
    const fileResult = await pool.query(
      `SELECT f.*, f.card_id FROM object_card_files f WHERE f.id = $1`,
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Файл не найден' } });
    }

    const file = fileResult.rows[0];
    const filePath = path.resolve(uploadDir, file.file_path);

    // Удаляем файл из БД
    await pool.query(`DELETE FROM object_card_files WHERE id = $1`, [fileId]);

    // Удаляем файл с диска
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Добавляем запись в историю
    try {
      await objectsRepo.addObjectCardHistory(
        file.card_id,
        'FileDeleted',
        userId,
        null,
        { fileName: file.file_name, fileId }, // old_value
        null,
        `Удален файл: ${file.file_name}`
      );
    } catch (historyError) {
      logger.warn('Failed to add file deletion to history', { cardId: file.card_id, error: historyError });
    }

    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
}
