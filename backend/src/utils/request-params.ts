import { Request } from 'express';

/**
 * Безопасное получение строкового параметра из req.params
 * Express может вернуть string | string[], эта функция всегда возвращает string
 */
export function getStringParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

/**
 * Безопасное получение строкового query параметра
 */
export function getStringQuery(req: Request, paramName: string): string | undefined {
  const value = req.query[paramName];
  if (Array.isArray(value)) {
    return value[0] as string | undefined;
  }
  return value as string | undefined;
}
