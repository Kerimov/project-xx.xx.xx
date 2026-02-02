/**
 * Формирование payload для отправки документа в 1С:УХ.
 * Использует конфиг по видам документов и подставляет значения из НСИ (склад, организация).
 */

import { pool } from '../db/connection.js';
import { getUHDocumentConfig } from '../config/uh-document-types.js';
import { logger } from '../utils/logger.js';

export interface DocumentRow {
  id: string;
  type: string;
  number: string;
  date: Date;
  organization_id: string;
  organization_name: string | null;
  counterparty_name: string | null;
  counterparty_inn: string | null;
  amount: number | null;
  currency: string | null;
  current_version?: number;
}

export interface VersionDataRow {
  data: Record<string, unknown>;
}

/** Элемент табличной части для 1С (единый формат: nomenclatureName, quantity, unit, price, totalAmount, vatPercent) */
export interface UHPayloadItem {
  nomenclatureName?: string;
  serviceName?: string;
  quantity: number;
  unit: string;
  price: number;
  amount?: number;
  totalAmount: number;
  vatPercent?: number;
  vatAmount?: number;
  rowNumber?: number;
  /** Счёт учёта (план счетов 1С) — ID для поиска в 1С */
  accountId?: string;
  /** Счёт НДС (план счетов 1С) — ID для поиска в 1С */
  vatAccountId?: string;
  [key: string]: unknown;
}

/** Payload для POST /documents (совместим с обработкой 1С) */
export interface UHPayload {
  portalDocId: string;
  portalVersion: number;
  idempotencyKey: string;
  type: string;
  number: string;
  date: string;
  sourceCompany: string;
  counterpartyName?: string;
  counterpartyInn?: string;
  amount: number;
  totalAmount: number;
  currency: string;
  items?: UHPayloadItem[];
  warehouseName?: string;
  warehouseCode?: string;
  accountName?: string;
  accountCode?: string;
  /** Аналитика «Договор» — наименование для 1С */
  contractName?: string;
  /** Признак УПД (универсальный передаточный документ) */
  isUPD?: boolean;
  /** Общая сумма НДС */
  totalVAT?: number;
  totalVatAmount?: number;
  /** Ставка НДС на уровне документа */
  vatPercent?: number;
  vatAmount?: number;
  /** Номер и дата счёта-фактуры */
  invoiceNumber?: string;
  invoiceDate?: string;
  /** Оригинал получен */
  originalReceived?: boolean;
  /** Требуется счёт-фактура */
  invoiceRequired?: boolean;
  [key: string]: unknown;
}

/**
 * Нормализация строки табличной части: 1С ожидает nomenclatureName (или serviceName в ряде документов),
 * quantity, unit, price, totalAmount, vatPercent.
 */
function normalizeItem(row: Record<string, unknown>, _config: { itemRequiredFields?: string[] }): UHPayloadItem {
  const nomenclatureName = (row.nomenclatureName ?? row.serviceName ?? row.service ?? '') as string;
  const quantity = Number(row.quantity ?? row.amount ?? 0);
  const unit = (row.unit ?? 'шт') as string;
  const price = Number(row.price ?? 0);
  const amount = row.amount != null ? Number(row.amount) : undefined;
  const totalAmount = Number(row.totalAmount ?? row.amount ?? price * quantity);
  const vatPercent = row.vatPercent != null ? Number(row.vatPercent) : undefined;
  const vatAmount = row.vatAmount != null ? Number(row.vatAmount) : undefined;
  const rowNumber = row.rowNumber != null ? Number(row.rowNumber) : undefined;
  // Счёт учёта (план счетов 1С) — передаём ID для поиска в 1С
  const accountId = row.accountId as string | undefined;
  // Счёт НДС (план счетов 1С) — передаём ID для поиска в 1С
  const vatAccountId = row.vatAccountId as string | undefined;

  const result: UHPayloadItem = {
    nomenclatureName: nomenclatureName || (row.serviceName as string) || (row.service as string) || undefined,
    serviceName: (row.serviceName ?? row.service) as string | undefined,
    quantity,
    unit,
    price,
    totalAmount,
    rowNumber
  };
  if (amount !== undefined) result.amount = amount;
  if (vatPercent !== undefined) result.vatPercent = vatPercent;
  if (vatAmount !== undefined) result.vatAmount = vatAmount;
  if (accountId) result.accountId = accountId;
  if (vatAccountId) result.vatAccountId = vatAccountId;
  if (!result.nomenclatureName && result.serviceName) result.nomenclatureName = result.serviceName;
  return result;
}

/**
 * Получить название договора по ID из НСИ портала (аналитика «Договор»).
 */
async function getContractName(contractId: string | null): Promise<string | null> {
  if (!contractId) return null;
  const res = await pool.query('SELECT name FROM contracts WHERE id = $1', [contractId]);
  if (res.rows.length === 0) return null;
  return res.rows[0].name ?? null;
}

/**
 * Получить название и код склада по ID из НСИ портала (аналитика «Склад»).
 */
async function getWarehouseNames(warehouseId: string | null): Promise<{ name: string | null; code: string | null }> {
  if (!warehouseId) return { name: null, code: null };
  const res = await pool.query(
    'SELECT name, code FROM warehouses WHERE id = $1',
    [warehouseId]
  );
  if (res.rows.length === 0) return { name: null, code: null };
  return { name: res.rows[0].name ?? null, code: res.rows[0].code ?? null };
}

/**
 * Получить название и код счёта по ID из НСИ портала.
 */
