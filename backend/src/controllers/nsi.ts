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
        name: row.name,
        inn: row.inn
      }))
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
    
    if (organizationId) {
      query += ` AND c.organization_id = $${paramIndex++}`;
      params.push(organizationId);
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
    next(error);
  }
}
