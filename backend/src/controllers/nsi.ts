// Контроллер для работы с НСИ (справочниками)

import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection.js';

// Получение списка организаций
export async function getOrganizations(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query;
    
    let query = 'SELECT id, code, name, inn FROM organizations WHERE 1=1';
    const params: any[] = [];
    
    if (search) {
      query += ' AND (name ILIKE $1 OR code ILIKE $1 OR inn ILIKE $1)';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY name LIMIT 100';
    
    const result = await pool.query(query, params);
    
    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name ?? 'Без наименования',
        inn: row.inn
      }))
    });
  } catch (error) {
    next(error);
  }
}

// Получение организации по ID
export async function getOrganizationById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT id, code, name, inn FROM organizations WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const org = result.rows[0];
    
    // Получаем связанные данные
    const [contractsResult, accountsResult, warehousesResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM contracts WHERE organization_id = $1', [id]),
      pool.query('SELECT COUNT(*) as count FROM accounts WHERE organization_id = $1', [id]),
      pool.query('SELECT COUNT(*) as count FROM warehouses WHERE organization_id = $1', [id])
    ]);
    
    res.json({
      data: {
        id: org.id,
        code: org.code,
        name: org.name ?? 'Без наименования',
        inn: org.inn,
        contractsCount: parseInt(contractsResult.rows[0].count),
        accountsCount: parseInt(accountsResult.rows[0].count),
        warehousesCount: parseInt(warehousesResult.rows[0].count)
      }
    });
  } catch (error) {
    next(error);
  }
}

// Получение списка контрагентов (из НСИ или локальной таблицы)
export async function getCounterparties(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, inn } = req.query;
    
    let query = `
      SELECT id, name, inn, data
      FROM counterparties
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (name ILIKE $${paramIndex++} OR inn ILIKE $${paramIndex - 1})`;
      params.push(`%${search}%`);
    }
    
    if (inn) {
      query += ` AND inn = $${paramIndex++}`;
      params.push(inn);
    }
    
    query += ' ORDER BY name LIMIT 100';
    
    const result = await pool.query(query, params);
    
    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        inn: row.inn,
        data: row.data
      }))
    });
  } catch (error) {
    next(error);
  }
}

// Получение контрагента по ID
export async function getCounterpartyById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT id, name, inn, data FROM counterparties WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Counterparty not found' });
    }
    
    const cp = result.rows[0];
    
    // Получаем количество договоров
    const contractsResult = await pool.query(
      'SELECT COUNT(*) as count FROM contracts WHERE counterparty_id = $1',
      [id]
    );
    
    res.json({
      data: {
        id: cp.id,
        name: cp.name,
        inn: cp.inn,
        data: cp.data,
        contractsCount: parseInt(contractsResult.rows[0].count)
      }
    });
  } catch (error) {
    next(error);
  }
}