async function getAccountNames(accountId: string | null): Promise<{ name: string | null; code: string | null }> {
  if (!accountId) return { name: null, code: null };
  const res = await pool.query(
    'SELECT name, code FROM accounts WHERE id = $1',
    [accountId]
  );
  if (res.rows.length === 0) return { name: null, code: null };
  return { name: res.rows[0].name ?? null, code: res.rows[0].code ?? null };
}

/**
 * Собрать payload для отправки в 1С:УХ.
 * - Подставляет sourceCompany из документа (organization_name).
 * - Для документов со складом: подставляет warehouseName/warehouseCode из НСИ по warehouseId.
 * - Для банковских: подставляет accountName/accountCode по accountId.
 * - Нормализует items под формат 1С (nomenclatureName, quantity, unit, price, totalAmount, vatPercent).
 */
export async function buildUHPayload(
  document: DocumentRow,
  versionData: Record<string, unknown>
): Promise<UHPayload> {
  const config = getUHDocumentConfig(document.type);
  const dateStr = document.date instanceof Date
    ? document.date.toISOString().split('T')[0]
    : String(document.date).slice(0, 10);
  const totalAmount = Number(
    versionData.totalAmount ?? versionData.amount ?? document.amount ?? 0
  );
  const currency = (document.currency ?? versionData.currency ?? 'RUB') as string;

  const warehouseId = (versionData.warehouseId ?? versionData.warehouse) as string | undefined;
  const accountId = (versionData.accountId ?? versionData.paymentAccountId) as string | undefined;
  const contractId = (versionData.contractId ?? versionData.contract) as string | undefined;

  const [contractName, warehouse, account] = await Promise.all([
    getContractName(contractId ?? null),
    getWarehouseNames(warehouseId ?? null),
    getAccountNames(accountId ?? null)
  ]);

  const payload: UHPayload = {
    portalDocId: document.id,
    portalVersion: document.current_version ?? 1,
    idempotencyKey: `${document.id}-v${document.current_version ?? 1}-${Date.now()}`,
    type: document.type,
    number: document.number,
    date: dateStr,
    sourceCompany: document.organization_name ?? '',
    amount: totalAmount,
    totalAmount,
    currency
  };

  if (document.counterparty_name) payload.counterpartyName = document.counterparty_name;
  if (document.counterparty_inn) payload.counterpartyInn = document.counterparty_inn;
  if (contractId) payload.contractId = contractId;
  if (contractName) payload.contractName = contractName;
  if (warehouseId) payload.warehouseId = warehouseId;
  if (warehouse.name) payload.warehouseName = warehouse.name;
  if (warehouse.code) payload.warehouseCode = warehouse.code;
  if (accountId) payload.accountId = accountId;
  if (account.name) payload.accountName = account.name;
  if (account.code) payload.accountCode = account.code;

  // Копируем опциональные поля из versionData, не перезатирая уже выставленные
  const optionalTopLevel = [
    'contractId', 'departmentId', 'dueDate', 'vatOnTop', 'vatIncluded', 'purpose', 'receiptOperationType',
    'servicePeriod', 'serviceStartDate', 'serviceEndDate',
    'warehouseIdFrom', 'warehouseNameFrom', 'warehouseIdTo', 'warehouseNameTo',
    // УПД и НДС
    'isUPD', 'totalVAT', 'totalVatAmount', 'vatPercent', 'vatAmount',
    // Номер и дата счёта-фактуры
    'invoiceNumber', 'invoiceDate',
    // Прочие реквизиты
    'originalReceived', 'invoiceReceived', 'invoiceRequired'
  ];
  for (const key of optionalTopLevel) {
    if (versionData[key] !== undefined && payload[key] === undefined) {
      payload[key] = versionData[key];
    }
  }

  // Явно пробрасываем isUPD как булево значение
  if (versionData.isUPD !== undefined) {
    payload.isUPD = Boolean(versionData.isUPD);
  }

  // Пробрасываем общую сумму НДС
  if (versionData.totalVAT !== undefined) {
    payload.totalVAT = Number(versionData.totalVAT);
  }
  if (versionData.totalVatAmount !== undefined) {
    payload.totalVatAmount = Number(versionData.totalVatAmount);
  }

  // Совместимость: пробросить вид операции под альтернативными ключами
  const receiptOperationType = (payload.receiptOperationType ?? versionData.receiptOperationType) as string | undefined;
  if (typeof receiptOperationType === 'string' && receiptOperationType.trim()) {
    if (payload.receiptOperationType === undefined) payload.receiptOperationType = receiptOperationType;
    if (payload.operationType === undefined) payload.operationType = receiptOperationType;
    if (payload.receiptOperation === undefined) payload.receiptOperation = receiptOperationType;
  }

  // Табличная часть
  const rawItems = (versionData.items ?? versionData.goods ?? []) as Record<string, unknown>[];
  if (Array.isArray(rawItems) && rawItems.length > 0 && config?.hasItems) {
    payload.items = rawItems.map((row, idx) =>
      normalizeItem({ ...row, rowNumber: row.rowNumber ?? idx + 1 }, config)
    );
  } else if (config?.hasItems) {
    payload.items = [];
  }

  // Логируем payload для отладки
  logger.info('UH Payload built', {
    docId: document.id,
    type: document.type,
    isUPD: payload.isUPD,
    originalReceived: payload.originalReceived,
    invoiceReceived: payload.invoiceReceived,
    totalVAT: payload.totalVAT,
    itemsCount: payload.items?.length || 0,
    firstItem: payload.items?.[0] ? {
      vatPercent: payload.items[0].vatPercent,
      vatAmount: payload.items[0].vatAmount,
      accountId: payload.items[0].accountId
    } : null
  });

  return payload;
}
