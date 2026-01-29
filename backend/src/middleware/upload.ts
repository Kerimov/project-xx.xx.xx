// Middleware для загрузки файлов через multer

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Создаем директорию для загрузки файлов, если её нет
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Конфигурация хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Создаем подпапку по дате для организации файлов
    const dateFolder = new Date().toISOString().split('T')[0];
    const fullPath = path.join(uploadDir, dateFolder);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла: hash_originalname.ext
    const hash = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${hash}_${safeName}${ext}`);
  }
});

// Фильтр типов файлов
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Разрешенные типы файлов
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: PDF, images, Excel, Word`));
  }
};

// Настройка multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB по умолчанию
    files: parseInt(process.env.MAX_FILES_PER_REQUEST || '10') // максимум 10 файлов за раз
  }
});

// Middleware для загрузки одного файла
export const uploadSingle = upload.single('file');

// Middleware для загрузки нескольких файлов
export const uploadMultiple = upload.array('files', 10);
