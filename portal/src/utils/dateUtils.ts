import dayjs from 'dayjs';

/**
 * Безопасный парсинг даты без учета часового пояса
 * Используется для парсинга дат в формате YYYY-MM-DD из API
 * чтобы избежать проблем со сдвигом на день из-за часовых поясов
 */
export function parseDateSafe(dateStr: string | null | undefined): dayjs.Dayjs | undefined {
  if (!dateStr) return undefined;
  
  // Если дата в формате YYYY-MM-DD, парсим её как локальную дату без времени
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return dayjs().year(year).month(month - 1).date(day).hour(0).minute(0).second(0).millisecond(0);
  }
  
  // Для других форматов используем стандартный парсинг
  return dayjs(dateStr);
}
