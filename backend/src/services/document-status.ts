// Сервис для управления статусами документов и workflow

import { logger } from '../utils/logger.js';

export type PortalStatus = 
  | 'Draft'           // Черновик - можно редактировать
  | 'Validated'        // Проверен - можно редактировать, можно заморозить
  | 'Frozen'           // Заморожен - нельзя редактировать, отправляется в УХ
  | 'QueuedToUH'       // В очереди в УХ - нельзя редактировать
  | 'SentToUH'         // Отправлен в УХ - нельзя редактировать
  | 'AcceptedByUH'     // Принят УХ - нельзя редактировать
  | 'PostedInUH'       // Проведен в УХ - нельзя редактировать
  | 'UnpostedInUH'     // Отменено проведение в УХ (был проведён, затем отменили)
  | 'RejectedByUH'     // Отклонен УХ - можно редактировать и исправить
  | 'Cancelled';        // Отменен - нельзя редактировать

// Матрица разрешенных переходов статусов
const ALLOWED_TRANSITIONS: Record<PortalStatus, PortalStatus[]> = {
  // Разрешаем "Заморозить" прямо из черновика (по UX портала)
  Draft: ['Validated', 'Frozen', 'Cancelled'],
  Validated: ['Draft', 'Frozen', 'Cancelled'],
  Frozen: ['QueuedToUH'], // Автоматический переход
  QueuedToUH: ['SentToUH'], // Автоматический переход
  SentToUH: ['AcceptedByUH', 'PostedInUH', 'UnpostedInUH', 'RejectedByUH'], // Переходы от УХ
  AcceptedByUH: ['PostedInUH'], // Автоматический переход
  PostedInUH: ['UnpostedInUH'], // «Отменить проведение» — проверка через sync с 1С
  UnpostedInUH: ['Draft', 'Frozen', 'PostedInUH'], // Можно снова отправить в УХ после правок
  RejectedByUH: ['Draft', 'Frozen'], // Можно вернуть в черновик или сразу отправить в УХ
  Cancelled: [] // Финальный статус
};

// Статусы, в которых документ можно редактировать
const EDITABLE_STATUSES: PortalStatus[] = ['Draft', 'Validated', 'RejectedByUH', 'UnpostedInUH'];

// Статусы, в которых документ нельзя редактировать
const READ_ONLY_STATUSES: PortalStatus[] = [
  'Frozen',
  'QueuedToUH',
  'SentToUH',
  'AcceptedByUH',
  'PostedInUH',
  'Cancelled'
];

/** Русские подписи статусов для сообщений пользователю */
export const STATUS_LABELS_RU: Record<PortalStatus, string> = {
  Draft: 'Черновик',
  Validated: 'Проверен',
  Frozen: 'Заморожен',
  QueuedToUH: 'В очереди в УХ',
  SentToUH: 'Отправлен в УХ',
  AcceptedByUH: 'Принят УХ',
  PostedInUH: 'Проведен в УХ',
  UnpostedInUH: 'Отменено проведение в УХ',
  RejectedByUH: 'Отклонен УХ',
  Cancelled: 'Отменен'
};

/**
 * Проверяет, можно ли перевести документ из одного статуса в другой
 */
export function canTransition(from: PortalStatus, to: PortalStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

/**
 * Проверяет, можно ли редактировать документ в данном статусе
 */
export function isEditable(status: PortalStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/**
 * Проверяет, является ли статус финальным (нельзя изменить)
 */
export function isFinalStatus(status: PortalStatus): boolean {
  return READ_ONLY_STATUSES.includes(status) && status !== 'RejectedByUH' && status !== 'UnpostedInUH';
}

/**
 * Получает список доступных переходов для статуса
 */
export function getAvailableTransitions(status: PortalStatus): PortalStatus[] {
  return ALLOWED_TRANSITIONS[status] || [];
}

/**
 * Валидирует переход статуса и возвращает ошибку, если переход невозможен
 */
export function validateTransition(
  currentStatus: PortalStatus,
  newStatus: PortalStatus
): { valid: boolean; error?: string } {
  if (currentStatus === newStatus) {
    const label = STATUS_LABELS_RU[currentStatus] ?? currentStatus;
    return { valid: false, error: `Статус «${label}» уже установлен` };
  }

  if (!canTransition(currentStatus, newStatus)) {
    const available = getAvailableTransitions(currentStatus);
    const fromLabel = STATUS_LABELS_RU[currentStatus] ?? currentStatus;
    const toLabel = STATUS_LABELS_RU[newStatus] ?? newStatus;
    const availableLabels = available.map(s => STATUS_LABELS_RU[s] ?? s).join(', ');
    return {
      valid: false,
      error: `Невозможно перевести документ из статуса «${fromLabel}» в «${toLabel}». Доступные переходы: ${availableLabels}`
    };
  }

  return { valid: true };
}

/**
 * Переводит статус документа с валидацией
 */
export function transitionStatus(
  currentStatus: PortalStatus,
  newStatus: PortalStatus
): { success: boolean; error?: string; status?: PortalStatus } {
  const validation = validateTransition(currentStatus, newStatus);
  
  if (!validation.valid) {
    logger.warn('Invalid status transition', {
      from: currentStatus,
      to: newStatus,
      error: validation.error
    });
    return { success: false, error: validation.error };
  }

  logger.info('Status transition', {
    from: currentStatus,
    to: newStatus
  });

  return { success: true, status: newStatus };
}
