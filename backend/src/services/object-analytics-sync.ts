/**
 * Синхронизация аналитик (attrs) карточек объектов из справочников НСИ.
 * Поддерживаются: Номенклатура, Контрагенты, Организации, Договоры, Счета, Склады, План счетов.
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

type NsiTable =
  | 'nomenclature'
  | 'counterparties'
  | 'organizations'
  | 'contracts'
  | 'accounts'
  | 'warehouses'
  | 'accounting_accounts';

/** Код типа объекта -> таблица НСИ и способ сопоставления (по code или по id). Для ORG: сначала id, затем code. */
const OBJECT_TYPE_NSI: Record<string, { table: NsiTable; matchBy: 'code' | 'id' | 'id_or_code' }> = {
  ITEM: { table: 'nomenclature', matchBy: 'code' },
  NOMENCLATURE: { table: 'nomenclature', matchBy: 'code' },
  COUNTERPARTY: { table: 'counterparties', matchBy: 'id' },
  ORG: { table: 'organizations', matchBy: 'id_or_code' },
  CONTRACT: { table: 'contracts', matchBy: 'id' },
  BANK_ACCOUNT: { table: 'accounts', matchBy: 'id' },
  WAREHOUSE: { table: 'warehouses', matchBy: 'id' },
  ACCOUNTING_ACCOUNT: { table: 'accounting_accounts', matchBy: 'id_or_code' }
};

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

function buildAttrsFromOrganization(
  row: { id: string; code: string; name: string; inn: string | null },
  schemaKeys: Set<string>
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  if (schemaKeys.has('code')) attrs.code = row.code ?? row.id;
  if (schemaKeys.has('name')) attrs.name = row.name ?? '';
  if (schemaKeys.has('inn')) attrs.inn = row.inn ?? '';
  return attrs;
}

function buildAttrsFromContract(
  row: { id: string; name: string; organization_id: string | null; counterparty_id: string | null; data: Record<string, unknown> | null },
  schemaKeys: Set<string>
): Record<string, unknown> {
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const attrs: Record<string, unknown> = {};
  if (schemaKeys.has('number')) attrs.number = (data.number as string) ?? (data.code as string) ?? '';
  if (schemaKeys.has('date')) attrs.date = (data.date as string) ?? null;
  if (schemaKeys.has('name')) attrs.name = row.name;
  if (schemaKeys.has('counterpartyId')) attrs.counterpartyId = row.counterparty_id ?? null;
  if (schemaKeys.has('organizationId')) attrs.organizationId = row.organization_id ?? null;
  if (schemaKeys.has('contractType')) attrs.contractType = (data.contractType as string) ?? (data.type as string) ?? null;
  if (schemaKeys.has('currency')) attrs.currency = (data.currency as string) ?? null;
  if (schemaKeys.has('paymentTerms')) attrs.paymentTerms = (data.paymentTerms as string) ?? '';
  if (schemaKeys.has('validFrom')) attrs.validFrom = (data.validFrom as string) ?? null;
  if (schemaKeys.has('validTo')) attrs.validTo = (data.validTo as string) ?? null;
  if (schemaKeys.has('vatIncluded')) attrs.vatIncluded = (data.vatIncluded as boolean) ?? false;
  return attrs;
}

function buildAttrsFromAccount(
  row: { id: string; code: string | null; name: string; organization_id: string | null; type: string | null; data: Record<string, unknown> | null },
  schemaKeys: Set<string>
): Record<string, unknown> {
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const attrs: Record<string, unknown> = {};
  if (schemaKeys.has('code')) attrs.code = row.code ?? row.id;
  if (schemaKeys.has('name')) attrs.name = row.name;
  if (schemaKeys.has('organizationId')) attrs.organizationId = row.organization_id ?? null;
  if (schemaKeys.has('currency')) attrs.currency = (data.currency as string) ?? 'RUB';
  if (schemaKeys.has('accountType')) attrs.accountType = (data.accountType as string) ?? (row.type as string) ?? null;
  if (schemaKeys.has('isActive')) attrs.isActive = (data.isActive as boolean) ?? true;
  return attrs;
}

