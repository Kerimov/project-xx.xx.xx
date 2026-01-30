// Сервис синхронизации НСИ из 1С УХ

import { pool } from '../db/connection.js';
import { uhIntegrationService } from './uh-integration.js';
import { logger } from '../utils/logger.js';

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
   * Синхронизация НСИ из УХ
   */
  async syncNSI() {
    if (this.syncing === false) {
      return;
    }

    try {
      // Получаем последнюю версию синхронизации
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

      // Запрашиваем дельту НСИ из УХ
      const delta = await uhIntegrationService.getNSIDelta({
        version: sinceVersion
      });

      if (delta.items.length === 0) {
        logger.info('NSI is up to date');
        return;
      }

      logger.info('Received NSI items from UH', { count: delta.items.length });

      // Обрабатываем элементы НСИ
      let synced = 0;
      for (const item of delta.items) {
        try {
          await this.processNSIItem(item);
          synced++;
        } catch (error: any) {
          logger.error(`Failed to sync NSI item`, error, { itemId: item.id, itemType: item.type });
        }
      }

      // Сохраняем версию синхронизации
      await pool.query(
        `INSERT INTO nsi_sync_state (version, items_synced, synced_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (version) DO UPDATE
         SET items_synced = $2, synced_at = NOW()`,
        [delta.version, synced]
      );

      this.lastSyncVersion = delta.version;

      logger.info('NSI sync completed', { synced, total: delta.items.length, version: delta.version });
    } catch (error: any) {
      logger.error('NSI sync failed', error);
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
      case 'Account':
        await this.syncAccount(item);
        break;
      default:
        logger.warn('Unknown NSI item type', { itemType: item.type, itemId: item.id });
    }
  }

  /**
   * Синхронизация контрагента
   */
  private async syncCounterparty(item: any) {
    const inn = item.data?.inn || null;
    const name = item.name || item.data?.name || '';

    if (!name) {
      throw new Error('Counterparty name is required');
    }

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
    const name = item.name || item.data?.name || '';
    const inn = item.data?.inn || null;

    if (!name) {
      throw new Error('Organization name is required');
    }

    await pool.query(
      `INSERT INTO organizations (id, code, name, inn)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET code = $2, name = $3, inn = $4, updated_at = NOW()`,
      [item.id, code, name, inn]
    );
  }

  /**
   * Синхронизация договора
   */
  private async syncContract(item: any) {
    const name = item.name || item.data?.name || '';
    const organizationId = item.data?.organizationId || null;
    const counterpartyId = item.data?.counterpartyId || null;

    if (!name) {
      throw new Error('Contract name is required');
    }

    await pool.query(
      `INSERT INTO contracts (id, name, organization_id, counterparty_id, data)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
       SET name = $2, organization_id = $3, counterparty_id = $4, data = $5, updated_at = NOW()`,
      [item.id, name, organizationId, counterpartyId, JSON.stringify(item.data)]
    );
  }

  /**
   * Синхронизация склада
   */
  private async syncWarehouse(item: any) {
    const code = item.code || item.data?.code || null;
    const name = item.name || item.data?.name || '';
    const organizationId = item.data?.organizationId || null;

    if (!name) {
      throw new Error('Warehouse name is required');
    }

    await pool.query(
      `INSERT INTO warehouses (id, code, name, organization_id, data)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
       SET code = COALESCE(EXCLUDED.code, warehouses.code), name = EXCLUDED.name, organization_id = EXCLUDED.organization_id, data = EXCLUDED.data, updated_at = NOW()`,
      [item.id, code, name, organizationId, JSON.stringify(item.data ?? {})]
    );
  }

  /**
   * Синхронизация счёта (банк/касса)
   */
  private async syncAccount(item: any) {
    const code = item.code || item.data?.code || null;
    const name = item.name || item.data?.name || '';
    const organizationId = item.data?.organizationId || null;
    const type = item.data?.type || null;

    if (!name) {
      throw new Error('Account name is required');
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
   * Ручной запуск синхронизации
   */
  async manualSync() {
    logger.info('Manual NSI sync triggered');
    await this.syncNSI();
  }
}

export const nsiSyncService = new NSISyncService();