// Получение списка договоров
export async function getContracts(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, counterpartyId, counterpartyName } = req.query;
    
    let query = `
      SELECT c.id, c.name, c.organization_id, c.counterparty_id, c.data,
             o.name as organization_name,
             cp.name as counterparty_name
      FROM contracts c
      LEFT JOIN organizations o ON c.organization_id = o.id
      LEFT JOIN counterparties cp ON c.counterparty_id = cp.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    // Договоры с данной организацией или без организации (organization_id IS NULL после синхронизации из 1С)
    if (organizationId) {
      query += ` AND (c.organization_id = $${paramIndex} OR c.organization_id IS NULL)`;
      params.push(organizationId);
      paramIndex++;
    }
    
    if (counterpartyId) {
      query += ` AND c.counterparty_id = $${paramIndex++}`;
      params.push(counterpartyId);
    }
    
    if (counterpartyName) {
      query += ` AND cp.name ILIKE $${paramIndex++}`;
      params.push(`%${counterpartyName}%`);
    }
    
    query += ' ORDER BY c.name LIMIT 100';
    
    const result = await pool.query(query, params);
    
    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        counterpartyId: row.counterparty_id,
        counterpartyName: row.counterparty_name,
        data: row.data
      }))
    });
  } catch (error) {
    next(error);
  }
}

// Получение договора по ID
export async function getContractById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT c.id, c.name, c.organization_id, c.counterparty_id, c.data,
             o.name as organization_name,
             cp.name as counterparty_name
      FROM contracts c
      LEFT JOIN organizations o ON c.organization_id = o.id
      LEFT JOIN counterparties cp ON c.counterparty_id = cp.id
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    const contract = result.rows[0];
    
    res.json({
      data: {
        id: contract.id,
        name: contract.name,
        organizationId: contract.organization_id,
        organizationName: contract.organization_name,
        counterpartyId: contract.counterparty_id,
        counterpartyName: contract.counterparty_name,
        data: contract.data
      }
    });
  } catch (error) {
    next(error);
  }
}

// Получение списка счетов
export async function getAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, type, search } = req.query;
    
    let query = `
      SELECT a.id, a.code, a.name, a.organization_id, a.type, a.data,
             o.name as organization_name
      FROM accounts a
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (organizationId) {
      query += ` AND a.organization_id = $${paramIndex++}`;
      params.push(organizationId);
    }
    
    if (type) {
      query += ` AND a.type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (search) {
      query += ` AND (a.name ILIKE $${paramIndex++} OR a.code ILIKE $${paramIndex - 1})`;
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY a.name LIMIT 100';
    
    const result = await pool.query(query, params);
    
    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        type: row.type,
        data: row.data
      }))
    });
  } catch (error) {
    next(error);
  }
}

// Получение счета по ID
export async function getAccountById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT a.id, a.code, a.name, a.organization_id, a.type, a.data,
             o.name as organization_name
      FROM accounts a
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const account = result.rows[0];
    
    res.json({
      data: {
        id: account.id,
        code: account.code,
        name: account.name,
        organizationId: account.organization_id,
        organizationName: account.organization_name,
        type: account.type,
        data: account.data
      }
    });
  } catch (error) {
    next(error);
  }
}

// Получение списка складов
export async function getWarehouses(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, search } = req.query;
    
    let query = `
      SELECT w.id, w.code, w.name, w.organization_id, w.data,
             o.name as organization_name
      FROM warehouses w
      LEFT JOIN organizations o ON w.organization_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (organizationId) {
      query += ` AND w.organization_id = $${paramIndex++}`;
      params.push(organizationId);
    }
    
    if (search) {
      query += ` AND (w.name ILIKE $${paramIndex++} OR w.code ILIKE $${paramIndex - 1})`;
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY w.name LIMIT 100';
    
    const result = await pool.query(query, params);
    
    // Логируем для диагностики
    console.log(`📦 Warehouses query: found ${result.rows.length} warehouses`);
    
    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        data: row.data
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching warehouses:', error);
    next(error);
  }
}

// Получение склада по ID
export async function getWarehouseById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT w.id, w.code, w.name, w.organization_id, w.data,
             o.name as organization_name
      FROM warehouses w
      LEFT JOIN organizations o ON w.organization_id = o.id
      WHERE w.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const warehouse = result.rows[0];

    res.json({
      data: {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        organizationId: warehouse.organization_id,
        organizationName: warehouse.organization_name,
        data: warehouse.data
      }
    });
  } catch (error) {
    next(error);
  }
}

// Получение списка счетов учета (план счетов из 1С УХ)
export async function getAccountingAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query;

    let query = `
      SELECT id, code, name, data
      FROM accounting_accounts
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramIndex++} OR code ILIKE $${paramIndex - 1})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY code NULLS LAST, name LIMIT 200';

    const result = await pool.query(query, params);

    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        data: row.data
      }))
    });
  } catch (error) {
    next(error);
  }
}

// Получение счёта учета по ID
export async function getAccountingAccountById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, code, name, data FROM accounting_accounts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Accounting account not found' });
    }

    const row = result.rows[0];

    res.json({
      data: {
        id: row.id,
        code: row.code,
        name: row.name,
        data: row.data
      }
    });
  } catch (error) {
    next(error);
  }
}