function buildAttrsFromWarehouse(
  row: { id: string; code: string | null; name: string; organization_id: string | null; data: Record<string, unknown> | null },
  schemaKeys: Set<string>
): Record<string, unknown> {
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const attrs: Record<string, unknown> = {};
  if (schemaKeys.has('code')) attrs.code = row.code ?? row.id;
  if (schemaKeys.has('name')) attrs.name = row.name;
  if (schemaKeys.has('organizationId')) attrs.organizationId = row.organization_id ?? null;
  if (schemaKeys.has('description')) attrs.description = (data.description as string) ?? '';
  return attrs;
}

function buildAttrsFromAccountingAccount(
  row: { id: string; code: string | null; name: string; data: Record<string, unknown> | null },
  schemaKeys: Set<string>
): Record<string, unknown> {
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const attrs: Record<string, unknown> = {};
  if (schemaKeys.has('code')) attrs.code = row.code ?? row.id;
  if (schemaKeys.has('name')) attrs.name = row.name;
  if (schemaKeys.has('description')) attrs.description = (data.description as string) ?? '';
  return attrs;
}

async function fetchNsiRow(
  table: NsiTable,
  matchKey: string
): Promise<Record<string, unknown> | null> {
  const key = matchKey.trim();
  if (!key) return null;

  if (table === 'nomenclature') {
    const r = await pool.query(`SELECT id, code, name, data FROM nomenclature WHERE code = $1 LIMIT 1`, [key]);
    return r.rows[0] ?? null;
  }
  if (table === 'counterparties') {
    const r = await pool.query(`SELECT id, name, inn, data FROM counterparties WHERE id = $1 LIMIT 1`, [key]);
    return r.rows[0] ?? null;
  }
  if (table === 'organizations') {
    let r = await pool.query(`SELECT id, code, name, inn FROM organizations WHERE id = $1 LIMIT 1`, [key]);
    if (r.rows.length === 0) {
      r = await pool.query(`SELECT id, code, name, inn FROM organizations WHERE code = $1 LIMIT 1`, [key]);
    }
    return r.rows[0] ?? null;
  }
  if (table === 'contracts') {
    const r = await pool.query(
      `SELECT id, name, organization_id, counterparty_id, data FROM contracts WHERE id = $1 LIMIT 1`,
      [key]
    );
    return r.rows[0] ?? null;
  }
  if (table === 'accounts') {
    const r = await pool.query(
      `SELECT id, code, name, organization_id, type, data FROM accounts WHERE id = $1 LIMIT 1`,
      [key]
    );
    return r.rows[0] ?? null;
  }
  if (table === 'warehouses') {
    const r = await pool.query(
      `SELECT id, code, name, organization_id, data FROM warehouses WHERE id = $1 LIMIT 1`,
      [key]
    );
    return r.rows[0] ?? null;
  }
  if (table === 'accounting_accounts') {
    let r = await pool.query(`SELECT id, code, name, data FROM accounting_accounts WHERE id = $1 LIMIT 1`, [key]);
    if (r.rows.length === 0) {
      r = await pool.query(`SELECT id, code, name, data FROM accounting_accounts WHERE code = $1 LIMIT 1`, [key]);
    }
    return r.rows[0] ?? null;
  }
  return null;
}

