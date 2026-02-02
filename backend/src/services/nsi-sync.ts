// Сервис синхронизации НСИ из 1С УХ

import { pool } from '../db/connection.js';
import { uhIntegrationService } from './uh-integration.js';
import { logger } from '../utils/logger.js';

export interface NSISyncError {
  type: string;
  id: string;
  name?: string;
  message: string;
}

export interface NSISyncResult {
  success: boolean;
  synced: number;
  total: number;
  failed: number;
  errors: NSISyncError[];
  version?: number;
  message?: string;
}

export class NSISyncService {
  private syncing = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastSyncVersion: number = 0;

  /**
   * Запуск периодической синхронизации НСИ
   */
  startSync(intervalMs: number = 60000) {
    if (this.syncing) {
      return;
    }

    this.syncing = true;
    logger.info('NSI sync service started');

    // Синхронизируем сразу при старте
    this.syncNSI();

    // Затем синхронизируем периодически
    this.intervalId = setInterval(() => {
      this.syncNSI();
    }, intervalMs);
  }

  /**
   * Остановка синхронизации
   */
  stopSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.syncing = false;
    logger.info('NSI sync service stopped');
  }

  /**
   * Синхронизация НСИ из УХ. Возвращает результат с количеством успешных/ошибочных и списком ошибок.
   */
  async syncNSI(): Promise<NSISyncResult> {
    const emptyResult: NSISyncResult = { success: true, synced: 0, total: 0, failed: 0, errors: [] };

    if (this.syncing === false) {
      return emptyResult;
    }

    try {
      const versionResult = await pool.query(
        'SELECT version FROM nsi_sync_state ORDER BY synced_at DESC LIMIT 1'
      );

      let sinceVersion = 0;
      if (versionResult.rows.length > 0) {
        sinceVersion = versionResult.rows[0].version || 0;
      } else if (this.lastSyncVersion > 0) {
        sinceVersion = this.lastSyncVersion;
      }

      logger.info('Syncing NSI from UH', { version: sinceVersion });

      const delta = await uhIntegrationService.getNSIDelta({
        version: sinceVersion
      });

      // Дополняем общую дельту складами из отдельного сервиса /nsi/warehouses (иерархия, корректная выгрузка)
      try {
        const warehousesResp = await uhIntegrationService.getNSIWarehouses({ version: sinceVersion });
        if (warehousesResp?.items?.length) {
          const existingIds = new Set(delta.items.map((i: any) => i.id));
          let added = 0;
          for (const item of warehousesResp.items) {
            if (item.type === 'Warehouse' && item.id && !existingIds.has(item.id)) {
              delta.items.push(item);
              existingIds.add(item.id);
              added++;
            }
          }
          if (added > 0) {
            logger.info('Merged warehouses from /nsi/warehouses into NSI delta', { added });
          }
        }
      } catch (whErr: any) {
        logger.warn('Could not merge /nsi/warehouses into delta, using delta only', { message: whErr?.message });
      }

      if (delta.items.length === 0) {
        logger.info('NSI is up to date');
        return { ...emptyResult, message: 'НСИ актуальна' };
      }

      logger.info('Received NSI items from UH', { count: delta.items.length });

      // Порядок обработки по зависимостям: Organization → Counterparty → Contract, Warehouse, Nomenclature, Account, AccountingAccount
      const order: string[] = ['Organization', 'Counterparty', 'Contract', 'Warehouse', 'Nomenclature', 'Account', 'AccountingAccount'];
      const byType = new Map<string, typeof delta.items>();
      for (const t of order) byType.set(t, []);
      for (const item of delta.items) {
        const list = byType.get(item.type);
        if (list) list.push(item);
      }
      
      // Логируем количество элементов по типам для диагностики
      const typeCounts: Record<string, number> = {};
      for (const t of order) {
        typeCounts[t] = byType.get(t)?.length || 0;
      }
      logger.info('NSI items by type', typeCounts);
      
      const orderedItems: typeof delta.items = [];
      for (const t of order) orderedItems.push(...(byType.get(t) ?? []));

      let synced = 0;
      const errors: NSISyncError[] = [];

      for (const item of orderedItems) {
        try {
          await this.processNSIItem(item);
          synced++;
        } catch (error: any) {
          const msg = error?.message || String(error);
          logger.error(`Failed to sync NSI item`, error, { itemId: item.id, itemType: item.type });
          errors.push({
            type: item.type || 'Unknown',
            id: item.id || '',
            name: item.name || item.data?.name,
            message: msg
          });
        }
      }

      await pool.query(
        `INSERT INTO nsi_sync_state (version, items_synced, synced_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (version) DO UPDATE
         SET items_synced = $2, synced_at = NOW()`,
        [delta.version, synced]
      );

      this.lastSyncVersion = delta.version;

      const result: NSISyncResult = {
        success: errors.length === 0,
        synced,
        total: delta.items.length,
        failed: errors.length,
        errors,
        version: delta.version
      };

      logger.info('NSI sync completed', result);
      return result;
    } catch (error: any) {
      const msg = error?.message || String(error);
      logger.error('NSI sync failed', error);
      return {
        success: false,
        synced: 0,
        total: 0,
        failed: 0,
        errors: [{ type: 'System', id: '', message: msg }],
        message: msg
      };
    }
  }

  /**
   * Синхронизация только складов НСИ из УХ (отдельный сервис).
   * Не обновляет nsi_sync_state, чтобы не ломать общую версионность НСИ.
   */
  async syncWarehousesOnly(): Promise<NSISyncResult> {
    const emptyResult: NSISyncResult = { success: true, synced: 0, total: 0, failed: 0, errors: [] };

    try {
      logger.info('Syncing NSI warehouses from UH (separate service)');

      const delta = await uhIntegrationService.getNSIWarehouses();
      const items = (delta.items || []).filter(item => item.type === 'Warehouse');

      if (items.length === 0) {
        logger.info('NSI warehouses are up to date or empty');
        return { ...emptyResult, message: 'Склады не изменились' };
      }

      logger.info('Received NSI warehouses from UH', { count: items.length });

      let synced = 0;
      const errors: NSISyncError[] = [];

      for (const item of items) {
        try {
          await this.syncWarehouse(item);
          synced++;
        } catch (error: any) {
          const msg = error?.message || String(error);
          logger.error(`Failed to sync warehouse`, error, { itemId: item.id, itemType: item.type });
          errors.push({
            type: item.type || 'Warehouse',
            id: item.id || '',
            name: item.name || item.data?.name,
            message: msg
          });
        }
      }

      const result: NSISyncResult = {
        success: errors.length === 0,
        synced,
        total: items.length,
        failed: errors.length,
        errors,
        version: delta.version
      };

      logger.info('NSI warehouses sync completed', result);
      return result;
    } catch (error: any) {
      const msg = error?.message || String(error);
      logger.error('NSI warehouses sync failed', error);
      return {
        success: false,
        synced: 0,
        total: 0,
        failed: 0,
        errors: [{ type: 'System', id: '', message: msg }],
        message: msg
      };
    }
  }

  /**
   * Обработка одного элемента НСИ
   */
  private async processNSIItem(item: any) {
    switch (item.type) {
      case 'Counterparty':
        await this.syncCounterparty(item);
        break;
      case 'Organization':
        await this.syncOrganization(item);
        break;
      case 'Contract':
        await this.syncContract(item);
        break;
      case 'Warehouse':
        await this.syncWarehouse(item);
        break;
      case 'Nomenclature':
        await this.syncNomenclature(item);
        break;
      case 'Account':
        await this.syncAccount(item);
        break;
      case 'AccountingAccount':
        await this.syncAccountingAccount(item);
        break;
      default:
        logger.warn('Unknown NSI item type', { itemType: item.type, itemId: item.id });
    }
  }

  /** Fallback для пустого наименования (чтобы не ломать FK у договоров/счетов) */
  private fallbackName(item: any): string {
    const raw = (item.name || item.data?.name || item.code || item.id || 'Без наименования').toString().trim();
    return raw || 'Без наименования';
  }

  /**
   * Синхронизация контрагента
   */
  private async syncCounterparty(item: any) {
    const inn = item.data?.inn || null;
    const name = this.fallbackName(item);

    // Проверяем существование контрагента
    const existing = await pool.query(
      'SELECT id FROM counterparties WHERE id = $1 OR (inn = $2 AND inn IS NOT NULL)',
      [item.id, inn]
    );

    if (existing.rows.length > 0) {
      // Обновляем существующего контрагента
      await pool.query(
        `UPDATE counterparties 
         SET name = $1, inn = $2, data = $3, updated_at = NOW()
         WHERE id = $4`,
        [name, inn, JSON.stringify(item.data), existing.rows[0].id]
      );
    } else {
      // Создаем нового контрагента
      await pool.query(
        `INSERT INTO counterparties (id, name, inn, data)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE
         SET name = $2, inn = $3, data = $4, updated_at = NOW()`,
        [item.id, name, inn, JSON.stringify(item.data)]
      );
    }
  }

  /**
   * Синхронизация организации
   */
  private async syncOrganization(item: any) {
    const code = item.code || item.data?.code || '';
    const name = (this.fallbackName(item) || 'Организация без наименования').trim();
    const inn = item.data?.inn || null;

    await pool.query(
      `INSERT INTO organizations (id, code, name, inn)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET code = $2, name = $3, inn = $4, updated_at = NOW()`,
      [item.id, code, name, inn]
    );
  }

  /**
   * Создать контрагента-заглушку, если в 1С он не пришёл в delta (договор ссылается на него).
   */
  private async ensureCounterpartyExists(id: string) {
    const existing = await pool.query('SELECT id FROM counterparties WHERE id = $1', [id]);
    if (existing.rows.length > 0) return;
    const stubName = `Контрагент ${id.substring(0, 8)}…`;
    await pool.query(
      `INSERT INTO counterparties (id, name, inn, data) VALUES ($1, $2, NULL, '{}')
       ON CONFLICT (id) DO NOTHING`,
      [id, stubName]
    );
  }

  /**
   * Создать организацию-заглушку, если в 1С она не пришла в delta (счёт ссылается на неё).
   */
  private async ensureOrganizationExists(id: string) {
    const existing = await pool.query('SELECT id FROM organizations WHERE id = $1', [id]);
    if (existing.rows.length > 0) return;
    const stubName = `Организация ${id.substring(0, 8)}…`;
    // code в organizations UNIQUE NOT NULL — используем id как уникальный код для заглушки
    const stubCode = `stub-${id}`.substring(0, 50);
    await pool.query(
      `INSERT INTO organizations (id, code, name, inn) VALUES ($1, $2, $3, NULL)
       ON CONFLICT (id) DO NOTHING`,
      [id, stubCode, stubName]
    );
  }

  /**
   * Синхронизация договора. При отсутствии контрагента в портале создаётся заглушка.
   */
  private async syncContract(item: any) {
    const name = this.fallbackName(item);
    const organizationId = item.data?.organizationId || null;
    const counterpartyId = item.data?.counterpartyId || null;
    const dataToStore = {
      ...(item.data && typeof item.data === 'object' ? item.data : {}),
      code: item.code ?? item.data?.code ?? null,
    };

    if (counterpartyId) {
      await this.ensureCounterpartyExists(counterpartyId);
    }

    await pool.query(
      `INSERT INTO contracts (id, name, organization_id, counterparty_id, data)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
       SET name = $2, organization_id = $3, counterparty_id = $4, data = $5, updated_at = NOW()`,
      [item.id, name, organizationId, counterpartyId, JSON.stringify(dataToStore)]
    );
  }

  /**
   * Синхронизация склада. При отсутствии организации в портале создаётся заглушка.
   */
  private async syncWarehouse(item: any) {
    const code = item.code || item.data?.code || null;
    const name = this.fallbackName(item);
    const organizationId = item.data?.organizationId || null;

    if (organizationId) {
      await this.ensureOrganizationExists(organizationId);
    }

    logger.debug('Syncing warehouse', { id: item.id, name, code, organizationId });

    await pool.query(
      `INSERT INTO warehouses (id, code, name, organization_id, data)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
       SET code = COALESCE(EXCLUDED.code, warehouses.code), name = EXCLUDED.name, organization_id = EXCLUDED.organization_id, data = EXCLUDED.data, updated_at = NOW()`,
      [item.id, code, name, organizationId, JSON.stringify(item.data ?? {})]
    );
  }

  /**
   * Синхронизация номенклатуры
   */
  private async syncNomenclature(item: any) {
    const code = item.code || item.data?.code || null;
    const name = this.fallbackName(item);

    await pool.query(
      `INSERT INTO nomenclature (id, code, name, data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET code = COALESCE(EXCLUDED.code, nomenclature.code), name = EXCLUDED.name, data = EXCLUDED.data, updated_at = NOW()`,
      [item.id, code, name, JSON.stringify(item.data ?? {})]
    );
  }

  /**
   * Синхронизация счёта (банк/касса). При отсутствии организации в портале создаётся заглушка.
   */
  private async syncAccount(item: any) {
    const code = item.code || item.data?.code || null;
    const name = this.fallbackName(item);
    const organizationId = item.data?.organizationId || null;
    const type = item.data?.type || null;

    if (organizationId) {
      await this.ensureOrganizationExists(organizationId);
    }

    await pool.query(
      `INSERT INTO accounts (id, code, name, organization_id, type, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET code = COALESCE(EXCLUDED.code, accounts.code), name = EXCLUDED.name, organization_id = EXCLUDED.organization_id, type = COALESCE(EXCLUDED.type, accounts.type), data = EXCLUDED.data, updated_at = NOW()`,
      [item.id, code, name, organizationId, type, JSON.stringify(item.data ?? {})]
    );
  }

  /**
   * Синхронизация счёта учета (план счетов из 1С УХ).
   */
  private async syncAccountingAccount(item: any) {
    const code = item.code ?? item.data?.code ?? null;
    const name = this.fallbackName(item);

    await pool.query(
      `INSERT INTO accounting_accounts (id, code, name, data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET code = COALESCE(EXCLUDED.code, accounting_accounts.code), name = EXCLUDED.name, data = EXCLUDED.data, updated_at = NOW()`,
      [item.id, code, name, JSON.stringify(item.data ?? {})]
    );
  }

  /**
   * Удалить только искусственные склады (созданные через seedWarehouses).
   * Искусственные склады имеют названия вида "Основной склад (...)", "Склад материалов (...)", "Торговый склад (...)".
   */
  async clearSeededWarehouses(): Promise<{ cleared: number }> {
    const result = await pool.query(`
      DELETE FROM warehouses
      WHERE name LIKE 'Основной склад (%'
         OR name LIKE 'Склад материалов (%'
         OR name LIKE 'Торговый склад (%'
    `);
    const cleared = result.rowCount ?? 0;
    logger.info('Seeded warehouses cleared', { cleared });
    return { cleared };
  }

  /**
   * Полная очистка данных портала: очередь УХ, документы (и связанные версии/файлы/проверки/история),
   * пакеты, НСИ (договоры, счета, склады, счета учёта, контрагенты), организации (кроме привязанных к пользователям).
   * Пользователи не удаляются.
   */
  async clearPortalData(): Promise<{
    queue: number;
    documents: number;
    packages: number;
    nsi: { contracts: number; accounts: number; warehouses: number; accountingAccounts: number; counterparties: number; organizations: number };
    keptOrganizations: number;
  }> {
    const client = await pool.connect();
    try {
      const rQueue = await client.query('DELETE FROM uh_integration_queue');
      const rDocs = await client.query('DELETE FROM documents');
      const rPackages = await client.query('DELETE FROM packages');

      const rContracts = await client.query('DELETE FROM contracts');
      const rAccounts = await client.query('DELETE FROM accounts');
      const rWarehouses = await client.query('DELETE FROM warehouses');
      const rNomenclature = await client.query('DELETE FROM nomenclature');
      const rAccountingAccounts = await client.query('DELETE FROM accounting_accounts');
      const rCounterparties = await client.query('DELETE FROM counterparties');
      const rOrgBefore = await client.query('SELECT COUNT(*) AS c FROM organizations');
      await client.query(`
        DELETE FROM organizations
        WHERE id NOT IN (SELECT organization_id FROM users WHERE organization_id IS NOT NULL)
      `);
      const rOrgAfter = await client.query('SELECT COUNT(*) AS c FROM organizations');
      await client.query('DELETE FROM nsi_sync_state');
      this.lastSyncVersion = 0;

      const result = {
        queue: rQueue.rowCount ?? 0,
        documents: rDocs.rowCount ?? 0,
        packages: rPackages.rowCount ?? 0,
        nsi: {
          contracts: rContracts.rowCount ?? 0,
          accounts: rAccounts.rowCount ?? 0,
          warehouses: rWarehouses.rowCount ?? 0,
          nomenclature: rNomenclature.rowCount ?? 0,
          accountingAccounts: rAccountingAccounts.rowCount ?? 0,
          counterparties: rCounterparties.rowCount ?? 0,
          organizations: (rOrgBefore.rows[0]?.c ?? 0) - (rOrgAfter.rows[0]?.c ?? 0)
        },
        keptOrganizations: parseInt(String(rOrgAfter.rows[0]?.c ?? 0), 10)
      };
      logger.info('Portal data cleared', result);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Очистка синхронизированных данных НСИ. Удаляются договоры, счета, склады, контрагенты,
   * организации (кроме тех, на которые ссылаются документы/пакеты/пользователи), состояние синхронизации.
   * После вызова следующая синхронизация запросит данные с version 0 (полная выгрузка).
   */
  async clearNSIData(): Promise<{ cleared: { contracts: number; accounts: number; warehouses: number; accountingAccounts: number; counterparties: number; organizations: number }; keptOrganizations: number }> {
    const client = await pool.connect();
    try {
      const rContracts = await client.query('DELETE FROM contracts');
      const rAccounts = await client.query('DELETE FROM accounts');
      const rWarehouses = await client.query('DELETE FROM warehouses');
      const rNomenclature = await client.query('DELETE FROM nomenclature');
      const rAccountingAccounts = await client.query('DELETE FROM accounting_accounts');
      const rCounterparties = await client.query('DELETE FROM counterparties');
      const rOrgBefore = await client.query('SELECT COUNT(*) AS c FROM organizations');
      await client.query(`
        DELETE FROM organizations
        WHERE id NOT IN (
          SELECT organization_id FROM documents WHERE organization_id IS NOT NULL
          UNION
          SELECT organization_id FROM packages WHERE organization_id IS NOT NULL
          UNION
          SELECT organization_id FROM users WHERE organization_id IS NOT NULL
        )
      `);
      const rOrgAfter = await client.query('SELECT COUNT(*) AS c FROM organizations');
      await client.query('DELETE FROM nsi_sync_state');
      this.lastSyncVersion = 0;

      const cleared = {
        contracts: rContracts.rowCount ?? 0,
        accounts: rAccounts.rowCount ?? 0,
        warehouses: rWarehouses.rowCount ?? 0,
        nomenclature: rNomenclature.rowCount ?? 0,
        accountingAccounts: rAccountingAccounts.rowCount ?? 0,
        counterparties: rCounterparties.rowCount ?? 0,
        organizations: (rOrgBefore.rows[0]?.c ?? 0) - (rOrgAfter.rows[0]?.c ?? 0)
      };
      const keptOrganizations = parseInt(String(rOrgAfter.rows[0]?.c ?? 0), 10);
      logger.info('NSI data cleared', { cleared, keptOrganizations });
      return { cleared, keptOrganizations };
    } finally {
      client.release();
    }
  }

  /**
   * Создать склады для организаций, у которых ещё нет ни одного склада (если 1С не вернула склады в НСИ).
   * Возвращает количество добавленных складов.
   */
  async seedWarehouses(): Promise<{ added: number }> {
    const r1 = await pool.query(`
      INSERT INTO warehouses (id, code, name, organization_id, data)
      SELECT gen_random_uuid(), o.code || '-WH-01', 'Основной склад (' || o.name || ')', o.id, '{}'
      FROM organizations o
      WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.organization_id = o.id)
    `);
    const r2 = await pool.query(`
      INSERT INTO warehouses (id, code, name, organization_id, data)
      SELECT gen_random_uuid(), o.code || '-WH-02', 'Склад материалов (' || o.name || ')', o.id, '{}'
      FROM organizations o
      WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.organization_id = o.id AND w.code = o.code || '-WH-02')
    `);
    const r3 = await pool.query(`
      INSERT INTO warehouses (id, code, name, organization_id, data)
      SELECT gen_random_uuid(), o.code || '-WH-03', 'Торговый склад (' || o.name || ')', o.id, '{}'
      FROM organizations o
      WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.organization_id = o.id AND w.code = o.code || '-WH-03')
    `);
    const added = (r1.rowCount ?? 0) + (r2.rowCount ?? 0) + (r3.rowCount ?? 0);
    logger.info('Warehouses seeded for organizations', { added });
    return { added };
  }

  /**
   * Ручной запуск синхронизации. Возвращает результат с ошибками для вывода в UI.
   * Всегда выполняет синхронизацию (не зависит от флага syncing).
   */
  async manualSync(): Promise<NSISyncResult> {
    logger.info('Manual NSI sync triggered');
    const wasSyncing = this.syncing;
    this.syncing = true;
    try {
      return await this.syncNSI();
    } finally {
      if (!wasSyncing) {
        this.syncing = false;
      }
    }
  }

  /**
   * Ручной запуск синхронизации только складов.
   */
  async manualSyncWarehouses(): Promise<NSISyncResult> {
    logger.info('Manual NSI warehouses sync triggered');
    return await this.syncWarehousesOnly();
  }
}

export const nsiSyncService = new NSISyncService();
