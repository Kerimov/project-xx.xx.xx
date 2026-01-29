import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const anyErr = err as any;
  const code = anyErr?.code as string | undefined;

  // Логируем “как есть”, но дополнительно показываем код (pg/сеть) если он есть
  console.error('Error:', err);
  if (code) console.error('Error code:', code);

  let statusCode: number = anyErr?.statusCode || 500;
  let message: string = err.message || 'Internal Server Error';

  // Преобразуем типовые ошибки БД в более понятные ответы
  if (!anyErr?.statusCode) {
    if (code === '28P01') {
      statusCode = 503;
      message = 'Database authentication failed. Check DB_USER/DB_PASSWORD.';
    } else if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      statusCode = 503;
      message = 'Database connection failed. Check DB_HOST/DB_PORT and that Postgres is running.';
    } else if (code === '42P01') {
      statusCode = 500;
      message = 'Database schema is missing. Apply migrations to the database.';
    }
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}