function buildAttrsFromNsiRow(table: NsiTable, row: Record<string, unknown>, schemaKeys: Set<string>): Record<string, unknown> {
  switch (table) {
    case 'nomenclature':
      return buildAttrsFromNomenclature(
        {
          id: row.id as string,
          code: (row.code as string) ?? null,
          name: row.name as string,
          data: (row.data as Record<string, unknown>) ?? null
        },
        schemaKeys
      );
    case 'counterparties':
      return buildAttrsFromCounterparty(
        {
          id: row.id as string,
          name: row.name as string,
          inn: (row.inn as string) ?? null,
          data: (row.data as Record<string, unknown>) ?? null
        },
        schemaKeys
      );
    case 'organizations':
      return buildAttrsFromOrganization(
        {
          id: row.id as string,
          code: row.code as string,
          name: row.name as string,
          inn: (row.inn as string) ?? null
        },
        schemaKeys
      );
    case 'contracts':
      return buildAttrsFromContract(
        {
          id: row.id as string,
          name: row.name as string,
          organization_id: (row.organization_id as string) ?? null,
          counterparty_id: (row.counterparty_id as string) ?? null,
          data: (row.data as Record<string, unknown>) ?? null
        },
        schemaKeys
      );
    case 'accounts':
      return buildAttrsFromAccount(
        {
          id: row.id as string,
          code: (row.code as string) ?? null,
          name: row.name as string,
          organization_id: (row.organization_id as string) ?? null,
          type: (row.type as string) ?? null,
          data: (row.data as Record<string, unknown>) ?? null
        },
        schemaKeys
      );
    case 'warehouses':
      return buildAttrsFromWarehouse(
        {
          id: row.id as string,
          code: (row.code as string) ?? null,
          name: row.name as string,
          organization_id: (row.organization_id as string) ?? null,
          data: (row.data as Record<string, unknown>) ?? null
        },
        schemaKeys
      );
    case 'accounting_accounts':
      return buildAttrsFromAccountingAccount(
        {
          id: row.id as string,
          code: (row.code as string) ?? null,
          name: row.name as string,
          data: (row.data as Record<string, unknown>) ?? null
        },
        schemaKeys
      );
    default:
      return {};
  }
}

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

    // Шаг 1. Для типов, связанных со справочниками НСИ,
    // создаём недостающие карточки объектов из соответствующих таблиц НСИ,
    // чтобы список объектов был полным для всех организаций.
    try {
      switch (config.table) {
        case 'nomenclature': {
          const seedRes = await pool.query(
            `
            INSERT INTO object_cards (type_id, code, name, status, attrs)
            SELECT $1 AS type_id,
                   n.code::varchar(150) AS code,
                   n.name::varchar(500) AS name,
                   'Active'::varchar(50) AS status,
                   '{}'::jsonb AS attrs
            FROM nomenclature n
            LEFT JOIN object_cards c
              ON c.type_id = $1
             AND c.code = n.code
            WHERE c.id IS NULL
            `,
            [typeRow.id]
          );
          const created = seedRes.rowCount ?? 0;
          if (created > 0) {
            logger.info('Seeded object_cards from NSI nomenclature', {
              objectTypeCode,
              created
            });
          }
          break;
        }
        case 'counterparties': {
          const seedRes = await pool.query(
            `
            INSERT INTO object_cards (type_id, code, name, status, attrs)
            SELECT $1 AS type_id,
                   cp.id::varchar(150) AS code,
                   cp.name::varchar(500) AS name,
                   'Active'::varchar(50) AS status,
                   '{}'::jsonb AS attrs
            FROM counterparties cp
            LEFT JOIN object_cards c
              ON c.type_id = $1
             AND c.code = cp.id::varchar(150)
            WHERE c.id IS NULL
            `,
            [typeRow.id]
          );
          const created = seedRes.rowCount ?? 0;
          if (created > 0) {
            logger.info('Seeded object_cards from NSI counterparties', {
              objectTypeCode,
              created
            });
          }
          break;
        }
        case 'organizations': {
          const seedRes = await pool.query(
            `
            INSERT INTO object_cards (type_id, code, name, status, attrs)
            SELECT $1 AS type_id,
                   o.code::varchar(150) AS code,
                   o.name::varchar(500) AS name,
                   'Active'::varchar(50) AS status,
                   '{}'::jsonb AS attrs
            FROM organizations o
            LEFT JOIN object_cards c
              ON c.type_id = $1
             AND c.code = o.code::varchar(150)
            WHERE c.id IS NULL
            `,
            [typeRow.id]
          );
          const created = seedRes.rowCount ?? 0;
          if (created > 0) {
            logger.info('Seeded object_cards from NSI organizations', {
              objectTypeCode,
              created
            });
          }
          break;
        }
        case 'contracts': {
          const seedRes = await pool.query(
            `
            INSERT INTO object_cards (type_id, code, name, status, attrs, organization_id)
            SELECT $1 AS type_id,
                   ct.id::varchar(150) AS code,
                   ct.name::varchar(500) AS name,
                   'Active'::varchar(50) AS status,
                   '{}'::jsonb AS attrs,
                   ct.organization_id
            FROM contracts ct
            LEFT JOIN object_cards c
              ON c.type_id = $1
             AND c.code = ct.id::varchar(150)
            WHERE c.id IS NULL
            `,
            [typeRow.id]
          );
          const created = seedRes.rowCount ?? 0;
          if (created > 0) {
            logger.info('Seeded object_cards from NSI contracts', {
              objectTypeCode,
              created
            });
          }
          break;
        }
        case 'accounts': {
          const seedRes = await pool.query(
            `
            INSERT INTO object_cards (type_id, code, name, status, attrs, organization_id)
            SELECT $1 AS type_id,
                   a.id::varchar(150) AS code,
                   a.name::varchar(500) AS name,
                   'Active'::varchar(50) AS status,
                   '{}'::jsonb AS attrs,
                   a.organization_id
            FROM accounts a
            LEFT JOIN object_cards c
              ON c.type_id = $1
             AND c.code = a.id::varchar(150)
            WHERE c.id IS NULL
            `,
            [typeRow.id]
          );
          const created = seedRes.rowCount ?? 0;
          if (created > 0) {
            logger.info('Seeded object_cards from NSI accounts', {
              objectTypeCode,
              created
            });
          }
          break;
        }
        case 'warehouses': {
          const seedRes = await pool.query(
            `
            INSERT INTO object_cards (type_id, code, name, status, attrs, organization_id)
            SELECT $1 AS type_id,
                   w.id::varchar(150) AS code,
                   w.name::varchar(500) AS name,
                   'Active'::varchar(50) AS status,
                   '{}'::jsonb AS attrs,
                   w.organization_id
            FROM warehouses w
            LEFT JOIN object_cards c
              ON c.type_id = $1
             AND c.code = w.id::varchar(150)
            WHERE c.id IS NULL
            `,
            [typeRow.id]
          );
          const created = seedRes.rowCount ?? 0;
          if (created > 0) {
            logger.info('Seeded object_cards from NSI warehouses', {
              objectTypeCode,
              created
            });
          }
          break;
        }
        case 'accounting_accounts': {
          const seedRes = await pool.query(
            `
            INSERT INTO object_cards (type_id, code, name, status, attrs)
            SELECT $1 AS type_id,
                   aa.code::varchar(150) AS code,
                   aa.name::varchar(500) AS name,
                   'Active'::varchar(50) AS status,
                   '{}'::jsonb AS attrs
            FROM accounting_accounts aa
            LEFT JOIN object_cards c
              ON c.type_id = $1
             AND c.code = aa.code::varchar(150)
            WHERE c.id IS NULL
            `,
            [typeRow.id]
          );
          const created = seedRes.rowCount ?? 0;
          if (created > 0) {
            logger.info('Seeded object_cards from NSI accounting_accounts', {
              objectTypeCode,
              created
            });
          }
          break;
        }
        default:
          break;
      }
    } catch (err: any) {
      result.success = false;
      result.errors.push({
        cardId: '',
        code: objectTypeCode,
        message: `Seed from NSI failed: ${err?.message ?? String(err)}`
      });
      logger.warn('Seed object_cards from NSI failed', {
        objectTypeCode,
        err: err?.message
      });
    }

    // Для синхронизации NSI используем базовую (общую) схему без привязки к организации
    const schemas = await objectsRepo.getObjectTypeSchemas(typeRow.id, null);
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
        const nsiRow = await fetchNsiRow(config.table, matchKey);
        if (!nsiRow) {
          result.notFound += 1;
          continue;
        }

        const attrs = buildAttrsFromNsiRow(config.table, nsiRow, schemaKeys);
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
