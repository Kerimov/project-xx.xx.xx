/**
 * Формирование payload для отправки документа в 1С:УХ.
 * Использует конфиг по видам документов и подставляет значения из НСИ (склад, организация).
 */

import { pool } from '../db/connection.js';
import { getUHDocumentConfig } from '../config/uh-document-types.js';

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
  if (!result.nomenclatureName && result.serviceName) result.nomenclatureName = result.serviceName;
  return result;
}

/**
 * Получить название и код склада по ID из НСИ портала.
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

  const [warehouse, account] = await Promise.all([
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
  if (warehouse.name) payload.warehouseName = warehouse.name;
  if (warehouse.code) payload.warehouseCode = warehouse.code;
  if (account.name) payload.accountName = account.name;
  if (account.code) payload.accountCode = account.code;

  // Копируем опциональные поля из versionData, не перезатирая уже выставленные
  const optionalTopLevel = [
    'contractId', 'dueDate', 'vatOnTop', 'vatIncluded', 'purpose',
    'servicePeriod', 'serviceStartDate', 'serviceEndDate',
    'warehouseIdFrom', 'warehouseNameFrom', 'warehouseIdTo', 'warehouseNameTo'
  ];
  for (const key of optionalTopLevel) {
    if (versionData[key] !== undefined && payload[key] === undefined) {
      payload[key] = versionData[key];
    }
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

  return payload;
}
