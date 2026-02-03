/**
 * Синхронизация аналитик (attrs) карточек объектов из справочников НСИ.
 * Для типов ITEM/NOMENCLATURE — номенклатура (по code), для COUNTERPARTY — контрагенты (по id в code).
 */

import { pool } from '../db/connection.js';
import * as objectsRepo from '../repositories/objects.js';
import { logger } from '../utils/logger.js';

export interface ObjectAnalyticsSyncResult {
  success: boolean;
  processed: number;
  updated: number;
  skipped: number;
  notFound: number;
  errors: Array<{ cardId: string; code: string; message: string }>;
}

/** Код типа объекта -> таблица НСИ и способ сопоставления (по code или по id) */
const OBJECT_TYPE_NSI: Record<
  string,
  { table: 'nomenclature' | 'counterparties'; matchBy: 'code' | 'id' }
> = {
  ITEM: { table: 'nomenclature', matchBy: 'code' },
  NOMENCLATURE: { table: 'nomenclature', matchBy: 'code' },
  COUNTERPARTY: { table: 'counterparties', matchBy: 'id' }
};

/**
 * Строит attrs для карточки типа ITEM/NOMENCLATURE из строки номенклатуры.
 * Только ключи, которые есть в схеме типа.
 */
function buildAttrsFromNomenclature(
  row: { id: string; code: string | null; name: string; data: Record<string, unknown> | null },
  schemaKeys: Set<string>
): Record<string, unknown> {
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const attrs: Record<string, unknown> = {};
  if (schemaKeys.has('code')) attrs.code = row.code ?? row.id;
  if (schemaKeys.has('name')) attrs.name = row.name;
  if (schemaKeys.has('description')) attrs.description = (data.description as string) ?? '';
  if (schemaKeys.has('itemKind')) {
    const kind = (data.nomenclatureType ?? data.itemKind ?? data.kind) as string | undefined;
    attrs.itemKind = kind ?? null;
  }
  if (schemaKeys.has('uomId')) attrs.uomId = (data.unit as string) ?? (data.uomId as string) ?? null;
  if (schemaKeys.has('itemGroupId')) attrs.itemGroupId = (data.itemGroupId as string) ?? (data.groupId as string) ?? null;
  return attrs;
}

/**
 * Строит attrs для карточки типа COUNTERPARTY из строки контрагента.
 */
function buildAttrsFromCounterparty(
  row: { id: string; name: string; inn: string | null; data: Record<string, unknown> | null },
  schemaKeys: Set<string>
): Record<string, unknown> {
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const attrs: Record<string, unknown> = {};
  if (schemaKeys.has('code')) attrs.code = row.id;
  if (schemaKeys.has('name')) attrs.name = row.name;
  if (schemaKeys.has('inn')) attrs.inn = row.inn ?? '';
  if (schemaKeys.has('kpp')) attrs.kpp = (data.kpp as string) ?? '';
  if (schemaKeys.has('ogrn')) attrs.ogrn = (data.ogrn as string) ?? (data.ogrnIp as string) ?? '';
  if (schemaKeys.has('counterpartyType')) attrs.counterpartyType = (data.counterpartyType as string) ?? (data.type as string) ?? null;
  if (schemaKeys.has('legalAddress')) attrs.legalAddress = (data.legalAddress ?? data.address) ?? null;
  if (schemaKeys.has('actualAddress')) attrs.actualAddress = (data.actualAddress as unknown) ?? null;
  if (schemaKeys.has('contacts')) attrs.contacts = (data.contacts as unknown) ?? null;
  if (schemaKeys.has('defaultContractId')) attrs.defaultContractId = (data.defaultContractId as string) ?? '';
  return attrs;
}

/**
 * Запуск синхронизации аналитик объектов из НСИ.
 * Для каждого типа с маппингом (ITEM, NOMENCLATURE, COUNTERPARTY) обходит карточки этого типа,
 * находит запись в НСИ по code или id, заполняет attrs и обновляет карточку.
 */
export async function syncObjectAnalyticsFromNSI(): Promise<ObjectAnalyticsSyncResult> {
  const result: ObjectAnalyticsSyncResult = {
    success: true,
    processed: 0,
    updated: 0,
    skipped: 0,
    notFound: 0,
    errors: []
  };

  for (const [objectTypeCode, config] of Object.entries(OBJECT_TYPE_NSI)) {
    const typeRow = await objectsRepo.getObjectTypeByCode(objectTypeCode);
    if (!typeRow) {
      logger.debug('Object type not found, skip', { objectTypeCode });
      continue;
    }

    const schemas = await objectsRepo.getObjectTypeSchemas(typeRow.id);
    const schemaKeys = new Set(schemas.map((s) => s.field_key));

    const { rows: cards } = await objectsRepo.listObjectCards({
      typeId: typeRow.id,
      limit: 50000
    });

    for (const card of cards) {
      result.processed += 1;
      const matchKey = card.code;
      if (!matchKey?.trim()) {
        result.skipped += 1;
        continue;
      }

      try {
        let nsiRow: { id: string; code?: string | null; name: string; inn?: string | null; data?: Record<string, unknown> | null } | null = null;

        if (config.table === 'nomenclature') {
          const r = await pool.query(
            `SELECT id, code, name, data FROM nomenclature WHERE code = $1 LIMIT 1`,
            [matchKey.trim()]
          );
          nsiRow = r.rows[0] ?? null;
        } else if (config.table === 'counterparties') {
          const r = await pool.query(
            `SELECT id, name, inn, data FROM counterparties WHERE id = $1 LIMIT 1`,
            [matchKey.trim()]
          );
          nsiRow = r.rows[0] ?? null;
        }

        if (!nsiRow) {
          result.notFound += 1;
          continue;
        }

        let attrs: Record<string, unknown>;
        if (config.table === 'nomenclature') {
          attrs = buildAttrsFromNomenclature(
            { id: nsiRow.id, code: nsiRow.code ?? null, name: nsiRow.name, data: nsiRow.data ?? null },
            schemaKeys
          );
        } else {
          attrs = buildAttrsFromCounterparty(
            { id: nsiRow.id, name: nsiRow.name, inn: nsiRow.inn ?? null, data: nsiRow.data ?? null },
            schemaKeys
          );
        }

        const merged = { ...(card.attrs && typeof card.attrs === 'object' ? card.attrs : {}), ...attrs };
        await objectsRepo.updateObjectCard(card.id, { attrs: merged });
        result.updated += 1;
      } catch (err: any) {
        result.success = false;
        result.errors.push({
          cardId: card.id,
          code: card.code,
          message: err?.message ?? String(err)
        });
        logger.warn('Object analytics sync: card update failed', { cardId: card.id, code: card.code, err: err?.message });
      }
    }
  }

  logger.info('Object analytics sync completed', result);
  return result;
}
