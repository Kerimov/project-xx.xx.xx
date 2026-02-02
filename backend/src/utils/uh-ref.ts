/**
 * Нормализация ссылки на документ в 1С УХ для API.
 * 1С веб-клиент использует формат: .../Документ.ПоступлениеТоваровУслуг?ref=906100155d0c870411f10074964827e1
 * В API передаём только UUID без дефисов (32 hex).
 */
export function normalizeUhDocumentRef(ref: string | null | undefined): string {
  if (ref == null || typeof ref !== 'string') return '';
  let s = ref.trim();
  if (!s) return '';
  // Если формат "Документ.ПоступлениеТоваровУслуг,UUID" — берём часть после последней запятой
  const lastComma = s.lastIndexOf(',');
  if (lastComma >= 0) {
    s = s.slice(lastComma + 1).trim();
  }
  // Убираем дефисы (1С принимает и с дефисами, и без)
  s = s.replace(/-/g, '');
  return s;
}
